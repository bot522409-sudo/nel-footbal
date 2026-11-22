import * as THREE from 'three';
import { FcPlayerCard } from './fcData';
import { ArticulatedPlayer, createArticulatedPlayer } from './models';
import {
  DribbleSkillType,
  HairStyle,
  KICKER_PROFILES,
  MatchFormat,
  PITCH_HALF_L,
  PITCH_HALF_W,
  PITCH_LENGTH,
  PLAYER_SKINS,
  PlayerSkinId,
  RUNNING_AURAS,
  RunningAuraId,
  TEAM_PROFILES,
  TeamId,
} from './types';

export interface MatchPlayerAgent {
  index: number;
  team: 'home' | 'away';
  role: 'gk' | 'def' | 'mid' | 'fwd';
  homeAnchor: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  stridePhase: number;
  mesh: ArticulatedPlayer;
  isStar: boolean;
  ovr: number;
  pacStat: number;
  shoStat: number;
  playerName: string;
  tackleCooldown: number;
  aiActionTimer: number;
  diveTimer: number;
  diveDir: number;
  skillType: DribbleSkillType | null;
  skillTimer: number;
  stunTimer: number;
  sprintBurstTimer: number;
  slideTackleTimer?: number;
  slideDirX?: number;
  slideDirZ?: number;
}

const SQUAD_HAIR_VARIETY: HairStyle[] = [
  'quiff',
  'buzz',
  'mohawk',
  'long_flow',
  'afro_braids',
];

const SQUAD_SKIN_TONES = [0xd99b72, 0xe6b89c, 0xc98a5f, 0x8d583b, 0xf0c7ae];
const SQUAD_BOOT_COLORS = [0xfef08a, 0x38bdf8, 0xf97316, 0x4ade80, 0xf43f5e, 0xf8fafc];

