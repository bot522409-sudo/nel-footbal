import * as THREE from 'three';
import {
  AimTarget,
  Difficulty,
  KickerProfile,
  ShotSkillType,
  SpinInput,
  WindState,
} from './types';

export const BALL_RADIUS = 0.11;
export const GOAL_HALF_WIDTH = 3.66;
export const GOAL_HEIGHT = 2.44;
export const POST_RADIUS = 0.06;
export const GOAL_DEPTH = 2.2;
export const GRAVITY = 9.81;

export interface BallSimState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  omega: THREE.Vector3; // rad/s spin vector
  skill?: ShotSkillType;
  flightTime?: number;
}

export interface WallCollider {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface GoalkeeperPlan {
  diveDir: number; // -1 left, 0 center, +1 right
  diveTargetX: number;
  diveTargetY: number;
  reactionDelay: number; // seconds after kick before dive starts
  reachRadius: number;
}

/**
 * Computes initial launch velocity & spin vector from player's aim, power, spin pad, kicker attributes, and shot skill.
 */
export function computeLaunchState(
  ballStart: THREE.Vector3,
  aim: AimTarget,
  power01: number,
  spin: SpinInput,
  kicker?: KickerProfile,
  skill: ShotSkillType = 'normal',
): BallSimState {
  const clampedPower = THREE.MathUtils.clamp(power01, 0.12, 1.0);
  const powerMult = kicker?.powerMult ?? 1.0;
  const curveMult = kicker?.curveMult ?? 1.0;

  // Skill velocity tuning
  const skillPowerBoost =
    skill === 'power_shot'
      ? 1.18
      : skill === 'knuckle'
      ? 1.12
      : skill === 'bicycle_volley'
      ? 1.09
      : skill === 'trivela'
      ? 1.07
      : skill === 'dip_topspin'
      ? 1.04
      : skill === 'rabona'
      ? 1.03
      : skill === 'chip_panenka'
      ? 0.68
      : 1.0;

  // Speed range: 17.5 m/s up to ~40+ m/s for Power Shot / Knuckle strikes
  const speed = THREE.MathUtils.lerp(
    skill === 'chip_panenka' ? 13.5 : 17.5,
    35.5 * powerMult * skillPowerBoost,
    clampedPower,
  );

  const dx = aim.x - ballStart.x;
  const dz = (aim.z ?? 0) - ballStart.z; // goal line at z = 0 unless targeting box cross
  const horizDist = Math.hypot(dx, dz);

  // Estimate flight time for ballistic elevation compensation
  const estFlightTime = horizDist / (speed * 0.92);
  const targetY = Math.max(0.18, aim.y);
  const gravityDrop = 0.5 * GRAVITY * estFlightTime * estFlightTime;
  // Distance-adaptive elevation compensation: standard kicks ~0.75, long passes/corners (36m+) ~0.97 so corners clear cleanly into the box
  const gravComp = THREE.MathUtils.lerp(
    0.75,
    0.97,
    THREE.MathUtils.clamp((horizDist - 24) / 14, 0, 1),
  );
  const smoothCurve =
    Math.sign(spin.curve) * Math.pow(Math.abs(spin.curve), 1.2);
  const smoothDip = Math.sign(spin.dip) * Math.pow(Math.abs(spin.dip), 1.12);

  const effectiveCurveInput =
    skill === 'curler'
      ? (Math.abs(spin.curve) > 0.15 ? smoothCurve : -0.92) * 1.18
      : skill === 'rabona'
      ? (Math.abs(spin.curve) > 0.15
          ? smoothCurve
          : kicker?.foot === 'left'
          ? 0.94
          : -0.94) * 1.22
      : skill === 'trivela'
      ? (Math.abs(spin.curve) > 0.15
          ? smoothCurve
          : kicker?.foot === 'left'
          ? -0.95
          : 0.95) * 1.26
      : skill === 'knuckle' || skill === 'power_shot'
      ? smoothCurve * 0.12
      : smoothCurve;

  const effectiveDipInput =
    skill === 'dip_topspin'
      ? Math.max(0.72, smoothDip) * 1.38
      : skill === 'bicycle_volley'
      ? Math.max(0.52, smoothDip) * 1.22
      : skill === 'power_shot'
      ? Math.max(0.28, smoothDip) * 0.9
      : skill === 'chip_panenka'
      ? -0.78
      : skill === 'trivela'
      ? Math.max(0.22, smoothDip) * 1.1
      : skill === 'knuckle'
      ? 0.2
      : smoothDip;

  const effectiveDip = effectiveDipInput * curveMult;
  const spinLiftBias =
    skill === 'chip_panenka'
      ? 1.55
      : -effectiveDip * 0.36 + Math.abs(effectiveDip) * 0.08;
  const effectiveAimY = targetY + gravityDrop * gravComp + spinLiftBias;

  const dir = new THREE.Vector3(dx, effectiveAimY - ballStart.y, dz).normalize();
  const vel = dir.multiplyScalar(speed);

  const curveRadPerSec = effectiveCurveInput * 64 * curveMult;
  const dipRadPerSec = effectiveDipInput * 44 * curveMult;

  const rightAxis = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const omega = new THREE.Vector3(0, -curveRadPerSec, 0).addScaledVector(
    rightAxis,
    -dipRadPerSec,
  );

  return {
    pos: ballStart.clone(),
    vel,
    omega,
    skill,
    flightTime: 0,
  };
}

/**
 * Advances ball physics by dt seconds (aerodynamic drag + Magnus force + Knuckleball vortex + gravity + wind).
 */
export function stepBallPhysics(
  state: BallSimState,
  wind: WindState,
  dt: number,
): void {
  const v = state.vel;
  const speed = v.length();
  if (speed < 0.001) return;

  state.flightTime = (state.flightTime ?? 0) + dt;
  const t = state.flightTime;

  // Aerodynamic drag: F_d / m = -k_d * |v| * v
  const dragCoeff = state.skill === 'power_shot' ? 0.011 : 0.0145;
  const axDrag = -dragCoeff * speed * (v.x - wind.x * 0.35);
  const ayDrag = -dragCoeff * speed * v.y;
  const azDrag = -dragCoeff * speed * (v.z - wind.z * 0.35);

  // Magnus acceleration: a_M = k_m * (omega x v)
  const magnusCoeff =
    state.skill === 'trivela' || state.skill === 'rabona'
      ? 0.0056
      : state.skill === 'curler' || state.skill === 'chip_panenka'
      ? 0.0054
      : 0.0048;
  const mx = state.omega.y * v.z - state.omega.z * v.y;
  const my = state.omega.z * v.x - state.omega.x * v.z;
  const mz = state.omega.x * v.y - state.omega.y * v.x;

  // Knuckleball erratic air-vortex wobble when spin is near-zero
  let knuckleAx = 0;
  let knuckleAy = 0;
  if (state.skill === 'knuckle' && speed > 14) {
    const wobbleAmp = Math.min(1.2, (speed - 12) * 0.06);
    knuckleAx = Math.sin(t * 23.0) * 8.4 * wobbleAmp;
    knuckleAy = (Math.cos(t * 16.5) * 4.8 - 2.6) * wobbleAmp;
  }

  // Wind drift
  const windForceX = wind.x * 0.42;
  const windForceZ = wind.z * 0.32;

  v.x += (axDrag + magnusCoeff * mx + windForceX + knuckleAx) * dt;
  v.y += (ayDrag + magnusCoeff * my - GRAVITY + knuckleAy) * dt;
  v.z += (azDrag + magnusCoeff * mz + windForceZ) * dt;

  state.pos.x += v.x * dt;
  state.pos.y += v.y * dt;
  state.pos.z += v.z * dt;

  // Spin decays gradually due to air friction
  const spinDecay = Math.exp(-0.22 * dt);
  state.omega.multiplyScalar(spinDecay);

  // Ground bounce
  if (state.pos.y < BALL_RADIUS) {
    state.pos.y = BALL_RADIUS;
    if (v.y < -0.5) {
      v.y = -v.y * 0.56;
      v.x *= 0.84;
      v.z *= 0.84;
    } else {
      v.y = 0;
      v.x *= Math.exp(-1.8 * dt);
      v.z *= Math.exp(-1.8 * dt);
    }
  }
}

/**
 * Computes a preview arc (~85% of flight toward goal) so players clearly see horizontal curve around the wall.
 */
export function computePreviewArc(
  ballStart: THREE.Vector3,
  aim: AimTarget,
  power01: number,
  spin: SpinInput,
  wind: WindState,
  kicker?: KickerProfile,
  skill: ShotSkillType = 'normal',
): THREE.Vector3[] {
  const sim = computeLaunchState(ballStart, aim, power01, spin, kicker, skill);
  const points: THREE.Vector3[] = [sim.pos.clone()];
  const stepDt = 1 / 60;
  const maxZStop = Math.min(2.2, ballStart.z * 0.14);
  const isCornerLike = Math.abs(ballStart.x) > 20 && ballStart.z < 3.5;
  const targetHoriz = Math.max(4, Math.hypot(aim.x - ballStart.x, (aim.z ?? 0) - ballStart.z));

  for (let i = 0; i < 110; i++) {
    stepBallPhysics(sim, wind, stepDt);
    points.push(sim.pos.clone());
    if (isCornerLike) {
      const traveled = Math.hypot(sim.pos.x - ballStart.x, sim.pos.z - ballStart.z);
      if (traveled >= targetHoriz * 0.92 || sim.pos.z < -2.2) break;
    } else if (sim.pos.z <= maxZStop || sim.pos.z <= 0.5) {
      break;
    }
  }
  return points;
}

export interface BallZPrediction {
  x: number;
  y: number;
  timeToArrival: number;
  reached: boolean;
}

/**
 * Simulates ball forward under aerodynamic drag, Magnus curve, and wind to predict crossing (x, y) at targetZ.
 */
export function predictBallAtZ(
  initialState: BallSimState,
  targetZ: number,
  wind: WindState,
): BallZPrediction {
  const sim: BallSimState = {
    pos: initialState.pos.clone(),
    vel: initialState.vel.clone(),
    omega: initialState.omega.clone(),
  };

  const dt = 1 / 90;
  const movingTowardNorth = targetZ < sim.pos.z;

  for (let i = 0; i < 240; i++) {
    const prevZ = sim.pos.z;
    const prevX = sim.pos.x;
    const prevY = sim.pos.y;
    stepBallPhysics(sim, wind, dt);

    const crossed = movingTowardNorth
      ? sim.pos.z <= targetZ
      : sim.pos.z >= targetZ;
    if (crossed) {
      const denom = sim.pos.z - prevZ || (movingTowardNorth ? -0.001 : 0.001);
      const t = THREE.MathUtils.clamp((targetZ - prevZ) / denom, 0, 1);
      return {
        x: THREE.MathUtils.lerp(prevX, sim.pos.x, t),
        y: THREE.MathUtils.lerp(prevY, sim.pos.y, t),
        timeToArrival: Math.max(0.04, (i + t) * dt),
        reached: true,
      };
    }
  }

  return {
    x: sim.pos.x,
    y: sim.pos.y,
    timeToArrival: 1.5,
    reached: false,
  };
}

/**
 * Computes lateral trajectory bend (in meters) at target plane z = aim.z ?? 0
 * caused by Magnus spin + wind compared to a spinless calm launch.
 */
export function computeCurveDeviationMeters(
  ballStart: THREE.Vector3,
  aim: AimTarget,
  power01: number,
  spin: SpinInput,
  wind: WindState,
  kicker?: KickerProfile,
  skill: ShotSkillType = 'normal',
): number {
  const targetZ = aim.z ?? 0;
  const curvedLaunch = computeLaunchState(
    ballStart,
    aim,
    power01,
    spin,
    kicker,
    skill,
  );
  const straightLaunch = computeLaunchState(
    ballStart,
    aim,
    power01,
    { curve: 0, dip: 0 },
    kicker,
    'normal',
  );
  const curvedHit = predictBallAtZ(curvedLaunch, targetZ, wind);
  const straightHit = predictBallAtZ(
    straightLaunch,
    targetZ,
    { x: 0, z: 0 },
  );
  return Number((curvedHit.x - straightHit.x).toFixed(2));
}

/**
 * Predicts where the ball crosses z = 0.45 so the Goalkeeper can read, sprint & dive realistically.
 */
export function planGoalkeeperDive(
  initialState: BallSimState,
  wind: WindState,
  difficulty: Difficulty,
  gkHomeX: number,
  kicker?: KickerProfile,
  gkDiveSpeedMult = 1.0,
): GoalkeeperPlan {
  const pred = predictBallAtZ(initialState, 0.45, wind);
  const arrivalX = pred.reached ? pred.x : gkHomeX;
  const arrivalY = pred.reached ? pred.y : 1.1;
  const timeToArrival = pred.timeToArrival;

  const reactionMap: Record<Difficulty, number> = {
    easy: 0.28,
    medium: 0.17,
    pro: 0.095,
    extreme: 0.05,
  };
  const errorMap: Record<Difficulty, number> = {
    easy: 0.58,
    medium: 0.26,
    pro: 0.10,
    extreme: 0.03,
  };
  const reachMap: Record<Difficulty, number> = {
    easy: 0.50,
    medium: 0.60,
    pro: 0.68,
    extreme: 0.75,
  };

  const reactionDelay =
    reactionMap[difficulty] + (kicker?.deceptionSec ?? 0) * (difficulty === 'extreme' ? 0.55 : 0.78);

  const curveDeception =
    (initialState.omega.y / 64) * errorMap[difficulty] * 0.72;
  const randomMiss = (Math.random() - 0.5) * errorMap[difficulty];

  const predictedX = THREE.MathUtils.clamp(
    arrivalX + curveDeception + randomMiss,
    -GOAL_HALF_WIDTH + 0.22,
    GOAL_HALF_WIDTH - 0.22,
  );
  const predictedY = THREE.MathUtils.clamp(arrivalY, 0.32, GOAL_HEIGHT - 0.14);

  const deltaX = predictedX - gkHomeX;
  const diveDir = Math.abs(deltaX) < 0.32 ? 0 : Math.sign(deltaX);

  const availableDiveTime = Math.max(0.1, timeToArrival - reactionDelay);
  const baseMaxSpeed =
    difficulty === 'extreme'
      ? 7.2
      : difficulty === 'pro'
      ? 6.2
      : difficulty === 'medium'
      ? 5.2
      : 4.1;
  const maxTravel = availableDiveTime * baseMaxSpeed * gkDiveSpeedMult;
  const clampedTargetX =
    gkHomeX + THREE.MathUtils.clamp(deltaX, -maxTravel, maxTravel);

  return {
    diveDir,
    diveTargetX: clampedTargetX,
    diveTargetY: predictedY,
    reactionDelay,
    reachRadius: reachMap[difficulty],
  };
}

/**
 * Checks cylindrical collision against left/right goalposts and crossbar.
 * Returns true if a collision occurred and mutates simState.vel + pos.
 */
export function resolveWoodworkCollision(sim: BallSimState): boolean {
  const combinedR = BALL_RADIUS + POST_RADIUS;
  let hit = false;

  // Left and Right vertical posts at x = +/- 3.66, z = 0, y in [0, 2.44]
  const postXs = [-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH];
  for (const px of postXs) {
    if (sim.pos.y <= GOAL_HEIGHT + BALL_RADIUS) {
      const dx = sim.pos.x - px;
      const dz = sim.pos.z - 0;
      const distSq = dx * dx + dz * dz;
      if (distSq < combinedR * combinedR && distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        sim.pos.x = px + nx * combinedR;
        sim.pos.z = nz * combinedR;
        const dot = sim.vel.x * nx + sim.vel.z * nz;
        if (dot < 0) {
          sim.vel.x -= 1.75 * dot * nx;
          sim.vel.z -= 1.75 * dot * nz;
          sim.vel.multiplyScalar(0.82);
          hit = true;
        }
      }
    }
  }

  // Crossbar at y = 2.44, z = 0, x in [-3.66, +3.66]
  if (Math.abs(sim.pos.x) <= GOAL_HALF_WIDTH + BALL_RADIUS) {
    const dy = sim.pos.y - GOAL_HEIGHT;
    const dz = sim.pos.z - 0;
    const distSq = dy * dy + dz * dz;
    if (distSq < combinedR * combinedR && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const ny = dy / dist;
      const nz = dz / dist;
      sim.pos.y = GOAL_HEIGHT + ny * combinedR;
      sim.pos.z = nz * combinedR;
      const dot = sim.vel.y * ny + sim.vel.z * nz;
      if (dot < 0) {
        sim.vel.y -= 1.75 * dot * ny;
        sim.vel.z -= 1.75 * dot * nz;
        sim.vel.multiplyScalar(0.82);
        hit = true;
      }
    }
  }

  return hit;
}