export function createMatchSquads(
  scene: THREE.Scene,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  homeLineup?: FcPlayerCard[],
  playerSkinId: PlayerSkinId = 'default',
  format: MatchFormat = '5v5',
  runningAuraId: RunningAuraId = 'emerald_wind',
): MatchPlayerAgent[] {
  const homeTeam = TEAM_PROFILES[homeTeamId];
  const awayTeam = TEAM_PROFILES[awayTeamId];
  const skin = PLAYER_SKINS[playerSkinId];
  const useCustomSkin = playerSkinId !== 'default';
  const auraHex =
    runningAuraId !== 'none'
      ? RUNNING_AURAS[runningAuraId].hexColor
      : skin.auraColor;

  const effectiveHomeJersey = useCustomSkin
    ? skin.jerseyColor
    : homeTeam.jerseyColor;
  const sameKit =
    effectiveHomeJersey.toLowerCase() === awayTeam.jerseyColor.toLowerCase();

  const awayJersey = sameKit ? awayTeam.altJerseyColor : awayTeam.jerseyColor;
  const awayShorts = sameKit ? awayTeam.altShortsColor : awayTeam.shortsColor;

  const homeStar = KICKER_PROFILES[homeTeam.starKickerId];
  const awayStar = KICKER_PROFILES[awayTeam.starKickerId];

  const agents: MatchPlayerAgent[] = [];

  type SlotDef = {
    role: MatchPlayerAgent['role'];
    x: number;
    z: number;
    num: string;
    isStar: boolean;
  };

  // Home Team defends South (z = PITCH_LENGTH = 105), attacks North (z = 0)
  const homeSlots: SlotDef[] =
    format === '11v11'
      ? [
          { role: 'gk', x: 0, z: PITCH_LENGTH - 1.2, num: '1', isStar: false },
          { role: 'def', x: -24, z: 86, num: '3', isStar: false },
          { role: 'def', x: -8, z: 88, num: homeTeam.squadNumbers[0], isStar: false },
          { role: 'def', x: 8, z: 88, num: '5', isStar: false },
          { role: 'def', x: 24, z: 86, num: '2', isStar: false },
          { role: 'mid', x: 0, z: 74, num: '6', isStar: false },
          { role: 'mid', x: -16, z: 64, num: homeTeam.squadNumbers[1], isStar: false },
          { role: 'mid', x: 16, z: 64, num: homeTeam.squadNumbers[2], isStar: false },
          { role: 'fwd', x: -25, z: 55.5, num: '11', isStar: false },
          { role: 'fwd', x: 0, z: 54.5, num: homeTeam.squadNumbers[3], isStar: true },
          { role: 'fwd', x: 25, z: 55.5, num: '7', isStar: false },
        ]
      : [
          { role: 'gk', x: 0, z: PITCH_LENGTH - 1.2, num: '1', isStar: false },
          { role: 'def', x: 0, z: 80, num: homeTeam.squadNumbers[0], isStar: false },
          { role: 'mid', x: -11, z: 64, num: homeTeam.squadNumbers[1], isStar: false },
          { role: 'mid', x: 11, z: 64, num: homeTeam.squadNumbers[2], isStar: false },
          { role: 'fwd', x: 0, z: 54.5, num: homeTeam.squadNumbers[3], isStar: true },
        ];

  homeSlots.forEach((slot, idx) => {
    const isGk = slot.role === 'gk';
    const card = homeLineup?.[idx % Math.max(1, homeLineup.length)];
    const isStarSlot = slot.isStar || (card ? card.ovr >= 90 : false);
    const mesh = createArticulatedPlayer({
      jerseyColor: isGk ? homeTeam.gkJerseyColor : effectiveHomeJersey,
      accentColor: isGk
        ? useCustomSkin
          ? skin.accentColor
          : '#f8fafc'
        : useCustomSkin
        ? skin.accentColor
        : homeStar.jerseyAccent,
      shortsColor: isGk
        ? 0x0f172a
        : useCustomSkin
        ? skin.shortsColor
        : homeTeam.shortsColor,
      gloveColor: isGk
        ? useCustomSkin
          ? skin.gloveColor
          : 0x38bdf8
        : undefined,
      bootColor: useCustomSkin
        ? skin.bootColor
        : card
        ? card.bootColor
        : slot.isStar
        ? homeStar.bootColor
        : SQUAD_BOOT_COLORS[idx % SQUAD_BOOT_COLORS.length],
      hairColor:
        useCustomSkin && skin.hairTint && (slot.isStar || isStarSlot)
          ? skin.hairTint
          : card
          ? card.hairColor
          : slot.isStar
          ? homeStar.hairColor
          : 0x1a1512,
      skinColor: card
        ? card.skinColor
        : slot.isStar
        ? homeStar.skinColor
        : SQUAD_SKIN_TONES[idx % SQUAD_SKIN_TONES.length],
      hasBeard: card
        ? Boolean(card.hasBeard)
        : slot.isStar
        ? homeStar.hasBeard
        : idx % 3 === 1,
      isStar: !isGk && isStarSlot,
      kitPattern: useCustomSkin ? skin.kitPattern : homeStar.kitPattern,
      hairStyle:
        useCustomSkin && skin.hairStyle && slot.isStar
          ? skin.hairStyle
          : slot.isStar
          ? homeStar.hairStyle
          : SQUAD_HAIR_VARIETY[idx % SQUAD_HAIR_VARIETY.length],
      hasHeadband:
        useCustomSkin && slot.isStar
          ? Boolean(skin.hasHeadband)
          : slot.isStar
          ? Boolean(homeStar.hasHeadband)
          : false,
      auraColor: !isGk && isStarSlot ? auraHex : undefined,
      numberStr: card ? card.numberStr : slot.num,
      scale: isGk ? 1.08 : isStarSlot ? 1.05 : 0.98 + (idx % 3) * 0.02,
    });
    mesh.group.position.set(slot.x, 0, slot.z);
    scene.add(mesh.group);

    agents.push({
      index: agents.length,
      team: 'home',
      role: slot.role,
      homeAnchor: new THREE.Vector3(slot.x, 0, slot.z),
      pos: new THREE.Vector3(slot.x, 0, slot.z),
      vel: new THREE.Vector3(),
      facingYaw: Math.PI, // face North (-Z)
      stridePhase: Math.random() * Math.PI * 2,
      mesh,
      isStar: isStarSlot,
      ovr: card ? card.ovr : slot.isStar ? homeTeam.attackRating : 82,
      pacStat: card ? card.stats.pac : slot.isStar ? 90 : 81,
      shoStat: card ? card.stats.sho : slot.isStar ? 89 : 78,
      playerName: card ? card.shortName : homeTeam.shortCode,
      tackleCooldown: 0,
      aiActionTimer: 0.4 + Math.random() * 0.5,
      diveTimer: 0,
      diveDir: 0,
      skillType: null,
      skillTimer: 0,
      stunTimer: 0,
      sprintBurstTimer: 0,
      slideTackleTimer: 0,
      slideDirX: 0,
      slideDirZ: -1,
    });
  });

  // Away Team defends North (z = 0), attacks South (z = PITCH_LENGTH = 105)
  const awaySlots: SlotDef[] =
    format === '11v11'
      ? [
          { role: 'gk', x: 0, z: 1.2, num: '1', isStar: false },
          { role: 'def', x: -24, z: 19, num: '3', isStar: false },
          { role: 'def', x: -8, z: 17, num: awayTeam.squadNumbers[0], isStar: false },
          { role: 'def', x: 8, z: 17, num: '5', isStar: false },
          { role: 'def', x: 24, z: 19, num: '2', isStar: false },
          { role: 'mid', x: 0, z: 31, num: '6', isStar: false },
          { role: 'mid', x: -16, z: 41, num: awayTeam.squadNumbers[1], isStar: false },
          { role: 'mid', x: 16, z: 41, num: awayTeam.squadNumbers[2], isStar: false },
          { role: 'fwd', x: -25, z: 49.5, num: '11', isStar: false },
          { role: 'fwd', x: 0, z: 50.2, num: awayTeam.squadNumbers[3], isStar: true },
          { role: 'fwd', x: 25, z: 49.5, num: '7', isStar: false },
        ]
      : [
          { role: 'gk', x: 0, z: 1.2, num: '1', isStar: false },
          { role: 'def', x: 0, z: 25, num: awayTeam.squadNumbers[0], isStar: false },
          { role: 'mid', x: -11, z: 41, num: awayTeam.squadNumbers[1], isStar: false },
          { role: 'mid', x: 11, z: 41, num: awayTeam.squadNumbers[2], isStar: false },
          { role: 'fwd', x: 0, z: 49.5, num: awayTeam.squadNumbers[3], isStar: true },
        ];

  awaySlots.forEach((slot, idx) => {
    const isGk = slot.role === 'gk';
    const mesh = createArticulatedPlayer({
      jerseyColor: isGk ? awayTeam.gkJerseyColor : awayJersey,
      accentColor: isGk ? '#f8fafc' : awayStar.jerseyAccent,
      shortsColor: isGk ? 0x0f172a : awayShorts,
      gloveColor: isGk ? 0xfacc15 : undefined,
      bootColor: slot.isStar
        ? awayStar.bootColor
        : SQUAD_BOOT_COLORS[(idx + 2) % SQUAD_BOOT_COLORS.length],
      hairColor: slot.isStar ? awayStar.hairColor : 0x1a1512,
      skinColor: slot.isStar
        ? awayStar.skinColor
        : SQUAD_SKIN_TONES[(idx + 1) % SQUAD_SKIN_TONES.length],
      hasBeard: slot.isStar ? awayStar.hasBeard : idx % 4 === 2,
      isStar: !isGk && slot.isStar,
      kitPattern: awayStar.kitPattern,
      hairStyle: slot.isStar
        ? awayStar.hairStyle
        : SQUAD_HAIR_VARIETY[(idx + 1) % SQUAD_HAIR_VARIETY.length],
      hasHeadband: slot.isStar ? Boolean(awayStar.hasHeadband) : false,
      auraColor: !isGk && slot.isStar ? '#fb7185' : undefined,
      numberStr: slot.num,
      scale: isGk ? 1.08 : slot.isStar ? 1.05 : 0.98 + (idx % 3) * 0.02,
    });
    mesh.group.position.set(slot.x, 0, slot.z);
    scene.add(mesh.group);

    agents.push({
      index: agents.length,
      team: 'away',
      role: slot.role,
      homeAnchor: new THREE.Vector3(slot.x, 0, slot.z),
      pos: new THREE.Vector3(slot.x, 0, slot.z),
      vel: new THREE.Vector3(),
      facingYaw: 0, // face South (+Z)
      stridePhase: Math.random() * Math.PI * 2,
      mesh,
      isStar: slot.isStar,
      ovr: slot.isStar ? awayTeam.attackRating : awayTeam.defenseRating,
      pacStat: slot.isStar ? 89 : 81,
      shoStat: slot.isStar ? 88 : 79,
      playerName: awayTeam.shortCode,
      tackleCooldown: 0,
      aiActionTimer: 0.4 + Math.random() * 0.5,
      diveTimer: 0,
      diveDir: 0,
      skillType: null,
      skillTimer: 0,
      stunTimer: 0,
      sprintBurstTimer: 0,
      slideTackleTimer: 0,
      slideDirX: 0,
      slideDirZ: 1,
    });
  });

  return agents;
}

export function resetMatchPositions(
  players: MatchPlayerAgent[],
  kickoffTeam: 'home' | 'away',
): void {
  let homeKickerPlaced = false;
  let awayKickerPlaced = false;
  players.forEach((p) => {
    p.pos.copy(p.homeAnchor);
    if (p.role === 'fwd') {
      if (kickoffTeam === 'home') {
        if (p.team === 'home' && (p.isStar || !homeKickerPlaced)) {
          p.pos.set(0, 0, PITCH_HALF_L + 0.5);
          homeKickerPlaced = true;
        } else if (p.team === 'away') {
          p.pos.z = Math.min(p.homeAnchor.z, PITCH_HALF_L - 9.8);
        }
      } else {
        if (p.team === 'away' && (p.isStar || !awayKickerPlaced)) {
          p.pos.set(0, 0, PITCH_HALF_L - 0.5);
          awayKickerPlaced = true;
        } else if (p.team === 'home') {
          p.pos.z = Math.max(p.homeAnchor.z, PITCH_HALF_L + 9.8);
        }
      }
    }
    p.vel.set(0, 0, 0);
    p.tackleCooldown = 0;
    p.diveTimer = 0;
    p.diveDir = 0;
    p.skillType = null;
    p.skillTimer = 0;
    p.stunTimer = 0;
    p.sprintBurstTimer = 0;
    p.slideTackleTimer = 0;
    p.facingYaw = p.team === 'home' ? Math.PI : 0;
    p.mesh.group.position.copy(p.pos);
    p.mesh.group.rotation.set(0, p.facingYaw, 0);
    p.mesh.bodyPivot.rotation.set(0, 0, 0);
    p.mesh.bodyPivot.position.set(0, 0.92, 0);
    p.mesh.headGroup.rotation.set(0, 0, 0);
    p.mesh.leftLeg.rotation.set(0, 0, 0.08);
    p.mesh.rightLeg.rotation.set(0, 0, -0.08);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0, 0, 0);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0, 0, 0);
    p.mesh.leftArm.rotation.set(0, 0, -0.15);
    p.mesh.rightArm.rotation.set(0, 0, 0.15);
    p.mesh.setAuraState(0, false, false, 'none', 0);
  });
}

export function resetMatchCornerPositions(
  players: MatchPlayerAgent[],
  attackingTeam: 'home' | 'away',
  side: 'left' | 'right',
): MatchPlayerAgent | null {
  const attackingNorth = attackingTeam === 'home';
  const cornerX = side === 'left' ? -(PITCH_HALF_W - 0.7) : PITCH_HALF_W - 0.7;
  const cornerZ = attackingNorth ? 0.7 : PITCH_LENGTH - 0.7;
  const goalZ = attackingNorth ? 0 : PITCH_LENGTH;
  const dirZ = attackingNorth ? 1 : -1;

  // Choose best non-GK player on attacking team as corner taker
  const attackers = players.filter((p) => p.team === attackingTeam && p.role !== 'gk');
  const kicker =
    attackers.find((p) => p.role === 'mid') ?? attackers[0] ?? null;

  let attSlot = 0;
  let defSlot = 0;
  const attBoxTargets = [
    [0, goalZ + dirZ * 6.5],
    [-4.6, goalZ + dirZ * 8.2],
    [4.6, goalZ + dirZ * 8.2],
    [-2.8, goalZ + dirZ * 12.2],
    [2.8, goalZ + dirZ * 12.5],
    [0, goalZ + dirZ * 17.5],
    [-14.5, goalZ + dirZ * 19.0],
    [14.5, goalZ + dirZ * 19.0],
    [-8.5, goalZ + dirZ * 26.0],
    [8.5, goalZ + dirZ * 26.0],
  ];
  const defBoxTargets = [
    [-1.4, goalZ + dirZ * 4.4],
    [1.4, goalZ + dirZ * 4.4],
    [-5.2, goalZ + dirZ * 7.2],
    [5.2, goalZ + dirZ * 7.2],
    [0, goalZ + dirZ * 9.8],
    [-11.0, goalZ + dirZ * 11.2],
    [11.0, goalZ + dirZ * 11.2],
    [0, goalZ + dirZ * 15.5],
    [-8.5, goalZ + dirZ * 18.0],
    [8.5, goalZ + dirZ * 18.0],
  ];

  players.forEach((p) => {
    p.vel.set(0, 0, 0);
    p.tackleCooldown = 0;
    p.diveTimer = 0;
    p.diveDir = 0;
    p.skillType = null;
    p.skillTimer = 0;
    p.stunTimer = 0;
    p.sprintBurstTimer = 0;
    p.slideTackleTimer = 0;

    if (kicker && p.index === kicker.index) {
      p.pos.set(cornerX + (side === 'left' ? -0.5 : 0.5), 0, cornerZ);
      p.facingYaw = Math.atan2(0 - p.pos.x, goalZ + dirZ * 7 - p.pos.z);
    } else if (p.role === 'gk') {
      const isDefendingGk = p.team !== attackingTeam;
      if (isDefendingGk) {
        p.pos.set(side === 'left' ? -0.9 : 0.9, 0, goalZ + dirZ * 1.4);
        p.facingYaw = Math.atan2(cornerX - p.pos.x, cornerZ - p.pos.z);
      } else {
        p.pos.copy(p.homeAnchor);
        p.facingYaw = p.team === 'home' ? Math.PI : 0;
      }
    } else if (p.team === attackingTeam) {
      const pt = attBoxTargets[attSlot % attBoxTargets.length];
      attSlot++;
      p.pos.set(pt[0], 0, pt[1]);
      p.facingYaw = Math.atan2(cornerX - p.pos.x, cornerZ - p.pos.z);
    } else {
      const pt = defBoxTargets[defSlot % defBoxTargets.length];
      defSlot++;
      p.pos.set(pt[0], 0, pt[1]);
      p.facingYaw = Math.atan2(cornerX - p.pos.x, cornerZ - p.pos.z);
    }

    p.mesh.group.position.copy(p.pos);
    p.mesh.group.rotation.set(0, p.facingYaw, 0);
    p.mesh.bodyPivot.rotation.set(0, 0, 0);
    p.mesh.bodyPivot.position.set(0, 0.92, 0);
    p.mesh.headGroup.rotation.set(0, 0, 0);
    p.mesh.leftLeg.rotation.set(0, 0, 0.06);
    p.mesh.rightLeg.rotation.set(0, 0, -0.06);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0, 0, 0);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0, 0, 0);
    p.mesh.leftArm.rotation.set(0, 0, -0.16);
    p.mesh.rightArm.rotation.set(0, 0, 0.16);
    p.mesh.setAuraState(0, false, false, 'none', 0);
  });

  return kicker;
}

export function animateMatchPlayer(
  p: MatchPlayerAgent,
  dt: number,
  runningAuraId: RunningAuraId = 'emerald_wind',
  elapsedSec = 0,
): void {
  const speed = Math.hypot(p.vel.x, p.vel.z);
  p.mesh.group.position.set(p.pos.x, 0, p.pos.z);

  if (p.skillTimer > 0) {
    p.skillTimer = Math.max(0, p.skillTimer - dt);
    if (p.skillTimer === 0) {
      p.skillType = null;
    }
  }
  if (p.stunTimer > 0) {
    p.stunTimer = Math.max(0, p.stunTimer - dt);
  }
  if (p.sprintBurstTimer > 0) {
    p.sprintBurstTimer = Math.max(0, p.sprintBurstTimer - dt);
  }
  if (p.slideTackleTimer && p.slideTackleTimer > 0) {
    p.slideTackleTimer = Math.max(0, p.slideTackleTimer - dt);
    const prog = THREE.MathUtils.clamp(1 - p.slideTackleTimer / 0.56, 0, 1);
    const slideDrop = Math.sin(Math.min(1, prog * 1.65) * Math.PI * 0.5);
    const recover = prog > 0.72 ? (prog - 0.72) / 0.28 : 0;
    const poseMix = slideDrop * (1 - recover * 0.65);

    p.facingYaw = Math.atan2(p.slideDirX || Math.sin(p.facingYaw), p.slideDirZ || Math.cos(p.facingYaw));
    p.mesh.group.rotation.y = p.facingYaw;
    p.mesh.bodyPivot.position.y = THREE.MathUtils.lerp(0.92, 0.25, poseMix);
    p.mesh.bodyPivot.rotation.set(-1.18 * poseMix, 0, 0.22 * poseMix);
    p.mesh.headGroup.rotation.set(0.35 * poseMix, 0, -0.14 * poseMix);
    p.mesh.rightLeg.rotation.set(-0.36 * poseMix, 0, -0.08);
    p.mesh.leftLeg.rotation.set(0.24 * poseMix, 0, 0.18);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.06, 0, 0);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(1.38 * poseMix, 0, 0);
    p.mesh.leftArm.rotation.set(-0.55 * poseMix, 0, -0.92 * poseMix);
    p.mesh.rightArm.rotation.set(0.58 * poseMix, 0, 0.98 * poseMix);
    p.mesh.setAuraState(1.35, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.role === 'gk' && p.diveTimer > 0) {
    p.diveTimer = Math.max(0, p.diveTimer - dt);
    const prog = THREE.MathUtils.clamp(1 - p.diveTimer / 0.78, 0, 1);
    const crouch = prog < 0.14 ? Math.sin((prog / 0.14) * Math.PI) : 0;
    const launchMix = THREE.MathUtils.smoothstep(prog, 0.06, 0.28);
    const airT = THREE.MathUtils.clamp((prog - 0.08) / 0.50, 0, 1);
    const airArc = Math.sin(airT * Math.PI);
    const plunge = THREE.MathUtils.smoothstep(prog, 0.50, 0.86);
    const recover = THREE.MathUtils.smoothstep(prog, 0.84, 1.0);
    const turfBounce =
      prog > 0.56 && prog < 0.84
        ? Math.sin(((prog - 0.56) / 0.28) * Math.PI) * 0.075 * (1 - prog * 0.35)
        : 0;

    const rollSign = Math.sign(p.diveDir || 1);
    const diveSide = -rollSign;

    const airBodyY = 0.92 - crouch * 0.18 + airArc * 0.58;
    const slideBodyY = THREE.MathUtils.lerp(0.24, 0.31, recover);
    p.mesh.bodyPivot.position.y =
      THREE.MathUtils.lerp(airBodyY, slideBodyY, plunge) + turfBounce;
    p.mesh.bodyPivot.rotation.z =
      rollSign *
      THREE.MathUtils.lerp(1.42, THREE.MathUtils.lerp(1.52, 1.18, recover), plunge) *
      launchMix;
    // Open chest slightly toward the incoming ball during mid-air flight, then roll onto hip on slide
    p.mesh.bodyPivot.rotation.y =
      rollSign *
      (0.28 * Math.sin(airT * Math.PI) - 0.14 * plunge) *
      launchMix;
    p.mesh.bodyPivot.rotation.x =
      crouch * 0.32 + THREE.MathUtils.lerp(0.08, 0.24, plunge) * launchMix;

    // Keep GK eyes locked forward on the ball
    p.mesh.headGroup.rotation.set(
      0.08 * launchMix - crouch * 0.18,
      -rollSign * 0.22 * launchMix,
      -rollSign * THREE.MathUtils.lerp(0.68, 0.42, recover) * launchMix,
    );

    // Arms coil briefly, then snap into full straight-elbow reach toward the corner
    const leadArmRz = diveSide * THREE.MathUtils.lerp(2.92, 2.48, plunge);
    const trailArmRz = -diveSide * THREE.MathUtils.lerp(2.74, 2.28, plunge);
    const leadArmRx = THREE.MathUtils.lerp(0.24, 0.42, plunge);
    const trailArmRx = THREE.MathUtils.lerp(0.32, 0.52, plunge);
    const coilArmRx = -0.78;
    const elbowBend = THREE.MathUtils.lerp(
      -0.65,
      THREE.MathUtils.lerp(-0.04, -0.56, plunge),
      launchMix,
    );

    if (diveSide > 0) {
      p.mesh.rightArm.rotation.set(
        THREE.MathUtils.lerp(coilArmRx, leadArmRx, launchMix),
        0,
        THREE.MathUtils.lerp(0.55, leadArmRz, launchMix),
      );
      p.mesh.leftArm.rotation.set(
        THREE.MathUtils.lerp(coilArmRx, trailArmRx, launchMix),
        0,
        THREE.MathUtils.lerp(-0.55, trailArmRz, launchMix),
      );
      p.mesh.rightLeg.rotation.set(
        crouch * -0.55 + THREE.MathUtils.lerp(-0.42, -0.22, plunge) * launchMix,
        0,
        -0.12,
      );
      p.mesh.leftLeg.rotation.set(
        crouch * -0.55 + THREE.MathUtils.lerp(0.32, 0.12, plunge) * launchMix,
        0,
        0.18,
      );
      if (p.mesh.rightKneePivot) {
        p.mesh.rightKneePivot.rotation.set(
          crouch * 0.92 + THREE.MathUtils.lerp(0.76, 0.98, plunge) * launchMix,
          0,
          0,
        );
      }
      if (p.mesh.leftKneePivot) {
        p.mesh.leftKneePivot.rotation.set(
          crouch * 0.92 + THREE.MathUtils.lerp(0.14, 0.58, plunge) * launchMix,
          0,
          0,
        );
      }
    } else {
      p.mesh.leftArm.rotation.set(
        THREE.MathUtils.lerp(coilArmRx, leadArmRx, launchMix),
        0,
        THREE.MathUtils.lerp(-0.55, leadArmRz, launchMix),
      );
      p.mesh.rightArm.rotation.set(
        THREE.MathUtils.lerp(coilArmRx, trailArmRx, launchMix),
        0,
        THREE.MathUtils.lerp(0.55, trailArmRz, launchMix),
      );
      p.mesh.leftLeg.rotation.set(
        crouch * -0.55 + THREE.MathUtils.lerp(-0.42, -0.22, plunge) * launchMix,
        0,
        0.12,
      );
      p.mesh.rightLeg.rotation.set(
        crouch * -0.55 + THREE.MathUtils.lerp(0.32, 0.12, plunge) * launchMix,
        0,
        -0.18,
      );
      if (p.mesh.leftKneePivot) {
        p.mesh.leftKneePivot.rotation.set(
          crouch * 0.92 + THREE.MathUtils.lerp(0.76, 0.98, plunge) * launchMix,
          0,
          0,
        );
      }
      if (p.mesh.rightKneePivot) {
        p.mesh.rightKneePivot.rotation.set(
          crouch * 0.92 + THREE.MathUtils.lerp(0.14, 0.58, plunge) * launchMix,
          0,
          0,
        );
      }
    }
    if (p.mesh.leftElbowPivot) p.mesh.leftElbowPivot.rotation.set(elbowBend, 0, 0);
    if (p.mesh.rightElbowPivot) p.mesh.rightElbowPivot.rotation.set(elbowBend, 0, 0);
    p.mesh.setAuraState(1.15 * airArc, airArc > 0.2, true, runningAuraId, elapsedSec);
    return;
  }

  // Smooth shortest-angle yaw interpolation + banking lean
  let turnDiff = 0;
  if (speed > 0.35) {
    const targetYaw = Math.atan2(p.vel.x, p.vel.z);
    turnDiff = targetYaw - p.facingYaw;
    while (turnDiff > Math.PI) turnDiff -= Math.PI * 2;
    while (turnDiff < -Math.PI) turnDiff += Math.PI * 2;
    p.facingYaw += turnDiff * Math.min(1, 11 * dt);
  }
  p.mesh.group.rotation.y = p.facingYaw;

  const speedRatio = THREE.MathUtils.clamp(speed / 9.2, 0, 1.35);
  const isSprinting = speed > 7.6 || p.sprintBurstTimer > 0;
  const isSkillActive = p.skillTimer > 0 && p.skillType !== null;

  // Special animated dribble skills
  if (p.skillTimer > 0 && p.skillType === 'roulette') {
    const prog = 1 - p.skillTimer / 0.48;
    p.mesh.bodyPivot.rotation.y = prog * Math.PI * 2;
    p.mesh.bodyPivot.rotation.x = 0.24;
    p.mesh.bodyPivot.rotation.z = Math.sin(prog * Math.PI) * 0.16;
    p.mesh.bodyPivot.position.y = 0.94 + Math.sin(prog * Math.PI) * 0.06;
    p.mesh.leftArm.rotation.set(-0.35, 0, -0.58);
    p.mesh.rightArm.rotation.set(-0.35, 0, 0.58);
    p.mesh.leftLeg.rotation.set(Math.sin(prog * Math.PI * 2) * 0.55, 0, 0.12);
    p.mesh.rightLeg.rotation.set(-Math.sin(prog * Math.PI * 2) * 0.55, 0, -0.12);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.45, 0, 0);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.45, 0, 0);
    p.mesh.setAuraState(1.25, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.skillTimer > 0 && p.skillType === 'stepover') {
    const prog = 1 - p.skillTimer / 0.44;
    const feint = Math.sin(prog * Math.PI * 4);
    p.mesh.bodyPivot.rotation.y = feint * 0.26;
    p.mesh.bodyPivot.rotation.x = 0.28;
    p.mesh.bodyPivot.rotation.z = feint * 0.24;
    p.mesh.bodyPivot.position.y = 0.89;
    p.mesh.leftLeg.rotation.set(-0.42 + feint * 0.48, 0, Math.max(0.06, feint * 0.36));
    p.mesh.rightLeg.rotation.set(-0.42 - feint * 0.48, 0, Math.min(-0.06, feint * 0.36));
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.38 + Math.max(0, feint) * 0.45, 0, 0);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.38 + Math.max(0, -feint) * 0.45, 0, 0);
    p.mesh.leftArm.rotation.set(0.32, 0, -0.45 - feint * 0.25);
    p.mesh.rightArm.rotation.set(0.32, 0, 0.45 - feint * 0.25);
    p.mesh.setAuraState(1.15, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.skillTimer > 0 && p.skillType === 'elastico') {
    const prog = 1 - p.skillTimer / 0.38;
    const whip = Math.sin(prog * Math.PI * 2);
    p.mesh.bodyPivot.rotation.y = whip * 0.34;
    p.mesh.bodyPivot.rotation.x = 0.26;
    p.mesh.bodyPivot.rotation.z = -whip * 0.3;
    p.mesh.bodyPivot.position.y = 0.90 + Math.abs(whip) * 0.05;
    p.mesh.rightLeg.rotation.set(-0.5, 0, -0.12 + whip * 0.46);
    p.mesh.leftLeg.rotation.set(0.38, 0, 0.1);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.42, 0, 0);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.28, 0, 0);
    p.mesh.leftArm.rotation.set(-0.3, 0, -0.55);
    p.mesh.rightArm.rotation.set(0.45, 0, 0.55);
    p.mesh.setAuraState(1.3, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.skillTimer > 0 && p.skillType === 'rainbow_flick') {
    const prog = 1 - p.skillTimer / 0.52;
    const hop = Math.sin(prog * Math.PI);
    p.mesh.bodyPivot.position.y = 0.96 + hop * 0.18;
    p.mesh.bodyPivot.rotation.x = 0.24 * hop;
    p.mesh.bodyPivot.rotation.z = Math.sin(prog * Math.PI * 2) * 0.14;
    p.mesh.rightLeg.rotation.set(0.75 * hop, 0, -0.1);
    p.mesh.leftLeg.rotation.set(-0.32 * hop, 0, 0.1);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(1.42 * hop, 0, 0);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.45 * hop, 0, 0);
    p.mesh.leftArm.rotation.set(-0.4, 0, -0.82);
    p.mesh.rightArm.rotation.set(-0.4, 0, 0.82);
    p.mesh.setAuraState(1.45, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.skillTimer > 0 && p.skillType === 'maradona_spin') {
    const prog = 1 - p.skillTimer / 0.46;
    p.mesh.bodyPivot.rotation.y = -prog * Math.PI * 2;
    p.mesh.bodyPivot.rotation.x = 0.22;
    p.mesh.bodyPivot.rotation.z = -Math.sin(prog * Math.PI) * 0.24;
    p.mesh.bodyPivot.position.y = 0.94 + Math.sin(prog * Math.PI) * 0.08;
    p.mesh.leftLeg.rotation.set(-0.52 * Math.sin(prog * Math.PI), 0, 0.15);
    p.mesh.rightLeg.rotation.set(0.42 * Math.sin(prog * Math.PI), 0, -0.15);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.72, 0, 0);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.42, 0, 0);
    p.mesh.leftArm.rotation.set(0.25, 0, -0.78);
    p.mesh.rightArm.rotation.set(-0.25, 0, 0.78);
    p.mesh.setAuraState(1.38, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.skillTimer > 0 && p.skillType === 'heel_chop') {
    const prog = 1 - p.skillTimer / 0.36;
    const snap = Math.sin(prog * Math.PI);
    p.mesh.bodyPivot.rotation.y = snap * 0.72;
    p.mesh.bodyPivot.rotation.x = 0.26;
    p.mesh.bodyPivot.rotation.z = -snap * 0.34;
    p.mesh.bodyPivot.position.y = 0.88 + snap * 0.05;
    p.mesh.rightLeg.rotation.set(0.32 * snap, 0.38 * snap, -0.46 * snap);
    p.mesh.leftLeg.rotation.set(-0.42 * snap, 0, 0.16);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(1.05 * snap, 0, 0);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.35 * snap, 0, 0);
    p.mesh.leftArm.rotation.set(-0.35, 0, -0.68);
    p.mesh.rightArm.rotation.set(0.45, 0, 0.62);
    p.mesh.setAuraState(1.32, true, true, runningAuraId, elapsedSec);
    return;
  }

  if (p.skillTimer > 0 && p.skillType === 'ball_roll_dash') {
    const prog = 1 - p.skillTimer / 0.38;
    const wave = Math.sin(prog * Math.PI);
    p.mesh.bodyPivot.rotation.z = -wave * 0.36;
    p.mesh.bodyPivot.rotation.x = 0.3;
    p.mesh.bodyPivot.position.y = 0.90;
    p.mesh.rightLeg.rotation.set(-0.38, 0, -0.42 * Math.sin(prog * Math.PI * 2));
    p.mesh.leftLeg.rotation.set(0.28, 0, 0.12);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.28, 0, 0);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.54, 0, 0);
    p.mesh.leftArm.rotation.set(-0.42, 0, -0.62);
    p.mesh.rightArm.rotation.set(0.38, 0, 0.68);
    p.mesh.setAuraState(1.35, true, true, runningAuraId, elapsedSec);
    return;
  }

  p.mesh.bodyPivot.rotation.y = THREE.MathUtils.damp(
    p.mesh.bodyPivot.rotation.y,
    0,
    14,
    dt,
  );
  p.mesh.headGroup.rotation.set(0, 0, 0);

  if (p.stunTimer > 0) {
    // Defender subtly off-balance after getting beaten by a skill move or slide tackle
    p.mesh.bodyPivot.rotation.z = Math.sin(p.stunTimer * 18) * 0.24;
    p.mesh.bodyPivot.rotation.x = -0.1;
    p.mesh.leftArm.rotation.set(0.2, 0, -0.58);
    p.mesh.rightArm.rotation.set(0.2, 0, 0.58);
    if (p.mesh.leftKneePivot) p.mesh.leftKneePivot.rotation.set(0.28, 0, 0);
    if (p.mesh.rightKneePivot) p.mesh.rightKneePivot.rotation.set(0.28, 0, 0);
    p.mesh.setAuraState(0, false, false, 'none', elapsedSec);
    return;
  }

  // Forward sprint torso lean + banking roll when carving turns
  const targetLeanX = speed > 0.4 ? Math.min(0.28, speed * 0.028) : 0;
  const targetBankZ =
    speed > 0.8 ? THREE.MathUtils.clamp(-turnDiff * 0.24, -0.24, 0.24) : 0;
  p.mesh.bodyPivot.rotation.x = THREE.MathUtils.damp(
    p.mesh.bodyPivot.rotation.x,
    targetLeanX,
    10,
    dt,
  );
  p.mesh.bodyPivot.rotation.z = THREE.MathUtils.damp(
    p.mesh.bodyPivot.rotation.z,
    targetBankZ,
    10,
    dt,
  );

  if (speed > 0.35) {
    p.stridePhase += (2.2 + speed * 2.15) * dt;
    const strideAmp = Math.min(0.95, 0.24 + speed * 0.072);
    const swing = Math.sin(p.stridePhase) * strideAmp;
    const kneeLift = Math.max(0, -Math.cos(p.stridePhase)) * 0.12 * speedRatio;
    p.mesh.leftLeg.rotation.set(swing + kneeLift, 0, 0.05);
    p.mesh.rightLeg.rotation.set(-swing + kneeLift, 0, -0.05);
    if (p.mesh.leftKneePivot) {
      const lBend = Math.max(0.06, Math.max(0, swing) * 1.15 + Math.max(0, -Math.cos(p.stridePhase)) * 0.32 * speedRatio);
      p.mesh.leftKneePivot.rotation.set(lBend, 0, 0);
    }
    if (p.mesh.rightKneePivot) {
      const rBend = Math.max(0.06, Math.max(0, -swing) * 1.15 + Math.max(0, Math.cos(p.stridePhase)) * 0.32 * speedRatio);
      p.mesh.rightKneePivot.rotation.set(rBend, 0, 0);
    }
    // Energetic athletic arm pump
    p.mesh.leftArm.rotation.set(-swing * 0.88 - 0.14, 0, -0.24);
    p.mesh.rightArm.rotation.set(swing * 0.88 - 0.14, 0, 0.24);
    p.mesh.bodyPivot.position.y =
      0.92 + Math.abs(Math.cos(p.stridePhase)) * (0.04 + 0.022 * speedRatio);
  } else {
    p.mesh.leftLeg.rotation.x = THREE.MathUtils.damp(
      p.mesh.leftLeg.rotation.x,
      0,
      9,
      dt,
    );
    p.mesh.rightLeg.rotation.x = THREE.MathUtils.damp(
      p.mesh.rightLeg.rotation.x,
      0,
      9,
      dt,
    );
    if (p.mesh.leftKneePivot) {
      p.mesh.leftKneePivot.rotation.x = THREE.MathUtils.damp(
        p.mesh.leftKneePivot.rotation.x,
        0,
        9,
        dt,
      );
    }
    if (p.mesh.rightKneePivot) {
      p.mesh.rightKneePivot.rotation.x = THREE.MathUtils.damp(
        p.mesh.rightKneePivot.rotation.x,
        0,
        9,
        dt,
      );
    }
    p.mesh.leftArm.rotation.set(0, 0, -0.18);
    p.mesh.rightArm.rotation.set(0, 0, 0.18);
    p.mesh.bodyPivot.position.y = 0.92;
  }

  // Dynamic Running Aura (on home squad or active sprinters; keeps enemy uncluttered unless sprinting/star)
  const showAura =
    p.role !== 'gk' &&
    (p.team === 'home' ? speedRatio > 0.35 || isSprinting || isSkillActive : p.isStar && isSprinting);
  p.mesh.setAuraState(
    showAura ? speedRatio : 0,
    isSprinting,
    isSkillActive,
    runningAuraId,
    elapsedSec,
  );
}
