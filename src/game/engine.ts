import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArticulatedPlayer,
  createArticulatedPlayer,
  createSoccerBall,
  createStadium,
  StadiumBundle,
} from './models';
import { createGoalSparkTexture } from './textures';
import {
  BALL_RADIUS,
  BallSimState,
  computeLaunchState,
  computePreviewArc,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  GoalkeeperPlan,
  planGoalkeeperDive,
  predictBallAtZ,
  resolveWoodworkCollision,
  stepBallPhysics,
  WallCollider,
} from './physics';
import { soundEngine } from './audio';
import {
  AimTarget,
  CameraPreset,
  CHALLENGE_SCENARIOS,
  CORNER_SCENARIOS,
  Difficulty,
  DIFFICULTY_LABELS,
  DribbleSkillType,
  GameMode,
  GamePhase,
  GameSnapshot,
  GK_ORDER,
  GK_PROFILES,
  GoalkeeperId,
  IMPOSSIBLE_SCENARIO,
  KICKER_ORDER,
  KICKER_PROFILES,
  KickerId,
  KickScenario,
  MatchFormat,
  MatchRoundRecord,
  PENALTY_SCENARIO,
  PITCH_HALF_L,
  PITCH_HALF_W,
  PITCH_LENGTH,
  PLAYER_SKINS,
  PlayerSkinId,
  PRACTICE_SPOTS,
  PracticeFocus,
  RUNNING_AURAS,
  RunningAuraId,
  ShotOutcome,
  ShotSkillType,
  SpinInput,
  TEAM_PROFILES,
  TeamId,
  TurnRole,
  WeatherType,
  WindState,
} from './types';
import { FcPlayerCard } from './fcData';
import {
  animateMatchPlayer,
  createMatchSquads,
  MatchPlayerAgent,
  resetMatchCornerPositions,
  resetMatchPositions,
} from './match';

// Pre-allocated math helpers (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _crowdBodyObj = new THREE.Object3D();
const _crowdHeadObj = new THREE.Object3D();
const _crowdArmObj = new THREE.Object3D();
const _flashObj = new THREE.Object3D();
const _dustObj = new THREE.Object3D();
const _weatherObj = new THREE.Object3D();
const _camSpherical = new THREE.Spherical();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z = 0
const _gkPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45); // z = 0.45
const _pitchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y = 0

const BEST_SCORE_KEY = 'sut_phat_3d_best_score_v1';

interface ReplayFrame {
  ballPos: THREE.Vector3;
  ballQuat: THREE.Quaternion;
  gkX: number;
  gkY: number;
  gkBodyY: number;
  gkRotX: number;
  gkRotZ: number;
  gkDiveProgress: number;
  gkDiveDir: number;
  wallJumpY: number;
  kickerPos: THREE.Vector3;
  kickerKickLegRot: number;
  kickerSupportLegRot: number;
  teammatePos?: THREE.Vector3;
  teammateJumpY?: number;
  t: number;
}

export class FreeKickEngine {
  private container: HTMLElement;
  private onStateChange: (snapshot: GameSnapshot) => void;
  private onContextLostChange?: (lost: boolean) => void;
  private onLightningFlash?: (intensity: number) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;

  private stadium!: StadiumBundle;
  private ballObj!: ReturnType<typeof createSoccerBall>;
  private goalkeeper!: ArticulatedPlayer;
  private kickerPlayer: ArticulatedPlayer | null = null;
  private teammatePlayer: ArticulatedPlayer | null = null;
  private wallPlayers: ArticulatedPlayer[] = [];
  private wallDefenderPositions: THREE.Vector3[] = [];
  private wallColliders: WallCollider[] = [];
  private boxDefenders: Array<{
    player: ArticulatedPlayer;
    homePos: THREE.Vector3;
    currentPos: THREE.Vector3;
    markOffset: THREE.Vector3;
  }> = [];

  // Visual helpers: Aim reticle, preview arc, shot trail, confetti
  private aimReticleGroup!: THREE.Group;
  private aimRingMat!: THREE.MeshBasicMaterial;
  private previewLine!: THREE.Line;
  private previewDots: THREE.InstancedMesh | null = null;
  private trailPoints: THREE.Vector3[] = [];
  private trailLine!: THREE.Line;
  private trailGeo!: THREE.BufferGeometry;
  private trailMat!: THREE.LineBasicMaterial;

  private confettiMesh!: THREE.InstancedMesh;
  private confettiVelocities: THREE.Vector3[] = [];
  private confettiPos: THREE.Vector3[] = [];
  private confettiActive = false;
  private confettiTimer = 0;

  private goalPyroMesh!: THREE.InstancedMesh;
  private goalPyroPos: THREE.Vector3[] = [];
  private goalPyroVel: THREE.Vector3[] = [];
  private goalPyroActive = false;
  private goalPyroTimer = 0;

  private goalShockwaveMesh!: THREE.Mesh;
  private goalShockwaveMat!: THREE.MeshBasicMaterial;
  private goalShockwaveTimer = 99;

  private goalFlashLight!: THREE.PointLight;
  private goalFlashTimer = 99;
  private goalCelebrateTimer = 0;
  private goalIsSuper = false;

  private turfDustMesh!: THREE.InstancedMesh;
  private turfDustPos: THREE.Vector3[] = [];
  private turfDustVel: THREE.Vector3[] = [];
  private turfDustLife: number[] = [];
  private gkTurfImpactDone = false;
  private impactShakeTimer = 0;

  // Lighting & 3D Weather System (Clear, Rain, Snow, Storm + Lightning)
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private lightningLight!: THREE.PointLight;
  private lightningBoltGroup!: THREE.Group;
  private lightningBoltSegs: Array<{ core: THREE.Mesh; glow: THREE.Mesh }> = [];
  private lightningCoreMat!: THREE.MeshBasicMaterial;
  private lightningGlowMat!: THREE.MeshBasicMaterial;
  private weather: WeatherType = 'clear';
  private rainMesh!: THREE.InstancedMesh;
  private rainPos: THREE.Vector3[] = [];
  private rainSpeed: number[] = [];
  private snowMesh!: THREE.InstancedMesh;
  private snowPos: THREE.Vector3[] = [];
  private snowPhase: number[] = [];
  private lightningFlash = 0;
  private lightningNextTimer = 3.8;

  // Game State
  private mode: GameMode = 'challenge';
  private practiceFocus: PracticeFocus = 'freekick';
  private phase: GamePhase = 'aiming';
  private turnRole: TurnRole = 'kick';
  private vsBotHalf: 'player_kick' | 'bot_kick' = 'player_kick';
  private difficulty: Difficulty = 'medium';
  private kickerId: KickerId = 'ronaldo';
  private gkId: GoalkeeperId = 'courtois';
  private playerSkinId: PlayerSkinId = 'default';
  private gkLastRepredictTime = 0;
  private activeBotKickerId: KickerId = 'messi';
  private cameraPreset: CameraPreset = 'kicker';
  private round = 1;
  private totalRounds = CHALLENGE_SCENARIOS.length;
  private scenario: KickScenario = CHALLENGE_SCENARIOS[0];
  private effectiveWind: WindState = { x: 0.4, z: 0 };
  private score = 0;
  private bestScore = 0;
  private streak = 0;
  private goalsScored = 0;
  private playerGoals = 0;
  private botGoals = 0;
  private gkSaves = 0;
  private history: MatchRoundRecord[] = [];
  private lastOutcome: ShotOutcome | null = null;

  // Aim / Power / Spin / Pro Shot Skill
  private aim: AimTarget = { x: 1.85, y: 1.75, z: 0 };
  private spin: SpinInput = { curve: -0.35, dip: 0.25 };
  private shotSkill: ShotSkillType = 'normal';
  private power = 0.72;
  private chargingDir = 1;
  private chargeStartTime = 0;
  private preChargePower = 0.72;
  private isCurveCharging = false;

  // Active Simulation
  private ballStart = new THREE.Vector3(-1.5, BALL_RADIUS, 18.5);
  private simState: BallSimState | null = null;
  private flightElapsed = 0;
  private hitWoodworkInShot = false;
  private hitWallInShot = false;
  private shotResolved = false;
  private cornerAwardedInShot: 'left' | 'right' | null = null;
  private outcomeSettleTimer = 0;
  private prevBallZ = 0;

  // Kicker Run-up & Strike Animation
  private kickerHomePos = new THREE.Vector3();
  private kickerStrikePos = new THREE.Vector3();
  private kickerCurrentPos = new THREE.Vector3();
  private runupElapsed = 0;
  private readonly runupDuration = 0.26;
  private pendingKickPower = 0.72;
  private kickerKickLegRot = 0;
  private kickerSupportLegRot = 0;
  private paused = true;

  // Online 1v1 Duel Sync Hooks
  private onlineWaitingSync = false;
  private onlineForcedGkDive: {
    dir: 'left' | 'center' | 'right';
    targetX?: number;
    targetY?: number;
  } | null = null;
  private onlineShotIntercept:
    | ((payload: {
        aim: AimTarget;
        power: number;
        spin: SpinInput;
        kickerId: KickerId;
      }) => void)
    | null = null;
  private onlineGkDiveIntercept:
    | ((payload: {
        dir: 'left' | 'center' | 'right';
        targetX?: number;
        targetY?: number;
      }) => void)
    | null = null;
  private onlineTurnFinishedCb: ((outcome: ShotOutcome) => void) | null = null;

  // Goalkeeper animation & playable defense state
  private gkHomeX = -1.2;
  private gkPlan: GoalkeeperPlan | null = null;
  private gkCurrentX = -1.2;
  private gkCurrentY = 0;
  private gkCurrentBodyY = 0.92;
  private gkDiveRoll = 0;
  private gkDivePitch = 0;
  private gkDiveProgress = 0;
  private gkActiveDiveDir = 0;
  private gkSavedBall = false;
  private botPrepTimer = 0;
  private onImpossibleAttempt?: () => boolean;
  private isAdmin = false;
  private adminCornerTarget: { x: number; y: number } | null = null;
  private matchAdminShotTarget: { x: number; y: number } | null = null;
  private playerGkDiveActive = false;
  private playerGkDiveDir = 0;
  private playerGkDiveTargetX = 0;
  private playerGkDiveTargetY = 1.2;
  private playerGkDiveElapsed = 0;

  // Wall jump state
  private wallJumpY = 0;
  private wallJumpVel = 0;
  private wallHasJumped = false;

  // Teammate striker (#9) for crossing & header finishes
  private teammateActive = false;
  private teammateStartPos = new THREE.Vector3();
  private teammateTargetPos = new THREE.Vector3();
  private teammateCurrentPos = new THREE.Vector3();
  private teammateJumpY = 0;
  private teammateJumpVel = 0;
  private teammateHasJumped = false;
  private teammateHasHeaded = false;
  private teammateHeaderRequested = false;
  private teammateHeaderScored = false;
  private defendersDroppingBack = false;
  private reboundState: 'none' | 'chasing' | 'struck' = 'none';
  private reboundScoredShot = false;
  private gkSaveCooldown = 0;

  // 3D Team Match (5v5 / 11v11) state
  private homeTeamId: TeamId = 'real_madrid';
  private awayTeamId: TeamId = 'barcelona';
  private matchFormat: MatchFormat = '5v5';
  private runningAuraId: RunningAuraId = 'emerald_wind';
  private activeDribbleSkill: DribbleSkillType | null = null;
  private activeDribbleSkillTimer = 0;
  private matchPlayers: MatchPlayerAgent[] = [];
  private matchActiveRing!: THREE.Mesh;
  private matchCarrierRing!: THREE.Mesh;
  private matchActiveIdx = 4;
  private matchBallOwnerIdx: number | null = 4;
  private matchBallSim: BallSimState | null = null;
  private matchKickCooldown = 0;
  private matchStealGraceTimer = 0;
  private matchPassTargetIdx: number | null = null;
  private matchPassHoldTimer = 0;
  private matchAutoSwitchCooldown = 0;
  private matchTimeSec = 0;
  private readonly matchDurationSec = 90;
  private matchGoalTimer = 0;
  private matchKickoffTeam: 'home' | 'away' = 'home';
  private matchLastTouchTeam: 'home' | 'away' = 'home';
  private matchCornerSide: 'left' | 'right' = 'left';
  private matchEventText: string | null = null;
  private matchEventTimer = 0;
  private matchShotsHome = 0;
  private matchShotsAway = 0;
  private matchEmitAccum = 0;
  private matchInputDir = { x: 0, z: 0 };
  private matchSprintActive = false;
  private matchAutoAssist = false;
  private matchClickTarget: { x: number; z: number } | null = null;
  private isMatchPitchDragging = false;
  private matchLastShotDist = 0;
  private matchGoalSeq = 0;
  private matchGoalTier: 'normal' | 'super' | null = null;
  private homeLineup: FcPlayerCard[] = [];

  // Crowd cheering / disappointment animation intensity
  private crowdExcitement = 0;
  private crowdExciteTimer = 0;
  private crowdExciteDuration = 2.8;
  private crowdMood: 'idle' | 'goal' | 'miss' = 'idle';

  // Camera smoothing & 360-degree free orbit controls
  private camPos = new THREE.Vector3(0, 2.3, 24.5);
  private camTarget = new THREE.Vector3(0, 1.2, 0);
  private camFov = 48;
  private camOrbitMode = false;
  private camOrbitYaw = 0;
  private camOrbitPitch = 0;
  private camZoomMult = 1.0;
  private isOrbitDragging = false;
  private orbitLastPointer = { x: 0, y: 0 };

  // Replay buffer
  private replayFrames: ReplayFrame[] = [];
  private replayTimer = 0;

  // Input tracking
  private keys: Record<string, boolean> = {};
  private isPointerAiming = false;
  private isSwiping = false;
  private swipeStart = { x: 0, y: 0, time: 0 };
  private swipeCurrent = { x: 0, y: 0 };

  // Clock
  private lastTime = performance.now();
  private elapsedTotal = 0;

  // Disposable extras
  private extraDisposables: Array<{ dispose: () => void }> = [];

  constructor(
    container: HTMLElement,
    onStateChange: (snapshot: GameSnapshot) => void,
    onContextLostChange?: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onContextLostChange = onContextLostChange;

    try {
      const saved = localStorage.getItem(BEST_SCORE_KEY);
      if (saved) this.bestScore = parseInt(saved, 10) || 0;
    } catch {
      this.bestScore = 0;
    }

    this.initRendererAndScene();
    this.rebuildGoalkeeperModel();
    this.rebuildKickerModel();
    this.rebuildTeammateModel();
    this.setupScenario(CHALLENGE_SCENARIOS[0], false);
    this.bindEvents();
    this.emitSnapshot();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  }

  private initRendererAndScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = 0x071226;
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.0046);

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 260);

    // Procedural Studio Environment reflections (required for metallic posts & ball clearcoat)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Stadium Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xa5cbff, 0x163c22, 1.02);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff3db, 2.4);
    this.keyLight.position.set(22, 34, 24);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 95;
    this.keyLight.shadow.camera.left = -28;
    this.keyLight.shadow.camera.right = 28;
    this.keyLight.shadow.camera.top = 28;
    this.keyLight.shadow.camera.bottom = -28;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    this.rimLight.position.set(-18, 16, -24);
    this.scene.add(this.rimLight);

    this.lightningLight = new THREE.PointLight(0xe0f2fe, 0, 260, 1);
    this.lightningLight.position.set(0, 56, 30);
    this.scene.add(this.lightningLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Stadium + Net + Crowd
    this.stadium = createStadium(maxAniso);
    this.scene.add(this.stadium.group);

    // Ball + Ground Contact Shadow
    this.ballObj = createSoccerBall(maxAniso);
    this.scene.add(this.ballObj.mesh);
    this.scene.add(this.ballObj.shadowMesh);

    // Aiming Reticle & Trajectory Preview
    this.createAimAndTrailVisuals();

    // Celebration Confetti & Dynamic 3D Weather
    this.createConfettiSystem();
    this.createWeatherSystem();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private createAimAndTrailVisuals(): void {
    this.aimReticleGroup = new THREE.Group();

    const outerGeo = new THREE.RingGeometry(0.24, 0.31, 32);
    const innerGeo = new THREE.CircleGeometry(0.07, 16);
    this.aimRingMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const outerRing = new THREE.Mesh(outerGeo, this.aimRingMat);
    const innerDot = new THREE.Mesh(innerGeo, this.aimRingMat);
    outerRing.renderOrder = 20;
    innerDot.renderOrder = 20;
    this.aimReticleGroup.add(outerRing, innerDot);

    // Crosshair ticks
    const tickGeo = new THREE.PlaneGeometry(0.14, 0.03);
    for (let i = 0; i < 4; i++) {
      const tick = new THREE.Mesh(tickGeo, this.aimRingMat);
      const ang = (i * Math.PI) / 2;
      tick.position.set(Math.cos(ang) * 0.36, Math.sin(ang) * 0.36, 0);
      tick.rotation.z = ang;
      tick.renderOrder = 20;
      this.aimReticleGroup.add(tick);
    }
    this.scene.add(this.aimReticleGroup);

    // Preview trajectory dotted line
    const previewGeo = new THREE.BufferGeometry();
    const previewMat = new THREE.LineDashedMaterial({
      color: 0x6ee7b7,
      dashSize: 0.35,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.72,
    });
    this.previewLine = new THREE.Line(previewGeo, previewMat);
    this.scene.add(this.previewLine);

    // Preview curve dots (InstancedMesh for crisp visual legibility)
    const dotGeo = new THREE.SphereGeometry(0.042, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
    });
    this.previewDots = new THREE.InstancedMesh(dotGeo, dotMat, 24);
    this.previewDots.frustumCulled = false;
    this.scene.add(this.previewDots);

    // Ball Flight Trail Ribbon Line
    this.trailGeo = new THREE.BufferGeometry();
    this.trailMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
    });
    this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);

    // 3D Match Player Selection Rings
    const activeRingGeo = new THREE.RingGeometry(0.42, 0.56, 28);
    activeRingGeo.rotateX(-Math.PI / 2);
    const activeRingMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.matchActiveRing = new THREE.Mesh(activeRingGeo, activeRingMat);
    this.matchActiveRing.position.y = 0.03;
    this.matchActiveRing.visible = false;
    this.scene.add(this.matchActiveRing);

    const carrierRingGeo = new THREE.RingGeometry(0.3, 0.4, 24);
    carrierRingGeo.rotateX(-Math.PI / 2);
    const carrierRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.matchCarrierRing = new THREE.Mesh(carrierRingGeo, carrierRingMat);
    this.matchCarrierRing.position.y = 0.028;
    this.matchCarrierRing.visible = false;
    this.scene.add(this.matchCarrierRing);

    this.extraDisposables.push(
      outerGeo,
      innerGeo,
      tickGeo,
      this.aimRingMat,
      previewGeo,
      previewMat,
      dotGeo,
      dotMat,
      this.trailGeo,
      this.trailMat,
      activeRingGeo,
      activeRingMat,
      carrierRingGeo,
      carrierRingMat,
    );
  }

  private createConfettiSystem(): void {
    const count = 260;
    const geo = new THREE.PlaneGeometry(0.16, 0.085);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    this.confettiMesh = new THREE.InstancedMesh(geo, mat, count);
    this.confettiMesh.visible = false;
    this.confettiMesh.frustumCulled = false;

    const colors = [
      new THREE.Color('#10b981'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#f8fafc'),
      new THREE.Color('#f43f5e'),
      new THREE.Color('#a855f7'),
    ];
    for (let i = 0; i < count; i++) {
      this.confettiPos.push(new THREE.Vector3());
      this.confettiVelocities.push(new THREE.Vector3());
      this.confettiMesh.setColorAt(i, colors[i % colors.length]);
    }
    if (this.confettiMesh.instanceColor) {
      this.confettiMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.confettiMesh);

    // Goalpost Firework Pyro Fountains (120 glowing additive embers)
    const pyroCount = 120;
    const sparkTex = createGoalSparkTexture();
    const pyroGeo = new THREE.PlaneGeometry(0.28, 0.28);
    const pyroMat = new THREE.MeshBasicMaterial({
      map: sparkTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.goalPyroMesh = new THREE.InstancedMesh(pyroGeo, pyroMat, pyroCount);
    this.goalPyroMesh.visible = false;
    this.goalPyroMesh.frustumCulled = false;

    const pyroColors = [
      new THREE.Color('#fde047'),
      new THREE.Color('#34d399'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#fb923c'),
    ];
    for (let i = 0; i < pyroCount; i++) {
      this.goalPyroPos.push(new THREE.Vector3());
      this.goalPyroVel.push(new THREE.Vector3());
      this.goalPyroMesh.setColorAt(i, pyroColors[i % pyroColors.length]);
    }
    if (this.goalPyroMesh.instanceColor) {
      this.goalPyroMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.goalPyroMesh);

    // Expanding Luminous Goal Impact Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.88, 36);
    this.goalShockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.goalShockwaveMesh = new THREE.Mesh(ringGeo, this.goalShockwaveMat);
    this.goalShockwaveMesh.visible = false;
    this.scene.add(this.goalShockwaveMesh);

    // Dynamic Goal Celebration Flash Spotlight inside Goalmouth
    this.goalFlashLight = new THREE.PointLight(0x34d399, 0, 18, 1.5);
    this.goalFlashLight.position.set(0, 2.2, -0.8);
    this.scene.add(this.goalFlashLight);

    // Realistic Turf Grass / Soil Spray Particles on kicks & GK turf plunges
    const turfCount = 64;
    const turfGeo = new THREE.BoxGeometry(0.065, 0.04, 0.09);
    const turfMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
    });
    this.turfDustMesh = new THREE.InstancedMesh(turfGeo, turfMat, turfCount);
    this.turfDustMesh.visible = false;
    this.turfDustMesh.frustumCulled = false;
    const turfColors = [
      new THREE.Color('#22c55e'),
      new THREE.Color('#15803d'),
      new THREE.Color('#4ade80'),
      new THREE.Color('#57534e'),
      new THREE.Color('#78716c'),
    ];
    for (let i = 0; i < turfCount; i++) {
      this.turfDustPos.push(new THREE.Vector3(0, -10, 0));
      this.turfDustVel.push(new THREE.Vector3());
      this.turfDustLife.push(0);
      this.turfDustMesh.setColorAt(i, turfColors[i % turfColors.length]);
    }
    if (this.turfDustMesh.instanceColor) {
      this.turfDustMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.turfDustMesh);

    this.extraDisposables.push(
      geo,
      mat,
      sparkTex,
      pyroGeo,
      pyroMat,
      ringGeo,
      this.goalShockwaveMat,
      turfGeo,
      turfMat,
    );
  }

  private spawnTurfBurst(
    x: number,
    y: number,
    z: number,
    intensity = 1.0,
  ): void {
    this.turfDustMesh.visible = true;
    const spawnCount = Math.min(36, Math.round(18 * intensity));
    let spawned = 0;
    for (let i = 0; i < this.turfDustLife.length && spawned < spawnCount; i++) {
      if (this.turfDustLife[i] > 0.05) continue;
      const angle = Math.random() * Math.PI * 2;
      const horiz = (1.1 + Math.random() * 2.8) * intensity;
      this.turfDustPos[i].set(
        x + (Math.random() - 0.5) * 0.35,
        Math.max(0.03, y),
        z + (Math.random() - 0.5) * 0.35,
      );
      this.turfDustVel[i].set(
        Math.cos(angle) * horiz,
        (1.6 + Math.random() * 2.6) * intensity,
        Math.sin(angle) * horiz,
      );
      this.turfDustLife[i] = 0.48 + Math.random() * 0.34;
      spawned += 1;
    }
  }

  private triggerConfetti(
    originX: number,
    originY: number,
    isSuper = false,
    goalZ = 0,
  ): void {
    this.confettiActive = true;
    this.confettiTimer = 0;
    this.confettiMesh.visible = true;
    for (let i = 0; i < this.confettiPos.length; i++) {
      const fromPost = i % 3 !== 0;
      const postSide = i % 2 === 0 ? -1 : 1;
      const startX = fromPost
        ? postSide * (GOAL_HALF_WIDTH + 0.35) + (Math.random() - 0.5) * 0.6
        : originX + (Math.random() - 0.5) * 2.8;
      const startY = fromPost ? 0.35 + Math.random() * 0.4 : originY + Math.random() * 1.1;
      const startZ = goalZ - 0.45 + (Math.random() - 0.5) * 1.1;

      this.confettiPos[i].set(startX, startY, startZ);
      this.confettiVelocities[i].set(
        fromPost ? -postSide * (1.2 + Math.random() * 3.8) : (Math.random() - 0.5) * 8.5,
        fromPost ? 6.5 + Math.random() * 6.5 : 3.0 + Math.random() * 6.8,
        (Math.random() - 0.5) * 5.2 + (goalZ > 45 ? -1.4 : 1.4),
      );
    }

    // Dual Goalpost Pyro Sparks
    this.goalPyroActive = true;
    this.goalPyroTimer = 0;
    this.goalPyroMesh.visible = true;
    for (let i = 0; i < this.goalPyroPos.length; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.goalPyroPos[i].set(
        side * (GOAL_HALF_WIDTH + 0.28) + (Math.random() - 0.5) * 0.3,
        0.2,
        goalZ - 0.55,
      );
      this.goalPyroVel[i].set(
        (Math.random() - 0.5) * (isSuper ? 4.2 : 3.0) - side * 0.8,
        (isSuper ? 8.2 : 6.6) + Math.random() * 5.8,
        (Math.random() - 0.5) * 2.4,
      );
    }

    // Expanding Luminous Shockwave Ring at ball entry point
    this.goalShockwaveTimer = 0;
    this.goalShockwaveMesh.visible = true;
    this.goalShockwaveMesh.position.set(
      THREE.MathUtils.clamp(originX, -GOAL_HALF_WIDTH + 0.3, GOAL_HALF_WIDTH - 0.3),
      THREE.MathUtils.clamp(originY, 0.35, GOAL_HEIGHT - 0.2),
      goalZ + (goalZ > 45 ? -0.1 : 0.1),
    );
    this.goalShockwaveMesh.scale.setScalar(0.35);
    this.goalShockwaveMat.color.setHex(isSuper ? 0xfbbf24 : 0x34d399);
    this.goalShockwaveMat.opacity = 0.96;

    // Dynamic Goal Flash Light
    this.goalFlashTimer = 0;
    this.goalFlashLight.color.setHex(isSuper ? 0xfbbf24 : 0x10b981);
    this.goalFlashLight.position.set(
      originX,
      Math.max(1.2, originY),
      goalZ - 0.65,
    );
    this.goalFlashLight.intensity = isSuper ? 18 : 12;

    this.goalCelebrateTimer = 2.6;
    this.goalIsSuper = isSuper;
  }

  private rebuildWall(count: number, ballPos: THREE.Vector3): void {
    this.wallPlayers.forEach((p) => {
      this.scene.remove(p.group);
      p.dispose();
    });
    this.wallPlayers = [];
    this.wallDefenderPositions = [];
    this.wallColliders = [];

    this.boxDefenders.forEach((d) => {
      this.scene.remove(d.player.group);
      d.player.dispose();
    });
    this.boxDefenders = [];

    if (count > 0) {
      // Wall stands 9.15m from ball toward near-post side of goal
      const nearPostBias = -Math.sign(ballPos.x || 1) * 0.9;
      const goalTarget = new THREE.Vector3(nearPostBias, 0, 0);
      const toGoal = goalTarget.clone().sub(ballPos);
      toGoal.y = 0;
      const distToGoal = toGoal.length();
      const wallDist = Math.min(9.15, distToGoal * 0.62);
      const dir = toGoal.normalize();
      const rightPerp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const wallCenter = ballPos.clone().addScaledVector(dir, wallDist);
      wallCenter.y = 0;

      // Slight lateral shift to guard near post angle
      const spacing = 0.54;
      const wallNums = ['4', '5', '6', '14', '22', '15', '2'];

      for (let i = 0; i < count; i++) {
        const offsetIdx = i - (count - 1) / 2;
        const px = wallCenter.x + rightPerp.x * offsetIdx * spacing;
        const pz = wallCenter.z + rightPerp.z * offsetIdx * spacing;

        const player = createArticulatedPlayer({
          jerseyColor: '#1d4ed8',
          accentColor: '#93c5fd',
          shortsColor: 0xf8fafc,
          numberStr: wallNums[i % wallNums.length],
          scale: 0.98 + (i % 2) * 0.04,
        });
        player.group.position.set(px, 0, pz);
        // Face the ball!
        player.group.lookAt(ballPos.x, 0, ballPos.z);

        // Classic wall pose: hands crossed in front of torso/face
        player.leftArm.rotation.x = -0.85;
        player.leftArm.rotation.z = 0.35;
        player.rightArm.rotation.x = -0.85;
        player.rightArm.rotation.z = -0.35;

        this.scene.add(player.group);
        this.wallPlayers.push(player);
        this.wallDefenderPositions.push(new THREE.Vector3(px, 0, pz));
        this.wallColliders.push({
          x: px,
          z: pz,
          radius: 0.27,
          height: 1.84,
        });
      }
    }

    // Spawn 2 box defenders marking #9 when teammate striker is active
    if (this.teammateActive) {
      const defSpecs = [
        { num: '4', offset: new THREE.Vector3(-1.15, 0, -1.5) },
        { num: '2', offset: new THREE.Vector3(1.25, 0, -2.25) },
      ];
      for (const spec of defSpecs) {
        const dx = THREE.MathUtils.clamp(
          this.teammateStartPos.x + spec.offset.x,
          -6.5,
          6.5,
        );
        const dz = THREE.MathUtils.clamp(
          this.teammateStartPos.z + spec.offset.z,
          2.2,
          13.5,
        );
        const defPlayer = createArticulatedPlayer({
          jerseyColor: '#1d4ed8',
          accentColor: '#93c5fd',
          shortsColor: 0xf8fafc,
          numberStr: spec.num,
          scale: 1.02,
        });
        defPlayer.group.position.set(dx, 0, dz);
        defPlayer.group.lookAt(ballPos.x, 0, ballPos.z);
        defPlayer.leftArm.rotation.set(0.15, 0, -0.25);
        defPlayer.rightArm.rotation.set(-0.15, 0, 0.25);
        this.scene.add(defPlayer.group);
        this.boxDefenders.push({
          player: defPlayer,
          homePos: new THREE.Vector3(dx, 0, dz),
          currentPos: new THREE.Vector3(dx, 0, dz),
          markOffset: spec.offset.clone(),
        });
      }
    }
  }

  private getEffectiveWallCount(baseCount: number): number {
    if (this.mode === 'impossible') return 7;
    if (baseCount <= 0) return 0;
    if (this.difficulty === 'easy') return Math.max(2, baseCount - 1);
    if (this.difficulty === 'pro') return Math.min(6, baseCount + 1);
    if (this.difficulty === 'extreme') return Math.min(7, baseCount + 2);
    return baseCount;
  }

  private getEffectiveWind(baseWind: WindState): WindState {
    const mult = DIFFICULTY_LABELS[this.difficulty].windMult;
    return {
      x: Number((baseWind.x * mult).toFixed(2)),
      z: Number((baseWind.z * mult).toFixed(2)),
    };
  }

  private getActiveKickerId(): KickerId {
    return this.turnRole === 'gk' ? this.activeBotKickerId : this.kickerId;
  }

  private getActiveGkId(): GoalkeeperId {
    if (this.mode === 'impossible') return 'yashin';
    if (this.turnRole === 'gk') return this.gkId;
    if (this.mode === 'vs_bot' || this.mode === 'penalty') {
      const idx = (this.round + this.score) % GK_ORDER.length;
      const candidate = GK_ORDER[idx];
      if (candidate !== this.gkId) return candidate;
      return GK_ORDER.find((id) => id !== this.gkId) || 'neuer';
    }
    return this.gkId;
  }

  private rebuildGoalkeeperModel(): void {
    if (this.goalkeeper) {
      this.scene.remove(this.goalkeeper.group);
      this.goalkeeper.dispose();
    }
    const gk = GK_PROFILES[this.getActiveGkId()];
    const skin = PLAYER_SKINS[this.playerSkinId];
    const useCustomSkin = this.turnRole === 'gk' && this.playerSkinId !== 'default';
    const auraDef = RUNNING_AURAS[this.runningAuraId];
    const resolvedAura =
      useCustomSkin
        ? skin.auraColor
        : this.runningAuraId !== 'none'
        ? auraDef.hexColor
        : '#fbbf24';
    this.goalkeeper = createArticulatedPlayer({
      jerseyColor: useCustomSkin ? skin.jerseyColor : gk.jerseyColor,
      accentColor: useCustomSkin ? skin.accentColor : '#f8fafc',
      shortsColor: useCustomSkin ? skin.shortsColor : gk.shortsColor,
      gloveColor: useCustomSkin ? skin.gloveColor : gk.gloveColor,
      hairColor: useCustomSkin && skin.hairTint !== undefined ? skin.hairTint : gk.hairColor,
      skinColor: gk.skinColor,
      hasBeard: gk.hasBeard,
      kitPattern: useCustomSkin ? skin.kitPattern : gk.kitPattern ?? 'chevron',
      hairStyle: useCustomSkin ? skin.hairStyle : gk.hairStyle ?? 'quiff',
      hasHeadband: useCustomSkin ? skin.hasHeadband : false,
      auraColor: resolvedAura,
      numberStr: gk.numberStr,
      scale: gk.scale,
    });
    this.scene.add(this.goalkeeper.group);
    this.resetGoalkeeperPose();
  }

  private rebuildKickerModel(): void {
    if (this.kickerPlayer) {
      this.scene.remove(this.kickerPlayer.group);
      this.kickerPlayer.dispose();
      this.kickerPlayer = null;
    }

    const activeId = this.getActiveKickerId();
    const profile = KICKER_PROFILES[activeId];
    const skin = PLAYER_SKINS[this.playerSkinId];
    const useCustomSkin = this.turnRole === 'kick' && this.playerSkinId !== 'default';
    const auraDef = RUNNING_AURAS[this.runningAuraId];
    const resolvedAura =
      useCustomSkin
        ? skin.auraColor
        : this.runningAuraId !== 'none'
        ? auraDef.hexColor
        : '#34d399';
    this.kickerPlayer = createArticulatedPlayer({
      jerseyColor: useCustomSkin ? skin.jerseyColor : profile.jerseyColor,
      accentColor: useCustomSkin ? skin.accentColor : profile.jerseyAccent,
      shortsColor: useCustomSkin ? skin.shortsColor : profile.shortsColor,
      bootColor: useCustomSkin ? skin.bootColor : profile.bootColor,
      hairColor: useCustomSkin && skin.hairTint !== undefined ? skin.hairTint : profile.hairColor,
      skinColor: profile.skinColor,
      hasBeard: profile.hasBeard,
      isStar: true,
      kitPattern: useCustomSkin ? skin.kitPattern : profile.kitPattern ?? 'striped',
      hairStyle: useCustomSkin ? skin.hairStyle : profile.hairStyle ?? 'quiff',
      hasHeadband: useCustomSkin ? skin.hasHeadband : Boolean(profile.hasHeadband),
      auraColor: resolvedAura,
      numberStr: profile.numberStr,
      scale:
        activeId === 'messi' || activeId === 'yamal' || activeId === 'quang_hai'
          ? 0.96
          : activeId === 'haaland'
          ? 1.07
          : 1.02,
    });
    this.scene.add(this.kickerPlayer.group);
    this.positionKickerStance();
  }

  private rebuildTeammateModel(): void {
    if (this.teammatePlayer) {
      this.scene.remove(this.teammatePlayer.group);
      this.teammatePlayer.dispose();
      this.teammatePlayer = null;
    }

    const profile = KICKER_PROFILES[this.kickerId];
    const skin = PLAYER_SKINS[this.playerSkinId];
    const useCustomSkin = this.turnRole === 'kick' && this.playerSkinId !== 'default';
    this.teammatePlayer = createArticulatedPlayer({
      jerseyColor: useCustomSkin ? skin.jerseyColor : profile.jerseyColor,
      accentColor: useCustomSkin ? skin.accentColor : profile.jerseyAccent,
      shortsColor: useCustomSkin ? skin.shortsColor : profile.shortsColor,
      bootColor: useCustomSkin ? skin.bootColor : 0xf8fafc,
      hairColor: 0x1e1b18,
      skinColor: 0xd99b72,
      kitPattern: useCustomSkin ? skin.kitPattern : profile.kitPattern ?? 'striped',
      hairStyle: useCustomSkin ? skin.hairStyle : 'buzz',
      numberStr: '9',
      scale: 1.03,
    });
    this.teammatePlayer.group.visible = this.teammateActive;
    this.scene.add(this.teammatePlayer.group);
    this.resetTeammatePose();
  }

  private resetTeammatePose(): void {
    if (!this.teammatePlayer) return;
    this.teammatePlayer.group.visible = this.teammateActive;
    if (!this.teammateActive) return;

    this.teammatePlayer.group.position.copy(this.teammateCurrentPos);
    this.teammatePlayer.group.lookAt(this.ballStart.x * 0.35, 0, 0);
    this.teammatePlayer.bodyPivot.position.set(0, 0.92, 0);
    this.teammatePlayer.bodyPivot.rotation.set(0, 0, 0);
    this.teammatePlayer.leftLeg.rotation.set(0.12, 0, 0.08);
    this.teammatePlayer.rightLeg.rotation.set(-0.12, 0, -0.08);
    this.teammatePlayer.leftArm.rotation.set(0.15, 0, -0.22);
    this.teammatePlayer.rightArm.rotation.set(-0.15, 0, 0.22);
  }

  private positionKickerStance(): void {
    if (!this.kickerPlayer) return;
    const profile = KICKER_PROFILES[this.getActiveKickerId()];
    const isCorner =
      this.ballStart.z <= 2.4 && Math.abs(this.ballStart.x) >= 24;
    const dirToGoal = isCorner
      ? new THREE.Vector3(-this.ballStart.x, 0, 7.2 - this.ballStart.z).normalize()
      : new THREE.Vector3(-this.ballStart.x, 0, -this.ballStart.z).normalize();
    const rightPerp = new THREE.Vector3(-dirToGoal.z, 0, dirToGoal.x).normalize();

    // Stand behind and slightly opposite the kicking foot so the ball & goal remain visible
    const sideOffset = profile.foot === 'right' ? -0.95 : 0.95;
    this.kickerHomePos
      .copy(this.ballStart)
      .addScaledVector(dirToGoal, -2.05)
      .addScaledVector(rightPerp, sideOffset);
    this.kickerHomePos.y = 0;

    // Strike position right beside the ball
    const strikeSide = profile.foot === 'right' ? -0.26 : 0.26;
    this.kickerStrikePos
      .copy(this.ballStart)
      .addScaledVector(dirToGoal, -0.32)
      .addScaledVector(rightPerp, strikeSide);
    this.kickerStrikePos.y = 0;

    this.kickerCurrentPos.copy(this.kickerHomePos);
    this.kickerPlayer.group.position.copy(this.kickerCurrentPos);
    this.kickerPlayer.group.lookAt(this.ballStart.x, 0, this.ballStart.z);

    this.applyKickerSignaturePose();
  }

  private applyKickerSignaturePose(): void {
    if (!this.kickerPlayer) return;
    const k = this.kickerPlayer;
    const activeId = this.getActiveKickerId();
    k.bodyPivot.position.set(0, 0.92, 0);
    k.bodyPivot.rotation.set(0, 0, 0);
    this.kickerKickLegRot = 0;
    this.kickerSupportLegRot = 0;

    if (
      activeId === 'ronaldo' ||
      activeId === 'roberto_carlos' ||
      activeId === 'haaland' ||
      activeId === 'valverde' ||
      activeId === 'kane'
    ) {
      // Iconic wide-leg power stance
      k.leftLeg.rotation.set(0, 0, 0.26);
      k.rightLeg.rotation.set(0, 0, -0.26);
      k.leftArm.rotation.set(0.08, 0, -0.35);
      k.rightArm.rotation.set(0.08, 0, 0.35);
    } else if (
      activeId === 'messi' ||
      activeId === 'quang_hai' ||
      activeId === 'yamal' ||
      activeId === 'salah'
    ) {
      // Composed low-center left-foot stance
      k.leftLeg.rotation.set(0.18, 0, 0.08);
      k.rightLeg.rotation.set(-0.14, 0, -0.06);
      k.leftArm.rotation.set(-0.22, 0, -0.18);
      k.rightArm.rotation.set(0.15, 0, 0.22);
    } else if (
      activeId === 'beckham' ||
      activeId === 'juninho' ||
      activeId === 'pirlo'
    ) {
      // Leaning curl preparation with left balance arm raised
      k.leftLeg.rotation.set(0.14, 0, 0.14);
      k.rightLeg.rotation.set(-0.18, 0, -0.14);
      k.leftArm.rotation.set(-0.25, 0, -0.52);
      k.rightArm.rotation.set(0.2, 0, 0.24);
    } else {
      // Neymar / Mbappé / De Bruyne / Ronaldinho / Vinícius / Bellingham staggered athletic stance
      k.leftLeg.rotation.set(-0.24, 0, 0.1);
      k.rightLeg.rotation.set(0.2, 0, -0.1);
      k.leftArm.rotation.set(0.24, 0, -0.28);
      k.rightArm.rotation.set(-0.28, 0, 0.28);
    }
  }

  private prepareBotShot(): void {
    const idx =
      (this.round + this.gkSaves + (this.difficulty === 'extreme' ? 0 : 1)) %
      KICKER_ORDER.length;
    this.activeBotKickerId = KICKER_ORDER[idx];

    const openSide =
      this.scenario.wallCount > 0 ? -Math.sign(this.ballStart.x || 1) : Math.random() < 0.5 ? -1 : 1;
    const targetOpen =
      this.difficulty === 'easy'
        ? true
        : Math.random() < 0.72;
    const side = targetOpen ? openSide : -openSide;

    if (this.mode === 'penalty' || this.ballStart.z <= 12.5) {
      const targetCorner = Math.random() < 0.5 ? -1 : 1;
      const aimXRange =
        this.difficulty === 'easy'
          ? [1.1, 2.25]
          : this.difficulty === 'medium'
          ? [1.8, 2.85]
          : this.difficulty === 'pro'
          ? [2.35, 3.2]
          : [2.75, 3.38];
      const aimYRange =
        this.difficulty === 'easy'
          ? [0.45, 1.35]
          : this.difficulty === 'medium'
          ? [0.55, 1.72]
          : [0.75, 2.08];

      this.aim = {
        x: targetCorner * THREE.MathUtils.lerp(aimXRange[0], aimXRange[1], Math.random()),
        y: THREE.MathUtils.lerp(aimYRange[0], aimYRange[1], Math.random()),
      };
      this.spin = { curve: targetCorner * 0.22, dip: 0.14 };
      this.power =
        this.difficulty === 'easy'
          ? THREE.MathUtils.lerp(0.54, 0.66, Math.random())
          : this.difficulty === 'medium'
          ? THREE.MathUtils.lerp(0.65, 0.79, Math.random())
          : THREE.MathUtils.lerp(0.75, 0.9, Math.random());
      this.botPrepTimer = 1.15;
      return;
    }

    if (this.difficulty === 'easy') {
      this.aim = {
        x: side * THREE.MathUtils.lerp(1.0, 2.35, Math.random()),
        y: THREE.MathUtils.lerp(0.65, 1.65, Math.random()),
      };
      this.spin = { curve: side * 0.35, dip: 0.2 };
      this.power = THREE.MathUtils.lerp(0.55, 0.68, Math.random());
    } else if (this.difficulty === 'medium') {
      const styleRoll = Math.random();
      if (styleRoll < 0.35) {
        // Low corner driven shot under diving reach
        this.aim = {
          x: side * THREE.MathUtils.lerp(2.35, 3.12, Math.random()),
          y: THREE.MathUtils.lerp(0.32, 0.72, Math.random()),
        };
        this.spin = { curve: side * 0.55, dip: 0.12 };
        this.power = THREE.MathUtils.lerp(0.75, 0.86, Math.random());
      } else {
        this.aim = {
          x: side * THREE.MathUtils.lerp(1.85, 3.05, Math.random()),
          y: THREE.MathUtils.lerp(1.05, 2.08, Math.random()),
        };
        this.spin = { curve: side * 0.68, dip: 0.32 };
        this.power = THREE.MathUtils.lerp(0.69, 0.83, Math.random());
      }
    } else if (this.difficulty === 'pro') {
      const styleRoll = Math.random();
      if (styleRoll < 0.32) {
        // Whipped knuckleball dipper aimed away from GK stance
        const awayFromGk = this.gkHomeX >= 0 ? -1 : 1;
        this.aim = {
          x: awayFromGk * THREE.MathUtils.lerp(2.4, 3.28, Math.random()),
          y: THREE.MathUtils.lerp(1.55, 2.18, Math.random()),
        };
        this.spin = { curve: awayFromGk * 0.82, dip: 0.62 };
        this.power = THREE.MathUtils.lerp(0.81, 0.92, Math.random());
      } else if (styleRoll < 0.62) {
        // Laser bottom corner
        this.aim = {
          x: side * THREE.MathUtils.lerp(2.65, 3.3, Math.random()),
          y: THREE.MathUtils.lerp(0.28, 0.62, Math.random()),
        };
        this.spin = { curve: side * 0.65, dip: 0.1 };
        this.power = THREE.MathUtils.lerp(0.85, 0.94, Math.random());
      } else {
        this.aim = {
          x: side * THREE.MathUtils.lerp(2.35, 3.26, Math.random()),
          y: THREE.MathUtils.lerp(1.4, 2.22, Math.random()),
        };
        this.spin = { curve: side * 0.88, dip: 0.38 };
        this.power = THREE.MathUtils.lerp(0.78, 0.9, Math.random());
      }
    } else {
      // Siêu Khó Bot attacks away from player's GK positioning with extreme curl & dip
      const awayFromGk =
        Math.abs(this.gkHomeX) > 0.45 ? -Math.sign(this.gkHomeX) : side;
      const lowRocket = Math.random() < 0.35;
      this.aim = {
        x: awayFromGk * THREE.MathUtils.lerp(2.75, 3.36, Math.random()),
        y: lowRocket
          ? THREE.MathUtils.lerp(0.28, 0.58, Math.random())
          : THREE.MathUtils.lerp(1.68, 2.26, Math.random()),
      };
      this.spin = {
        curve: awayFromGk * (lowRocket ? 0.72 : 0.96),
        dip: lowRocket ? 0.14 : 0.55,
      };
      this.power = THREE.MathUtils.lerp(0.86, 0.97, Math.random());
    }

    this.botPrepTimer = 1.45;
  }

  private setupScenario(scenario: KickScenario, snapCamera = false): void {
    this.scenario = {
      ...scenario,
      wallCount: this.getEffectiveWallCount(scenario.wallCount),
      wind: this.getEffectiveWind(scenario.wind),
    };

    this.ballStart.set(
      this.scenario.ballPos.x,
      BALL_RADIUS,
      this.scenario.ballPos.z,
    );
    this.ballObj.mesh.position.copy(this.ballStart);
    this.ballObj.mesh.quaternion.identity();
    this.ballObj.shadowMesh.position.set(
      this.ballStart.x,
      0.018,
      this.ballStart.z,
    );
    this.ballObj.shadowMesh.scale.setScalar(1);
    (this.ballObj.shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;

    this.simState = null;
    this.flightElapsed = 0;
    this.runupElapsed = 0;
    this.hitWoodworkInShot = false;
    this.hitWallInShot = false;
    this.shotResolved = false;
    this.cornerAwardedInShot = null;
    this.lastOutcome = null;
    this.phase = 'aiming';
    this.gkPlan = null;
    this.gkSavedBall = false;
    this.gkDiveRoll = 0;
    this.gkDivePitch = 0;
    this.gkDiveProgress = 0;
    this.gkActiveDiveDir = 0;
    this.gkCurrentY = 0;
    this.gkCurrentBodyY = 0.92;
    this.playerGkDiveActive = false;
    this.playerGkDiveDir = 0;
    this.playerGkDiveElapsed = 0;
    this.wallJumpY = 0;
    this.wallJumpVel = 0;
    this.wallHasJumped = false;
    this.trailPoints = [];
    this.trailGeo.setFromPoints([]);
    this.replayFrames = [];
    this.goalCelebrateTimer = 0;
    this.goalIsSuper = false;
    this.gkTurfImpactDone = false;
    this.impactShakeTimer = 0;

    const isCornerSpot =
      this.ballStart.z <= 2.4 && Math.abs(this.ballStart.x) >= 24;

    // Position Goalkeeper
    this.onlineWaitingSync = false;
    this.onlineForcedGkDive = null;
    if (this.turnRole === 'gk') {
      this.gkHomeX = 0;
      if (this.mode !== 'online_duel') {
        this.prepareBotShot();
      }
    } else if (this.mode === 'impossible' || isCornerSpot) {
      this.gkHomeX = 0;
    } else if (this.scenario.wallCount > 0) {
      this.gkHomeX = THREE.MathUtils.clamp(
        Math.sign(this.scenario.ballPos.x || -1) * 1.15,
        -1.35,
        1.35,
      );
    } else {
      this.gkHomeX = 0;
    }
    this.gkCurrentX = this.gkHomeX;

    this.rebuildGoalkeeperModel();
    this.rebuildKickerModel();

    // Setup Teammate Striker (#9) on kicks >= 10.5m AND corner kicks so header & Đá Bồi always work!
    this.teammateActive =
      this.turnRole === 'kick' &&
      this.mode !== 'impossible' &&
      (this.ballStart.z >= 10.5 || isCornerSpot);
    if (this.teammateActive) {
      const openSide =
        this.scenario.wallCount > 0 ? -Math.sign(this.gkHomeX || 1) : 1;
      if (isCornerSpot) {
        const oppSide = this.ballStart.x < 0 ? 1 : -1;
        this.teammateStartPos.set(oppSide * 1.6, 0, 10.8);
        this.teammateTargetPos.set(0, 0, 5.4);
      } else if (this.ballStart.z <= 13.0) {
        // 11m Penalty: #9 waits outside the D then bursts in for Đá Bồi!
        this.teammateStartPos.set(openSide * 2.8, 0, 16.5);
        this.teammateTargetPos.set(openSide * 1.4, 0, 6.2);
      } else {
        this.teammateStartPos.set(openSide * 2.4, 0, 9.6);
        this.teammateTargetPos.set(openSide * 1.45, 0, 5.4);
      }
      this.teammateCurrentPos.copy(this.teammateStartPos);
    }
    this.teammateJumpY = 0;
    this.teammateJumpVel = 0;
    this.teammateHasJumped = false;
    this.teammateHasHeaded = false;
    this.teammateHeaderRequested = false;
    this.teammateHeaderScored = false;
    this.defendersDroppingBack = false;
    this.reboundState = 'none';
    this.reboundScoredShot = false;
    this.gkSaveCooldown = 0;
    this.resetTeammatePose();

    if (this.turnRole === 'kick') {
      if (isCornerSpot) {
        this.aim = {
          x: 0,
          y: 2.15,
          z: 7.2,
        };
        this.spin = {
          curve: this.ballStart.x < 0 ? 0.78 : -0.78,
          dip: 0.22,
        };
        this.power = 0.72;
      } else {
        // Default smart aim toward open corner around wall
        const openSide =
          this.scenario.wallCount > 0 ? -Math.sign(this.gkHomeX || 1) : 1;
        this.aim = {
          x: THREE.MathUtils.clamp(openSide * 2.15, -3.1, 3.1),
          y: this.ballStart.z <= 12.5 ? 1.45 : 1.72,
          z: 0,
        };
        this.spin = {
          curve: this.scenario.wallCount > 0 ? (openSide < 0 ? -0.45 : 0.45) : 0,
          dip: 0.24,
        };
        this.power = this.ballStart.z <= 12.5 ? 0.68 : 0.72;
      }
    }

    this.rebuildWall(this.scenario.wallCount, this.ballStart);
    this.updateAimAndPreviewVisuals();

    if (snapCamera) {
      const targetCam = this.getDesiredSetupCamera();
      this.camPos.copy(targetCam.pos);
      this.camTarget.copy(targetCam.lookAt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camTarget);
    }

    this.emitSnapshot();
  }

  private resetGoalkeeperPose(): void {
    this.goalkeeper.group.position.set(this.gkCurrentX, 0, 0.45);
    this.goalkeeper.group.rotation.set(0, 0, 0);
    this.goalkeeper.bodyPivot.position.set(0, 0.92, 0);
    this.goalkeeper.bodyPivot.rotation.set(0, 0, 0);
    this.goalkeeper.headGroup.rotation.set(0, 0, 0);
    this.goalkeeper.leftArm.rotation.set(-0.65, 0, -0.45);
    this.goalkeeper.rightArm.rotation.set(-0.65, 0, 0.45);
    this.goalkeeper.leftLeg.rotation.set(0, 0, 0.12);
    this.goalkeeper.rightLeg.rotation.set(0, 0, -0.12);
  }

  private applyGoalkeeperDivePose(
    diveDir: number,
    rollZ: number,
    pitchX: number,
    bodyY: number,
    diveProgress: number,
  ): void {
    const p = THREE.MathUtils.clamp(diveProgress, 0, 1);
    const crouch = p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0;
    const stretch = THREE.MathUtils.smoothstep(p, 0.04, 0.32);
    const plunge = THREE.MathUtils.smoothstep(p, 0.46, 0.88);
    const turfBounce =
      p > 0.56 && p < 0.84
        ? Math.sin(((p - 0.56) / 0.28) * Math.PI) * 0.075 * (1 - p * 0.35)
        : 0;
    const dir = Math.sign(diveDir);

    this.goalkeeper.bodyPivot.position.set(0, bodyY - crouch * 0.12 + turfBounce, 0);
    this.goalkeeper.bodyPivot.rotation.set(
      pitchX,
      dir !== 0 ? -dir * 0.22 * Math.sin(THREE.MathUtils.clamp(p / 0.75, 0, 1) * Math.PI) : 0,
      rollZ,
    );

    if (dir !== 0) {
      // Head stays focused upward toward the ball during the horizontal flight & landing
      this.goalkeeper.headGroup.rotation.set(
        -0.28 * stretch,
        dir * 0.18 * stretch,
        dir * 0.56 * stretch,
      );

      // Lead arm extends long & low/high to reach the corner, top arm arches above torso, then braces on turf
      const leadArmRz = dir * THREE.MathUtils.lerp(3.04, 2.58, plunge);
      const trailArmRz = -dir * THREE.MathUtils.lerp(2.74, 2.26, plunge);
      const leadArmRx = THREE.MathUtils.lerp(-0.28, 0.44, plunge);
      const trailArmRx = THREE.MathUtils.lerp(-0.46, 0.58, plunge);

      const leftTargetRx = dir < 0 ? leadArmRx : trailArmRx;
      const leftTargetRz = dir < 0 ? leadArmRz : trailArmRz;
      const rightTargetRx = dir > 0 ? leadArmRx : trailArmRx;
      const rightTargetRz = dir > 0 ? leadArmRz : trailArmRz;

      this.goalkeeper.leftArm.rotation.set(
        THREE.MathUtils.lerp(-0.65, leftTargetRx, stretch),
        0,
        THREE.MathUtils.lerp(-0.45, leftTargetRz, stretch),
      );
      this.goalkeeper.rightArm.rotation.set(
        THREE.MathUtils.lerp(-0.65, rightTargetRx, stretch),
        0,
        THREE.MathUtils.lerp(0.45, rightTargetRz, stretch),
      );

      // Explosive knee kick: lead leg snaps forward, push-off leg trails dynamically
      const leadLegRx = THREE.MathUtils.lerp(-0.44, -0.18, plunge) * stretch;
      const trailLegRx = THREE.MathUtils.lerp(0.46, 0.2, plunge) * stretch;
      this.goalkeeper.leftLeg.rotation.set(
        dir < 0 ? leadLegRx : trailLegRx,
        0,
        dir < 0 ? 0.12 : 0.24,
      );
      this.goalkeeper.rightLeg.rotation.set(
        dir > 0 ? leadLegRx : trailLegRx,
        0,
        dir > 0 ? -0.12 : -0.24,
      );
    } else {
      // Center sprawl: plunge chest-first forward onto turf while thrusting hands toward the shot
      this.goalkeeper.headGroup.rotation.set(-0.35 * stretch, 0, 0);
      const armRx = THREE.MathUtils.lerp(-1.68, -1.16, plunge);
      const armSpread = THREE.MathUtils.lerp(0.24, 0.36, plunge);
      this.goalkeeper.leftArm.rotation.set(
        THREE.MathUtils.lerp(-0.65, armRx, stretch),
        0,
        THREE.MathUtils.lerp(-0.45, -armSpread, stretch),
      );
      this.goalkeeper.rightArm.rotation.set(
        THREE.MathUtils.lerp(-0.65, armRx, stretch),
        0,
        THREE.MathUtils.lerp(0.45, armSpread, stretch),
      );
      const legTrail = THREE.MathUtils.lerp(0.32, 0.16, plunge) * stretch;
      this.goalkeeper.leftLeg.rotation.set(legTrail, 0, 0.14);
      this.goalkeeper.rightLeg.rotation.set(legTrail, 0, -0.14);
    }
  }

  private getDesiredSetupCamera(): { pos: THREE.Vector3; lookAt: THREE.Vector3 } {
    if (this.turnRole === 'gk') {
      return {
        pos: new THREE.Vector3(
          THREE.MathUtils.clamp(this.gkCurrentX * 0.28, -1.6, 1.6),
          2.12,
          -4.15,
        ),
        lookAt: new THREE.Vector3(
          this.ballStart.x * 0.42,
          1.08,
          this.ballStart.z * 0.65,
        ),
      };
    }

    const isCorner =
      this.ballStart.z <= 2.4 && Math.abs(this.ballStart.x) >= 24;
    if (isCorner && this.cameraPreset === 'kicker') {
      const sideSign = Math.sign(this.ballStart.x || -1);
      const pos = this.ballStart
        .clone()
        .add(new THREE.Vector3(sideSign * 4.4, 3.2, -3.4));
      pos.z = Math.max(0.8, pos.z);
      const lookAt = new THREE.Vector3(
        this.aim.x * 0.4,
        1.45,
        Math.max(4.5, (this.aim.z ?? 6.5) * 0.8),
      );
      return { pos, lookAt };
    }

    const dirToGoal = new THREE.Vector3(
      -this.ballStart.x,
      0,
      -this.ballStart.z,
    ).normalize();

    if (this.cameraPreset === 'broadcast') {
      return {
        pos: new THREE.Vector3(
          this.ballStart.x + (this.ballStart.x >= 0 ? 7.5 : -7.5),
          5.2,
          this.ballStart.z + 5.0,
        ),
        lookAt: new THREE.Vector3(0, 1.3, 4.0),
      };
    }

    if (this.cameraPreset === 'behind_goal') {
      return {
        pos: new THREE.Vector3(0, 3.3, -5.2),
        lookAt: new THREE.Vector3(
          this.ballStart.x * 0.5,
          1.1,
          this.ballStart.z * 0.7,
        ),
      };
    }

    // Default 'kicker' behind-the-ball camera with closer framing on 11m penalties
    const basePullBack = this.ballStart.z <= 12.5 ? 4.1 : 5.1;
    const pullBack =
      this.phase === 'charging' ? basePullBack + this.power * 0.55 : basePullBack;
    const pos = this.ballStart
      .clone()
      .addScaledVector(dirToGoal, -pullBack);
    pos.y = this.ballStart.z <= 12.5 ? 1.95 : 2.15;
    const lookAt = new THREE.Vector3(
      this.aim.x * 0.32,
      1.25,
      this.aim.z ?? 0,
    );
    return { pos, lookAt };
  }

  private updateAimAndPreviewVisuals(): void {
    const showAim =
      !this.paused &&
      this.mode !== 'match' &&
      this.turnRole === 'kick' &&
      (this.phase === 'aiming' || this.phase === 'charging');
    this.aimReticleGroup.visible = showAim;
    this.previewLine.visible = showAim;
    if (this.previewDots) this.previewDots.visible = showAim;

    if (!showAim) return;

    const aimZ = this.aim.z ?? 0;
    this.aimReticleGroup.position.set(
      this.aim.x,
      this.aim.y,
      Math.abs(aimZ) < 0.05 ? 0.05 : aimZ,
    );
    this.aimReticleGroup.lookAt(this.ballStart.x, this.aim.y, this.ballStart.z);
    const insideGoal =
      Math.abs(aimZ) <= 1.25 &&
      Math.abs(this.aim.x) < GOAL_HALF_WIDTH - 0.12 &&
      this.aim.y < GOAL_HEIGHT - 0.1;
    this.aimRingMat.color.setHex(insideGoal ? 0x34d399 : 0xfbbf24);

    const kicker = KICKER_PROFILES[this.kickerId];
    const arcPts = computePreviewArc(
      this.ballStart,
      this.aim,
      this.power,
      this.spin,
      this.scenario.wind,
      kicker,
      this.shotSkill,
    );
    this.previewLine.geometry.setFromPoints(arcPts);
    this.previewLine.computeLineDistances();

    if (this.previewDots) {
      const totalDots = 24;
      for (let i = 0; i < totalDots; i++) {
        const idx = Math.min(
          arcPts.length - 1,
          Math.floor(((i + 1) / totalDots) * (arcPts.length - 1)),
        );
        const pt = arcPts[idx] || this.ballStart;
        const s = 1 - (i / totalDots) * 0.45;
        _mat4.makeScale(s, s, s);
        _mat4.setPosition(pt.x, pt.y, pt.z);
        this.previewDots.setMatrixAt(i, _mat4);
      }
      this.previewDots.instanceMatrix.needsUpdate = true;
    }
  }

  // ---- Public API for React HUD ----

  private cleanupMatchEntities(): void {
    this.matchPlayers.forEach((p) => {
      this.scene.remove(p.mesh.group);
      p.mesh.dispose();
    });
    this.matchPlayers = [];
    this.matchPassTargetIdx = null;
    this.matchPassHoldTimer = 0;
    this.matchAdminShotTarget = null;
    this.matchAutoSwitchCooldown = 0;
    if (this.matchActiveRing) this.matchActiveRing.visible = false;
    if (this.matchCarrierRing) this.matchCarrierRing.visible = false;
  }

  private setFreeKickEntitiesVisible(visible: boolean): void {
    this.goalkeeper.group.visible = visible;
    if (this.kickerPlayer) this.kickerPlayer.group.visible = visible;
    if (this.teammatePlayer) {
      this.teammatePlayer.group.visible = visible && this.teammateActive;
    }
    this.wallPlayers.forEach((w) => {
      w.group.visible = visible;
    });
    this.boxDefenders.forEach((d) => {
      d.player.group.visible = visible && this.teammateActive;
    });
  }

  private setupMatch(snapCamera = true): void {
    this.cleanupMatchEntities();
    this.setFreeKickEntitiesVisible(false);
    this.updateAimAndPreviewVisuals();

    this.matchPlayers = createMatchSquads(
      this.scene,
      this.homeTeamId,
      this.awayTeamId,
      this.homeLineup.length >= 5 ? this.homeLineup : undefined,
      this.playerSkinId,
      this.matchFormat,
      this.runningAuraId,
    );
    this.matchKickoffTeam = 'home';
    this.matchLastTouchTeam = 'home';
    resetMatchPositions(this.matchPlayers, 'home');

    const homeKickoff =
      this.matchPlayers.find((p) => p.team === 'home' && p.role === 'fwd' && p.isStar) ??
      this.matchPlayers.find((p) => p.team === 'home' && p.role !== 'gk') ??
      this.matchPlayers[1];

    this.matchTimeSec = 0;
    this.playerGoals = 0;
    this.botGoals = 0;
    this.matchShotsHome = 0;
    this.matchShotsAway = 0;
    this.matchBallOwnerIdx = homeKickoff ? homeKickoff.index : 4;
    this.matchActiveIdx = homeKickoff ? homeKickoff.index : 4;
    this.matchBallSim = null;
    this.matchKickCooldown = 0;
    this.matchStealGraceTimer = 0;
    this.matchPassTargetIdx = null;
    this.matchPassHoldTimer = 0;
    this.matchAutoSwitchCooldown = 0;
    this.matchGoalTimer = 0;
    this.matchLastShotDist = 0;
    this.matchSprintActive = false;
    this.matchAutoAssist = false;
    this.matchClickTarget = null;
    this.isMatchPitchDragging = false;
    this.activeDribbleSkill = null;
    this.activeDribbleSkillTimer = 0;
    this.matchGoalTier = null;
    this.matchEventText = `GIAO BÓNG (${this.matchFormat.toUpperCase()}): ${TEAM_PROFILES[this.homeTeamId].shortCode} vs ${TEAM_PROFILES[this.awayTeamId].shortCode}`;
    this.matchEventTimer = 2.0;
    this.phase = 'playing';
    this.turnRole = 'kick';
    this.lastOutcome = null;
    this.trailPoints = [];
    this.trailGeo.setFromPoints([]);

    this.ballObj.mesh.position.set(0, BALL_RADIUS, PITCH_HALF_L);
    this.ballObj.shadowMesh.position.set(0, 0.018, PITCH_HALF_L);
    this.ballObj.shadowMesh.scale.setScalar(1);
    (this.ballObj.shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;

    if (snapCamera) {
      this.camPos.set(0, 12.2, PITCH_HALF_L + 18.5);
      this.camTarget.set(0, 0.8, PITCH_HALF_L - 9.0);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camTarget);
    }

    this.emitSnapshot();
  }

  public setMatchFormat(format: MatchFormat): void {
    if (this.matchFormat === format) return;
    this.matchFormat = format;
    if (this.mode === 'match') {
      this.setupMatch(true);
    } else {
      this.emitSnapshot();
    }
  }

  public setRunningAura(auraId: RunningAuraId): void {
    if (this.runningAuraId === auraId) return;
    this.runningAuraId = auraId;
    if (this.mode === 'match' && this.matchPlayers.length > 0) {
      const savedStates = this.matchPlayers.map((p) => ({
        pos: p.pos.clone(),
        vel: p.vel.clone(),
        facingYaw: p.facingYaw,
        tackleCooldown: p.tackleCooldown,
        aiActionTimer: p.aiActionTimer,
        diveTimer: p.diveTimer,
        diveDir: p.diveDir,
      }));
      this.cleanupMatchEntities();
      this.matchPlayers = createMatchSquads(
        this.scene,
        this.homeTeamId,
        this.awayTeamId,
        this.homeLineup.length >= 5 ? this.homeLineup : undefined,
        this.playerSkinId,
        this.matchFormat,
        this.runningAuraId,
      );
      this.matchPlayers.forEach((p, idx) => {
        const prev = savedStates[idx];
        if (!prev) return;
        p.pos.copy(prev.pos);
        p.vel.copy(prev.vel);
        p.facingYaw = prev.facingYaw;
        p.tackleCooldown = prev.tackleCooldown;
        p.aiActionTimer = prev.aiActionTimer;
        p.diveTimer = prev.diveTimer;
        p.diveDir = prev.diveDir;
        p.mesh.group.position.copy(p.pos);
        p.mesh.group.rotation.y = p.facingYaw;
      });
    } else {
      this.rebuildKickerModel();
      this.rebuildTeammateModel();
      this.rebuildGoalkeeperModel();
    }
    this.emitSnapshot();
  }

  public triggerMatchDribbleSkill(skill: DribbleSkillType): void {
    if (this.paused || this.mode !== 'match' || this.phase !== 'playing') return;
    const carrier =
      this.matchBallOwnerIdx !== null
        ? this.matchPlayers[this.matchBallOwnerIdx]
        : this.matchPlayers[this.matchActiveIdx];
    if (!carrier || carrier.team !== 'home' || carrier.role === 'gk') return;

    soundEngine.unlock();
    soundEngine.playSkillWhip();
    carrier.skillType = skill;
    const durationMap: Record<DribbleSkillType, number> = {
      sprint_burst: 0.42,
      roulette: 0.48,
      stepover: 0.44,
      elastico: 0.38,
      rainbow_flick: 0.52,
      maradona_spin: 0.46,
      heel_chop: 0.36,
      ball_roll_dash: 0.38,
    };
    carrier.skillTimer = durationMap[skill] ?? 0.42;
    carrier.sprintBurstTimer = Math.max(carrier.sprintBurstTimer, 0.85);
    this.activeDribbleSkill = skill;
    this.activeDribbleSkillTimer = carrier.skillTimer + 0.16;

    const fwdX = Math.sin(carrier.facingYaw);
    const fwdZ = Math.cos(carrier.facingYaw);
    const sideX = Math.cos(carrier.facingYaw);
    const sideZ = -Math.sin(carrier.facingYaw);
    const sideSign =
      skill === 'elastico' || skill === 'ball_roll_dash'
        ? 1
        : skill === 'heel_chop'
        ? -1.25
        : -0.7;
    const dashLen =
      skill === 'rainbow_flick'
        ? 2.15
        : skill === 'maradona_spin'
        ? 1.75
        : skill === 'elastico'
        ? 1.85
        : skill === 'roulette'
        ? 1.55
        : 1.4;
    carrier.pos.x = THREE.MathUtils.clamp(
      carrier.pos.x + (fwdX * dashLen + sideX * sideSign * 0.85),
      -(PITCH_HALF_W - 1.5),
      PITCH_HALF_W - 1.5,
    );
    carrier.pos.z = THREE.MathUtils.clamp(
      carrier.pos.z + (fwdZ * dashLen + sideZ * sideSign * 0.85),
      1.5,
      PITCH_LENGTH - 1.5,
    );
    carrier.vel.set(fwdX * 11.2, 0, fwdZ * 11.2);
    this.spawnTurfBurst(carrier.pos.x, 0.04, carrier.pos.z, 0.9);

    const stunRadius = skill === 'rainbow_flick' || skill === 'maradona_spin' ? 4.1 : 3.6;
    for (const p of this.matchPlayers) {
      if (p.team === 'away' && p.role !== 'gk' && p.pos.distanceTo(carrier.pos) < stunRadius) {
        p.stunTimer = 0.95;
        p.tackleCooldown = Math.max(p.tackleCooldown, 0.95);
      }
    }

    const labelMap: Record<DribbleSkillType, string> = {
      sprint_burst: `${carrier.playerName}: BỨT TỐC SIÊU THANH!`,
      roulette: `${carrier.playerName}: XOAY COMPA ROULETTE!`,
      stepover: `${carrier.playerName}: ĐẢO CHÂN STEP-OVER!`,
      elastico: `${carrier.playerName}: ELASTICO ĐỘT PHÁ!`,
      rainbow_flick: `${carrier.playerName}: TÂNG BÓNG RAINBOW FLICK!`,
      maradona_spin: `${carrier.playerName}: MARADONA SPIN 360°!`,
      heel_chop: `${carrier.playerName}: RONALDO CHOP ĐỔI HƯỚNG!`,
      ball_roll_dash: `${carrier.playerName}: KÉO GẦM GIÀY BỨT TỐC!`,
    };
    this.matchEventText = labelMap[skill];
    this.matchEventTimer = 1.15;
    this.emitSnapshot();
  }

  public triggerMatchSlideTackle(): void {
    if (this.paused || this.mode !== 'match' || this.phase !== 'playing') return;
    const active = this.matchPlayers[this.matchActiveIdx];
    if (!active || active.team !== 'home' || active.role === 'gk') return;
    if (this.matchBallOwnerIdx === active.index) {
      // Already carrying ball: trigger agile dash skill instead
      this.triggerMatchDribbleSkill('ball_roll_dash');
      return;
    }
    if (active.tackleCooldown > 0 || (active.slideTackleTimer ?? 0) > 0) return;

    soundEngine.unlock();
    soundEngine.playSlideTackle();

    const ctrl = this.getHomeControlInput();
    const bp = this.getMatchBallPosition();
    let dirX = ctrl.x;
    let dirZ = ctrl.z;
    if (Math.hypot(dirX, dirZ) < 0.2) {
      const dx = bp.x - active.pos.x;
      const dz = bp.z - active.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.2 && d < 9.5) {
        dirX = dx / d;
        dirZ = dz / d;
      } else {
        dirX = Math.sin(active.facingYaw);
        dirZ = Math.cos(active.facingYaw);
      }
    } else {
      const len = Math.hypot(dirX, dirZ);
      dirX /= len;
      dirZ /= len;
    }

    active.tackleCooldown = 0.85;
    active.slideTackleTimer = 0.56;
    active.slideDirX = dirX;
    active.slideDirZ = dirZ;
    active.facingYaw = Math.atan2(dirX, dirZ);
    active.vel.set(dirX * 13.0, 0, dirZ * 13.0);
    this.spawnTurfBurst(active.pos.x, 0.04, active.pos.z, 1.45);
    this.impactShakeTimer = 0.09;
    this.matchEventText = `${active.playerName.toUpperCase()}: SOẠT BÓNG QUYẾT LIỆT!`;
    this.matchEventTimer = 0.9;
    this.emitSnapshot();
  }

  public setFcLineup(cards: FcPlayerCard[]): void {
    this.homeLineup = cards;
    if (this.mode === 'match' && this.phase === 'playing') {
      this.setupMatch(false);
    }
  }

  public setTeams(homeTeamId: TeamId, awayTeamId: TeamId): void {
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;
    this.kickerId = TEAM_PROFILES[homeTeamId].starKickerId;
    this.gkId = TEAM_PROFILES[homeTeamId].gkId;
    this.rebuildKickerModel();
    this.rebuildTeammateModel();
    this.rebuildGoalkeeperModel();
    if (this.mode === 'match') {
      this.setupMatch(false);
    } else {
      this.emitSnapshot();
    }
  }

  public setMatchMoveInput(x: number, z: number): void {
    this.matchInputDir.x = THREE.MathUtils.clamp(x, -1, 1);
    this.matchInputDir.z = THREE.MathUtils.clamp(z, -1, 1);
    if (Math.abs(x) > 0.05 || Math.abs(z) > 0.05) {
      this.matchClickTarget = null;
    }
  }

  public setMatchSprint(active: boolean): void {
    this.matchSprintActive = active;
  }

  public setMatchAutoAssist(active: boolean): void {
    this.matchAutoAssist = active;
    if (active) {
      this.matchClickTarget = null;
    }
  }

  private getOptimalHomePlayerNearBall(excludeIdx?: number): {
    index: number;
    score: number;
  } {
    const bp = this.getMatchBallPosition();
    const vel = this.matchBallSim?.vel;
    const predX = bp.x + (vel ? THREE.MathUtils.clamp(vel.x * 0.28, -4.5, 4.5) : 0);
    const predZ = bp.z + (vel ? THREE.MathUtils.clamp(vel.z * 0.28, -4.5, 4.5) : 0);

    let bestIdx = this.matchActiveIdx;
    let bestScore = Infinity;
    for (const p of this.matchPlayers) {
      if (p.team !== 'home' || p.role === 'gk' || p.index === excludeIdx) continue;
      const dNow = Math.hypot(p.pos.x - bp.x, p.pos.z - bp.z);
      const dPred = Math.hypot(p.pos.x - predX, p.pos.z - predZ);
      const score = dPred * 0.65 + dNow * 0.35;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = p.index;
      }
    }
    return { index: bestIdx, score: bestScore };
  }

  public matchSwitchPlayer(): void {
    if (this.paused || this.mode !== 'match' || this.phase !== 'playing') return;
    this.matchPassTargetIdx = null;
    this.matchPassHoldTimer = 0;
    const optimal = this.getOptimalHomePlayerNearBall();
    if (optimal.index !== this.matchActiveIdx) {
      this.matchActiveIdx = optimal.index;
    } else {
      this.matchActiveIdx = this.getOptimalHomePlayerNearBall(this.matchActiveIdx).index;
    }
    this.matchAutoSwitchCooldown = 0.45;
  }

  public matchPass(): void {
    if (this.paused || this.mode !== 'match' || this.phase !== 'playing') return;
    if (
      this.matchBallOwnerIdx === null ||
      this.matchPlayers[this.matchBallOwnerIdx]?.team !== 'home'
    ) {
      this.matchSwitchPlayer();
      return;
    }
    soundEngine.unlock();
    this.matchAdminShotTarget = null;
    const carrier = this.matchPlayers[this.matchBallOwnerIdx];
    const moveVec = this.getHomeControlInput();
    const hasMove = Math.hypot(moveVec.x, moveVec.z) > 0.2;
    const aimDirX = hasMove ? moveVec.x : Math.sin(carrier.facingYaw);
    const aimDirZ = hasMove ? moveVec.z : Math.cos(carrier.facingYaw);

    let bestTarget: MatchPlayerAgent | null = null;
    let bestScore = -Infinity;
    for (const mate of this.matchPlayers) {
      if (mate.team !== 'home' || mate.role === 'gk' || mate.index === carrier.index) continue;
      const dx = mate.pos.x - carrier.pos.x;
      const dz = mate.pos.z - carrier.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) continue;
      const dot = (dx / dist) * aimDirX + (dz / dist) * aimDirZ;
      const score = dot * 3.0 - dist * 0.04 + (mate.pos.z < carrier.pos.z ? 0.5 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = mate;
      }
    }

    const tx = bestTarget ? bestTarget.pos.x : carrier.pos.x + aimDirX * 12;
    const tz = bestTarget ? bestTarget.pos.z : carrier.pos.z + aimDirZ * 12;
    const passDist = Math.hypot(tx - carrier.pos.x, tz - carrier.pos.z);
    const passSpeed = THREE.MathUtils.clamp(9.2 + passDist * 0.5, 11.2, 21.5);
    this.launchMatchBallTo(carrier, tx, 0.16, tz, passSpeed, 0.06, 0);
    this.matchKickCooldown = 0.16;

    if (bestTarget) {
      bestTarget.vel.set(0, 0, 0);
      bestTarget.tackleCooldown = 0;
      bestTarget.facingYaw = Math.atan2(
        carrier.pos.x - bestTarget.pos.x,
        carrier.pos.z - bestTarget.pos.z,
      );
      this.matchPassTargetIdx = bestTarget.index;
      this.matchPassHoldTimer = 2.2;
      this.matchActiveIdx = bestTarget.index;
      this.matchClickTarget = null;
    }
  }

  public matchLobPass(): void {
    if (this.paused || this.mode !== 'match' || this.phase !== 'playing') return;
    if (
      this.matchBallOwnerIdx === null ||
      this.matchPlayers[this.matchBallOwnerIdx]?.team !== 'home'
    ) {
      return;
    }
    soundEngine.unlock();
    this.matchAdminShotTarget = null;
    const carrier = this.matchPlayers[this.matchBallOwnerIdx];
    const homeOutfield = this.matchPlayers.filter((p) => p.team === 'home' && p.role !== 'gk');
    let targetMate = homeOutfield[homeOutfield.length - 1] ?? carrier;
    for (const cand of homeOutfield) {
      if (cand.index === carrier.index) continue;
      if (cand.pos.z < targetMate.pos.z || targetMate.index === carrier.index) {
        targetMate = cand;
      }
    }
    const hasMate = targetMate.index !== carrier.index;
    const tx = hasMate ? targetMate.pos.x : 0;
    const tz = hasMate ? targetMate.pos.z : Math.max(4, carrier.pos.z - 22);
    const lobDist = Math.hypot(tx - carrier.pos.x, tz - carrier.pos.z);
    const lobSpeed = THREE.MathUtils.clamp(11.0 + lobDist * 0.42, 12.8, 22.5);
    const lobLift = THREE.MathUtils.clamp(2.6 + lobDist * 0.15, 3.2, 6.2);
    this.launchMatchBallTo(carrier, tx, 0.9, tz, lobSpeed, lobLift, -12);
    this.matchKickCooldown = 0.18;

    if (hasMate) {
      targetMate.vel.set(0, 0, 0);
      targetMate.tackleCooldown = 0;
      targetMate.facingYaw = Math.atan2(
        carrier.pos.x - targetMate.pos.x,
        carrier.pos.z - targetMate.pos.z,
      );
      this.matchPassTargetIdx = targetMate.index;
      this.matchPassHoldTimer = 2.5;
      this.matchActiveIdx = targetMate.index;
      this.matchClickTarget = null;
    }
  }

  public matchShoot(): void {
    if (this.paused || this.mode !== 'match' || this.phase !== 'playing') return;
    soundEngine.unlock();
    const moveVec = this.getHomeControlInput();
    const awayGk = this.matchPlayers.find((p) => p.team === 'away' && p.role === 'gk');
    const openSide = (awayGk?.pos.x ?? 0) >= 0 ? -1 : 1;
    const aimX =
      Math.abs(moveVec.x) > 0.25
        ? THREE.MathUtils.clamp(moveVec.x * 3.1, -3.25, 3.25)
        : openSide * 2.55;
    const star = KICKER_PROFILES[TEAM_PROFILES[this.homeTeamId].starKickerId];

    if (
      this.matchBallOwnerIdx !== null &&
      this.matchPlayers[this.matchBallOwnerIdx]?.team === 'home'
    ) {
      this.matchPassTargetIdx = null;
      this.matchPassHoldTimer = 0;
      const carrier = this.matchPlayers[this.matchBallOwnerIdx];
      this.matchLastShotDist = Math.hypot(carrier.pos.x, carrier.pos.z);
      const shoMult = Math.min(1.88, 0.92 + (carrier.shoStat - 75) * 0.007);
      const skillMult =
        this.shotSkill === 'power_shot'
          ? 1.24
          : this.shotSkill === 'knuckle'
          ? 1.12
          : this.shotSkill === 'bicycle_volley'
          ? 1.1
          : this.shotSkill === 'trivela'
          ? 1.07
          : this.shotSkill === 'rabona'
          ? 1.04
          : this.shotSkill === 'chip_panenka'
          ? 0.72
          : 1.0;
      const speed =
        26.5 * shoMult * skillMult * (carrier.isStar ? Math.max(1, star.powerMult) : 0.96);
      const baseCurve = openSide * 45 * (carrier.isStar ? star.curveMult : 0.85);
      const curve =
        this.shotSkill === 'trivela' || this.shotSkill === 'rabona'
          ? -openSide * 66 * (carrier.isStar ? star.curveMult : 0.95)
          : this.shotSkill === 'curler'
          ? baseCurve * 1.32
          : this.shotSkill === 'power_shot'
          ? baseCurve * 0.35
          : this.shotSkill === 'chip_panenka'
          ? baseCurve * 0.15
          : this.shotSkill === 'knuckle'
          ? 3
          : baseCurve;
      const extraLift =
        this.shotSkill === 'chip_panenka'
          ? 6.3
          : this.shotSkill === 'bicycle_volley'
          ? 4.0
          : this.shotSkill === 'power_shot'
          ? 2.4
          : 3.4;
      const targetAimY = this.shotSkill === 'chip_panenka' ? 2.1 : 1.35;
      if (this.shotSkill === 'power_shot') {
        soundEngine.playPowerShot();
        this.impactShakeTimer = 0.16;
      }
      if (this.isAdmin) {
        const cornerSide = (awayGk?.pos.x ?? 0) >= 0 ? -1 : 1;
        const cornerX = cornerSide * (GOAL_HALF_WIDTH - 0.42);
        const cornerY = GOAL_HEIGHT - 0.36;
        this.matchAdminShotTarget = { x: cornerX, y: cornerY };
        this.launchMatchBallTo(
          carrier,
          cornerX,
          cornerY,
          0,
          Math.max(33, speed * 1.12),
          0.25,
          cornerSide * 48,
        );
      } else {
        this.matchAdminShotTarget = null;
        this.launchMatchBallTo(carrier, aimX, targetAimY, 0, speed, extraLift, curve);
        if (this.matchBallSim) {
          this.matchBallSim.skill = this.shotSkill;
        }
      }
      this.matchShotsHome += 1;
      const shotTitle =
        this.shotSkill === 'power_shot'
          ? 'ĐẠI BÁC POWER SHOT!'
          : this.shotSkill === 'bicycle_volley'
          ? 'NGẢ BÀN ĐÈN VÔ-LÊ!'
          : this.shotSkill === 'rabona'
          ? 'RABONA VẮT CHÉO!'
          : this.shotSkill === 'chip_panenka'
          ? 'LỐP BÓNG PANENKA!'
          : 'DỨT ĐIỂM!';
      this.matchEventText = `${carrier.playerName.toUpperCase()} ${shotTitle}`;
      this.matchEventTimer = 1.1;
      this.emitSnapshot();
    } else if (
      this.matchBallOwnerIdx === null &&
      this.matchBallSim &&
      this.matchBallSim.pos.y < 1.5
    ) {
      const active = this.matchPlayers[this.matchActiveIdx];
      if (
        active &&
        Math.hypot(
          this.matchBallSim.pos.x - active.pos.x,
          this.matchBallSim.pos.z - active.pos.z,
        ) < 3.2
      ) {
        this.matchPassTargetIdx = null;
        this.matchPassHoldTimer = 0;
        active.pos.set(
          this.matchBallSim.pos.x,
          0,
          this.matchBallSim.pos.z,
        );
        this.matchLastShotDist = Math.hypot(active.pos.x, active.pos.z);
        const shoMult = Math.min(1.88, 0.92 + (active.shoStat - 75) * 0.007);
        const skillMult =
          this.shotSkill === 'power_shot'
            ? 1.24
            : this.shotSkill === 'knuckle'
            ? 1.12
            : this.shotSkill === 'bicycle_volley'
            ? 1.1
            : this.shotSkill === 'trivela'
            ? 1.07
            : this.shotSkill === 'rabona'
            ? 1.04
            : this.shotSkill === 'chip_panenka'
            ? 0.72
            : 1.0;
        const speed =
          26.5 * shoMult * skillMult * (active.isStar ? Math.max(1, star.powerMult) : 0.96);
        const baseCurve = openSide * 45 * (active.isStar ? star.curveMult : 0.85);
        const curve =
          this.shotSkill === 'trivela' || this.shotSkill === 'rabona'
            ? -openSide * 66 * (active.isStar ? star.curveMult : 0.95)
            : this.shotSkill === 'curler'
            ? baseCurve * 1.32
            : this.shotSkill === 'power_shot'
            ? baseCurve * 0.35
            : this.shotSkill === 'chip_panenka'
            ? baseCurve * 0.15
            : this.shotSkill === 'knuckle'
            ? 3
            : baseCurve;
        if (this.shotSkill === 'power_shot') {
          soundEngine.playPowerShot();
          this.impactShakeTimer = 0.16;
        }
        if (this.isAdmin) {
          const cornerSide = (awayGk?.pos.x ?? 0) >= 0 ? -1 : 1;
          const cornerX = cornerSide * (GOAL_HALF_WIDTH - 0.42);
          const cornerY = GOAL_HEIGHT - 0.36;
          this.matchAdminShotTarget = { x: cornerX, y: cornerY };
          this.launchMatchBallTo(
            active,
            cornerX,
            cornerY,
            0,
            Math.max(33, speed * 1.12),
            0.25,
            cornerSide * 48,
          );
        } else {
          this.matchAdminShotTarget = null;
          this.launchMatchBallTo(
            active,
            aimX,
            this.shotSkill === 'chip_panenka' ? 2.05 : 1.35,
            0,
            speed,
            this.shotSkill === 'chip_panenka' ? 6.0 : 3.2,
            curve,
          );
          if (this.matchBallSim) {
            this.matchBallSim.skill = this.shotSkill;
          }
        }
        this.matchShotsHome += 1;
        this.matchEventText = `${active.playerName.toUpperCase()} BẮT VÔ-LÊ!`;
        this.matchEventTimer = 1.1;
        this.emitSnapshot();
        return;
      }
      if (active) {
        if (active.tackleCooldown > 0) return;
        active.tackleCooldown = 0.55;
        const bp = this.getMatchBallPosition();
        const dir = _v1.set(bp.x - active.pos.x, 0, bp.z - active.pos.z);
        const dist = dir.length();
        if (dist > 0.05) {
          dir.normalize();
          active.pos.addScaledVector(dir, Math.min(1.8, dist * 0.75));
          active.pos.x = THREE.MathUtils.clamp(active.pos.x, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
          active.pos.z = THREE.MathUtils.clamp(active.pos.z, 1.5, PITCH_LENGTH - 1.5);
          active.vel.copy(dir).multiplyScalar(9.5);
          active.facingYaw = Math.atan2(dir.x, dir.z);
        }
      }
    } else {
      // Pressing / Tackle lunge toward the ball (with cooldown & anti-spam protection)
      const active = this.matchPlayers[this.matchActiveIdx];
      if (!active || active.tackleCooldown > 0) return;
      active.tackleCooldown = 0.6;
      const bp = this.getMatchBallPosition();
      const dir = _v1.set(bp.x - active.pos.x, 0, bp.z - active.pos.z);
      const dist = dir.length();
      if (dist > 0.05) {
        dir.normalize();
        active.pos.addScaledVector(dir, Math.min(1.8, dist * 0.75));
        active.pos.x = THREE.MathUtils.clamp(active.pos.x, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
        active.pos.z = THREE.MathUtils.clamp(active.pos.z, 1.5, PITCH_LENGTH - 1.5);
        active.vel.copy(dir).multiplyScalar(9.5);
        active.facingYaw = Math.atan2(dir.x, dir.z);
      }
      if (
        this.matchBallOwnerIdx !== null &&
        this.matchPlayers[this.matchBallOwnerIdx]?.team === 'away' &&
        dist < 2.2
      ) {
        const victim = this.matchPlayers[this.matchBallOwnerIdx];
        victim.tackleCooldown = 1.45;
        const sepX = victim.pos.x - active.pos.x;
        const sepZ = victim.pos.z - active.pos.z;
        const sepLen = Math.hypot(sepX, sepZ);
        if (sepLen > 0.01) {
          victim.pos.x = THREE.MathUtils.clamp(
            victim.pos.x + (sepX / sepLen) * 1.25,
            -(PITCH_HALF_W - 1.5),
            PITCH_HALF_W - 1.5,
          );
          victim.pos.z = THREE.MathUtils.clamp(
            victim.pos.z + (sepZ / sepLen) * 1.25,
            1.5,
            PITCH_LENGTH - 1.5,
          );
        }
        this.matchBallOwnerIdx = active.index;
        this.matchLastTouchTeam = 'home';
        this.matchStealGraceTimer = 0.95;
        soundEngine.playKick(0.35);
        this.matchEventText = `${active.playerName.toUpperCase()} CƯỚP BÓNG!`;
        this.matchEventTimer = 0.9;
        this.emitSnapshot();
      }
    }
  }

  private getMatchBallPosition(): THREE.Vector3 {
    if (this.matchBallOwnerIdx !== null && this.matchPlayers[this.matchBallOwnerIdx]) {
      return this.matchPlayers[this.matchBallOwnerIdx].pos;
    }
    return this.matchBallSim ? this.matchBallSim.pos : this.ballObj.mesh.position;
  }

  private launchMatchBallTo(
    carrier: MatchPlayerAgent,
    targetX: number,
    targetY: number,
    targetZ: number,
    speed: number,
    extraLiftY: number,
    curveSpinY: number,
  ): void {
    const startPos = carrier.pos.clone();
    startPos.y = BALL_RADIUS + 0.04;
    const dx = targetX - startPos.x;
    const dz = targetZ - startPos.z;
    const horiz = Math.max(0.5, Math.hypot(dx, dz));
    const estTime = horiz / Math.max(8, speed);
    const dy = targetY - startPos.y + 0.5 * 9.81 * estTime * estTime * 0.45;
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const vel = dir.multiplyScalar(speed);
    vel.y += extraLiftY;

    this.matchBallSim = {
      pos: startPos,
      vel,
      omega: new THREE.Vector3(-12, -curveSpinY, 0),
    };
    this.matchBallOwnerIdx = null;
    this.matchLastTouchTeam = carrier.team;
    this.matchKickCooldown = 0.28;
    carrier.tackleCooldown = 0.4;
    carrier.facingYaw = Math.atan2(dx, dz);
    this.trailPoints = [startPos.clone()];
    this.spawnTurfBurst(startPos.x, 0.04, startPos.z, 0.75);
    soundEngine.playKick(Math.min(1, speed / 28));
  }

  public setImpossibleAttemptHandler(handler?: () => boolean): void {
    this.onImpossibleAttempt = handler;
  }

  public setAdmin(isAdmin: boolean): void {
    this.isAdmin = isAdmin;
    if (!isAdmin) {
      this.adminCornerTarget = null;
      this.matchAdminShotTarget = null;
    }
  }

  public setWeather(weather: WeatherType): void {
    if (this.weather === weather) return;
    this.weather = weather;
    this.applyWeatherMood();
    this.emitSnapshot();
  }

  public setLightningFlashCallback(
    cb?: (intensity: number) => void,
  ): void {
    this.onLightningFlash = cb;
  }

  public setShotSkill(skill: ShotSkillType): void {
    this.shotSkill = skill;
    const kicker = KICKER_PROFILES[this.kickerId];
    const openSign =
      this.scenario.wallCount > 0 ? (this.gkHomeX >= 0 ? -1 : 1) : -1;

    if (skill === 'curler') {
      this.spin = { curve: openSign * 0.92, dip: 0.36 };
    } else if (skill === 'trivela') {
      const trivelaSign = kicker.foot === 'left' ? -1 : 1;
      this.spin = { curve: trivelaSign * 0.96, dip: 0.32 };
    } else if (skill === 'knuckle') {
      this.spin = { curve: 0, dip: 0.16 };
    } else if (skill === 'dip_topspin') {
      this.spin = { curve: this.spin.curve * 0.4, dip: 0.88 };
    } else if (skill === 'power_shot') {
      this.spin = { curve: 0, dip: 0.24 };
    } else if (skill === 'bicycle_volley') {
      this.spin = { curve: openSign * 0.35, dip: 0.62 };
    } else if (skill === 'rabona') {
      const rabonaSign = kicker.foot === 'left' ? -1 : 1;
      this.spin = { curve: rabonaSign * 0.94, dip: 0.38 };
    } else if (skill === 'chip_panenka') {
      this.spin = { curve: 0, dip: -0.78 };
    }
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  public beginSkillCharge(skill: ShotSkillType): void {
    if (this.paused || this.phase !== 'aiming' || this.turnRole !== 'kick') {
      return;
    }
    soundEngine.unlock();
    this.setShotSkill(skill);
    this.preChargePower = this.power;
    this.phase = 'charging';
    this.power = 0.24;
    this.chargingDir = 1;
    this.chargeStartTime = performance.now();
    this.isCurveCharging = skill !== 'knuckle' && skill !== 'power_shot' && skill !== 'chip_panenka';
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  private triggerCrowdReaction(mood: 'goal' | 'miss', duration = 2.8): void {
    this.crowdMood = mood;
    this.crowdExcitement = 1.0;
    this.crowdExciteDuration = duration;
    this.crowdExciteTimer = duration;
  }

  private solveAdminTopCornerShot(
    ballStart: THREE.Vector3,
    kickerProfile: (typeof KICKER_PROFILES)[KickerId],
    wind: WindState,
    cornerSide: number,
    basePower: number,
  ): {
    aim: AimTarget;
    power: number;
    spin: SpinInput;
    targetX: number;
    targetY: number;
  } {
    const targetX = cornerSide * (GOAL_HALF_WIDTH - 0.42);
    const targetY = GOAL_HEIGHT - 0.36;
    const power = Math.max(0.78, Math.min(0.95, basePower));
    const spin: SpinInput = {
      curve: -cornerSide * 0.54,
      dip: 0.32,
    };

    let aimX = targetX;
    let aimY = targetY;
    for (let iter = 0; iter < 7; iter++) {
      const sim = computeLaunchState(
        ballStart,
        { x: aimX, y: aimY },
        power,
        spin,
        kickerProfile,
      );
      const pred = predictBallAtZ(sim, 0, wind);
      if (!pred.reached) break;
      aimX = THREE.MathUtils.clamp(aimX - (pred.x - targetX) * 0.9, -14, 14);
      aimY = THREE.MathUtils.clamp(aimY - (pred.y - targetY) * 0.9, 0.25, 8.5);
    }

    return {
      aim: { x: aimX, y: aimY },
      power,
      spin,
      targetX,
      targetY,
    };
  }

  private setupImpossibleModeState(): void {
    this.cleanupMatchEntities();
    this.setFreeKickEntitiesVisible(true);
    this.round = 1;
    this.totalRounds = 1;
    this.score = 0;
    this.streak = 0;
    this.goalsScored = 0;
    this.playerGoals = 0;
    this.botGoals = 0;
    this.gkSaves = 0;
    this.history = [];
    this.lastOutcome = null;
    this.vsBotHalf = 'player_kick';
    this.turnRole = 'kick';
    if (!this.paused) {
      soundEngine.unlock();
      soundEngine.playWhistle(false);
    }
    this.setupScenario(IMPOSSIBLE_SCENARIO, true);
  }

  private getDefaultPracticeSpot(focus: PracticeFocus): KickScenario {
    if (focus === 'penalty') {
      return PRACTICE_SPOTS.find((s) => s.id === 'spot-penalty') ?? PRACTICE_SPOTS[0];
    }
    if (focus === 'corner') {
      return (
        PRACTICE_SPOTS.find((s) => s.id === 'spot-corner-left') ??
        CORNER_SCENARIOS[0]
      );
    }
    return PRACTICE_SPOTS.find((s) => s.id === 'spot-22-left') ?? PRACTICE_SPOTS[1];
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
    if (mode === 'match') {
      if (!this.paused) {
        soundEngine.unlock();
        soundEngine.playWhistle(false);
      }
      this.setupMatch(true);
      return;
    }

    this.cleanupMatchEntities();
    this.setFreeKickEntitiesVisible(true);

    if (mode === 'online_duel') {
      this.cleanupMatchEntities();
      this.setFreeKickEntitiesVisible(true);
      this.emitSnapshot();
      return;
    }

    if (mode === 'impossible') {
      this.setupImpossibleModeState();
      return;
    }

    if (mode === 'challenge' || mode === 'vs_bot' || mode === 'penalty') {
      this.startNewChallenge(mode);
    } else if (mode === 'gk_practice') {
      this.round = 1;
      this.score = 0;
      this.streak = 0;
      this.gkSaves = 0;
      this.turnRole = 'gk';
      this.vsBotHalf = 'bot_kick';
      this.lastOutcome = null;
      if (!this.paused) {
        soundEngine.unlock();
        soundEngine.playWhistle(false);
      }
      this.setupScenario(
        this.practiceFocus === 'penalty'
          ? PENALTY_SCENARIO
          : CHALLENGE_SCENARIOS[0],
        true,
      );
    } else {
      this.round = 1;
      this.turnRole = 'kick';
      this.vsBotHalf = 'player_kick';
      this.lastOutcome = null;
      const spot = this.getDefaultPracticeSpot(this.practiceFocus);
      this.setupScenario(
        {
          ...spot,
          difficulty: this.difficulty,
        },
        true,
      );
    }
  }

  public setPracticeFocus(focus: PracticeFocus): void {
    this.practiceFocus = focus;
    if (this.mode === 'practice') {
      const spot = this.getDefaultPracticeSpot(focus);
      this.turnRole = 'kick';
      this.setupScenario({ ...spot, difficulty: this.difficulty }, true);
    } else if (this.mode === 'gk_practice') {
      this.turnRole = 'gk';
      const scenario =
        focus === 'penalty'
          ? PENALTY_SCENARIO
          : CHALLENGE_SCENARIOS[
              (this.round - 1) % CHALLENGE_SCENARIOS.length
            ];
      this.setupScenario(scenario, true);
    } else {
      this.emitSnapshot();
    }
  }

  public takeAwardedCornerKick(side: 'left' | 'right'): void {
    const spotId = side === 'left' ? 'spot-corner-left' : 'spot-corner-right';
    const found =
      PRACTICE_SPOTS.find((s) => s.id === spotId) ??
      CORNER_SCENARIOS[side === 'left' ? 0 : 1];
    this.mode = 'practice';
    this.practiceFocus = 'corner';
    this.turnRole = 'kick';
    this.paused = false;
    this.setupScenario({ ...found, difficulty: this.difficulty }, true);
    soundEngine.unlock();
    soundEngine.playWhistle(false);
  }

  public startNewChallenge(targetMode?: GameMode): void {
    const nextMode =
      targetMode ??
      (this.mode === 'match' ||
      this.mode === 'impossible' ||
      this.mode === 'vs_bot' ||
      this.mode === 'penalty' ||
      this.mode === 'gk_practice' ||
      this.mode === 'practice'
        ? this.mode
        : 'challenge');
    if (nextMode === 'impossible') {
      if (this.onImpossibleAttempt && !this.onImpossibleAttempt()) {
        return;
      }
      this.mode = 'impossible';
      this.setupImpossibleModeState();
      return;
    }
    this.mode = nextMode;
    if (nextMode === 'match') {
      if (!this.paused) {
        soundEngine.unlock();
        soundEngine.playWhistle(false);
      }
      this.setupMatch(true);
      return;
    }
    this.cleanupMatchEntities();
    this.setFreeKickEntitiesVisible(true);
    this.round = 1;
    this.totalRounds = CHALLENGE_SCENARIOS.length;
    this.score = 0;
    this.streak = 0;
    this.goalsScored = 0;
    this.playerGoals = 0;
    this.botGoals = 0;
    this.gkSaves = 0;
    this.history = [];
    this.lastOutcome = null;
    this.vsBotHalf = nextMode === 'gk_practice' ? 'bot_kick' : 'player_kick';
    this.turnRole = nextMode === 'gk_practice' ? 'gk' : 'kick';
    if (!this.paused) {
      soundEngine.unlock();
      soundEngine.playWhistle(false);
    }
    const startScenario =
      nextMode === 'penalty'
        ? PENALTY_SCENARIO
        : nextMode === 'gk_practice' && this.practiceFocus === 'penalty'
        ? PENALTY_SCENARIO
        : nextMode === 'practice'
        ? this.getDefaultPracticeSpot(this.practiceFocus)
        : CHALLENGE_SCENARIOS[0];
    this.setupScenario(startScenario, true);
  }

  public selectPracticeSpot(spotId: string): void {
    const found = PRACTICE_SPOTS.find((s) => s.id === spotId);
    if (!found) return;
    this.mode = 'practice';
    this.practiceFocus =
      spotId === 'spot-penalty'
        ? 'penalty'
        : spotId.startsWith('spot-corner')
        ? 'corner'
        : 'freekick';
    this.turnRole = 'kick';
    this.setupScenario({ ...found, difficulty: this.difficulty }, true);
  }

  public setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    if (this.mode === 'match') {
      this.emitSnapshot();
      return;
    }
    const baseScenario =
      this.mode === 'impossible'
        ? IMPOSSIBLE_SCENARIO
        : this.mode === 'penalty' ||
          (this.mode === 'gk_practice' && this.practiceFocus === 'penalty')
        ? PENALTY_SCENARIO
        : this.mode === 'challenge' ||
          this.mode === 'vs_bot' ||
          this.mode === 'gk_practice'
        ? CHALLENGE_SCENARIOS[(this.round - 1) % CHALLENGE_SCENARIOS.length]
        : PRACTICE_SPOTS.find((s) => s.id === this.scenario.id) ||
          this.getDefaultPracticeSpot(this.practiceFocus);

    if (this.phase === 'aiming') {
      this.setupScenario(baseScenario, false);
    } else {
      this.scenario = {
        ...baseScenario,
        wallCount: this.getEffectiveWallCount(baseScenario.wallCount),
        wind: this.getEffectiveWind(baseScenario.wind),
      };
      this.emitSnapshot();
    }
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    this.keys = {};
    this.isPointerAiming = false;
    this.isSwiping = false;
    this.isMatchPitchDragging = false;
    this.matchAutoAssist = false;
    this.matchClickTarget = null;
    this.updateAimAndPreviewVisuals();
  }

  public setKicker(kickerId: KickerId): void {
    if (this.kickerId === kickerId) return;
    this.kickerId = kickerId;
    this.rebuildKickerModel();
    this.rebuildTeammateModel();
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  public setGoalkeeper(gkId: GoalkeeperId): void {
    if (this.gkId === gkId) return;
    this.gkId = gkId;
    this.rebuildGoalkeeperModel();
    this.emitSnapshot();
  }

  public setPlayerSkin(skinId: PlayerSkinId): void {
    if (this.playerSkinId === skinId) return;
    this.playerSkinId = skinId;
    if (this.mode === 'match' && this.matchPlayers.length > 0) {
      const savedStates = this.matchPlayers.map((p) => ({
        pos: p.pos.clone(),
        vel: p.vel.clone(),
        facingYaw: p.facingYaw,
        tackleCooldown: p.tackleCooldown,
        aiActionTimer: p.aiActionTimer,
        diveTimer: p.diveTimer,
        diveDir: p.diveDir,
      }));
      this.cleanupMatchEntities();
      this.matchPlayers = createMatchSquads(
        this.scene,
        this.homeTeamId,
        this.awayTeamId,
        this.homeLineup.length >= 5 ? this.homeLineup : undefined,
        this.playerSkinId,
        this.matchFormat,
        this.runningAuraId,
      );
      this.matchPlayers.forEach((p, idx) => {
        const prev = savedStates[idx];
        if (!prev) return;
        p.pos.copy(prev.pos);
        p.vel.copy(prev.vel);
        p.facingYaw = prev.facingYaw;
        p.tackleCooldown = prev.tackleCooldown;
        p.aiActionTimer = prev.aiActionTimer;
        p.diveTimer = prev.diveTimer;
        p.diveDir = prev.diveDir;
        p.mesh.group.position.copy(p.pos);
        p.mesh.group.rotation.y = p.facingYaw;
      });
    } else {
      this.rebuildKickerModel();
      this.rebuildTeammateModel();
      this.rebuildGoalkeeperModel();
    }
    this.emitSnapshot();
  }

  public diveGoalkeeper(
    dir: 'left' | 'center' | 'right',
    customWorldX?: number,
    customWorldY?: number,
  ): void {
    if (this.paused || this.turnRole !== 'gk') return;
    if (
      this.phase !== 'aiming' &&
      this.phase !== 'runup' &&
      this.phase !== 'flight'
    ) {
      return;
    }
    soundEngine.unlock();

    let targetX: number;
    let targetY: number;
    if (customWorldX !== undefined) {
      targetX = THREE.MathUtils.clamp(
        customWorldX,
        -GOAL_HALF_WIDTH + 0.2,
        GOAL_HALF_WIDTH - 0.2,
      );
      targetY = THREE.MathUtils.clamp(
        customWorldY ?? 1.25,
        0.4,
        GOAL_HEIGHT - 0.15,
      );
    } else if (dir === 'left') {
      // Screen Left from behind-goal POV = +X in world space
      targetX = THREE.MathUtils.clamp(
        this.gkCurrentX + 2.4,
        -GOAL_HALF_WIDTH + 0.25,
        GOAL_HALF_WIDTH - 0.25,
      );
      targetY = 1.38;
    } else if (dir === 'right') {
      // Screen Right from behind-goal POV = -X in world space
      targetX = THREE.MathUtils.clamp(
        this.gkCurrentX - 2.4,
        -GOAL_HALF_WIDTH + 0.25,
        GOAL_HALF_WIDTH - 0.25,
      );
      targetY = 1.38;
    } else {
      targetX = this.gkCurrentX;
      targetY = 1.98;
    }

    const dx = targetX - this.gkCurrentX;
    this.playerGkDiveActive = true;
    this.playerGkDiveTargetX = targetX;
    this.playerGkDiveTargetY = targetY;
    this.playerGkDiveDir = Math.abs(dx) < 0.35 ? 0 : Math.sign(dx);
    this.playerGkDiveElapsed = 0;

    if (this.mode === 'online_duel' && this.onlineGkDiveIntercept) {
      this.onlineGkDiveIntercept({
        dir,
        targetX: customWorldX,
        targetY: customWorldY,
      });
    }

    // If user dives right as Bot is preparing, start Bot's runup immediately
    if (this.phase === 'aiming' && this.botPrepTimer > 0.1) {
      this.botPrepTimer = 0.05;
    }
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.cameraPreset = preset;
    this.camOrbitYaw = 0;
    this.camOrbitPitch = 0;
    this.camZoomMult = 1.0;
    this.emitSnapshot();
  }

  public setCameraOrbitMode(active: boolean): void {
    this.camOrbitMode = active;
    this.emitSnapshot();
  }

  public nudgeCameraOrbit(dYaw: number, dPitch: number): void {
    this.camOrbitYaw += dYaw;
    this.camOrbitPitch = THREE.MathUtils.clamp(
      this.camOrbitPitch + dPitch,
      -1.05,
      0.75,
    );
    this.emitSnapshot();
  }

  public resetCameraOrbit(): void {
    this.camOrbitYaw = 0;
    this.camOrbitPitch = 0;
    this.camZoomMult = 1.0;
    this.camOrbitMode = false;
    this.emitSnapshot();
  }

  public setSpin(spin: SpinInput): void {
    this.spin = {
      curve: THREE.MathUtils.clamp(spin.curve, -1, 1),
      dip: THREE.MathUtils.clamp(spin.dip, -1, 1),
    };
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  public setPower(power: number): void {
    this.power = THREE.MathUtils.clamp(power, 0.15, 1.0);
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  private moveAim360(dxScreenRight: number, dyUp: number): void {
    const vx = this.aim.x - this.ballStart.x;
    const vz = (this.aim.z ?? 0) - this.ballStart.z;
    const radius = Math.max(6.5, Math.min(42, Math.hypot(vx, vz)));
    // Increasing theta turns left (-X around PI); decreasing turns right (+X around PI)
    const ang = Math.atan2(vx, vz) - dxScreenRight / radius;
    this.aim.x = this.ballStart.x + Math.sin(ang) * radius;
    this.aim.z = this.ballStart.z + Math.cos(ang) * radius;
    this.aim.y = THREE.MathUtils.clamp(this.aim.y + dyUp, 0.2, 16.0);
  }

  public nudgeAim(dx: number, dy: number): void {
    if (this.paused || this.mode === 'match' || this.turnRole !== 'kick') {
      return;
    }
    this.moveAim360(dx, dy);
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  public beginCharge(): void {
    if (this.paused || this.phase !== 'aiming') return;
    soundEngine.unlock();
    this.preChargePower = this.power;
    this.phase = 'charging';
    this.power = 0.22;
    this.chargingDir = 1;
    this.chargeStartTime = performance.now();
    this.isCurveCharging = false;
    this.emitSnapshot();
  }

  public beginCurveCharge(dir?: 'left' | 'right'): void {
    if (this.paused || this.phase !== 'aiming') return;
    soundEngine.unlock();

    let sign: number;
    if (dir === 'left') {
      sign = -1;
    } else if (dir === 'right') {
      sign = 1;
    } else if (Math.abs(this.spin.curve) >= 0.2) {
      sign = Math.sign(this.spin.curve);
    } else if (this.scenario.wallCount > 0) {
      // Curl around the defensive wall toward the open corner
      sign = this.gkHomeX >= 0 ? -1 : 1;
    } else {
      sign = this.aim.x <= 0 ? -1 : 1;
    }

    this.shotSkill = 'curler';
    this.preChargePower = this.power;
    this.spin = {
      curve: sign * 0.9,
      dip: 0.36,
    };
    this.phase = 'charging';
    this.power = 0.24;
    this.chargingDir = 1;
    this.chargeStartTime = performance.now();
    this.isCurveCharging = true;
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  public beginHorizontalCurveCharge(dir: 'left' | 'right'): void {
    if (this.paused || this.phase !== 'aiming' || this.turnRole !== 'kick') {
      return;
    }
    soundEngine.unlock();
    const sign = dir === 'left' ? -1 : 1;
    this.preChargePower = this.power;
    this.spin = {
      curve: sign * 1.0,
      dip: 0.1,
    };
    this.phase = 'charging';
    this.power = 0.28;
    this.chargingDir = 1;
    this.chargeStartTime = performance.now();
    this.isCurveCharging = true;
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  private findCrossAimForTeammate(
    targetX: number,
    targetY: number,
    targetZ: number,
    power01: number,
    spin: SpinInput,
  ): AimTarget {
    const kicker = KICKER_PROFILES[this.kickerId];
    const zRatio = this.ballStart.z / Math.max(2, this.ballStart.z - targetZ);
    let aimX = THREE.MathUtils.clamp(
      this.ballStart.x + (targetX - this.ballStart.x) * zRatio,
      -5.6,
      5.6,
    );
    let aimY = 2.6;

    for (let iter = 0; iter < 7; iter++) {
      const sim = computeLaunchState(
        this.ballStart,
        { x: aimX, y: aimY },
        power01,
        spin,
        kicker,
      );
      let crossedX = sim.pos.x;
      let crossedY = sim.pos.y;
      const dt = 1 / 60;
      for (let step = 0; step < 150; step++) {
        stepBallPhysics(sim, this.scenario.wind, dt);
        if (sim.pos.z <= targetZ) {
          crossedX = sim.pos.x;
          crossedY = sim.pos.y;
          break;
        }
      }
      aimX = THREE.MathUtils.clamp(aimX - (crossedX - targetX) * 1.15, -5.6, 5.6);
      aimY = THREE.MathUtils.clamp(aimY - (crossedY - targetY) * 1.05, 0.35, 3.8);
    }

    return { x: aimX, y: aimY };
  }

  public shootCrossHeader(): void {
    if (
      this.paused ||
      this.turnRole !== 'kick' ||
      !this.teammateActive ||
      (this.phase !== 'aiming' && this.phase !== 'charging')
    ) {
      return;
    }
    soundEngine.unlock();
    this.isCurveCharging = false;
    this.teammateHeaderRequested = true;
    this.defendersDroppingBack = true;

    const openSide =
      this.scenario.wallCount > 0 ? -Math.sign(this.gkHomeX || 1) : 1;
    const crossSpin: SpinInput = {
      curve: openSide * -0.45,
      dip: -0.22,
    };
    const crossPower = 0.64;

    this.spin = crossSpin;
    this.aim = this.findCrossAimForTeammate(
      this.teammateTargetPos.x,
      2.15,
      this.teammateTargetPos.z,
      crossPower,
      crossSpin,
    );
    this.executeKick(crossPower);
  }

  public releaseChargeAndShoot(): void {
    if (this.phase !== 'charging') return;
    const heldMs = performance.now() - this.chargeStartTime;
    let shotPower = this.power;
    if (heldMs < 190) {
      shotPower = this.isCurveCharging
        ? Math.max(0.78, this.preChargePower)
        : Math.max(0.68, this.preChargePower);
    }
    this.isCurveCharging = false;
    this.executeKick(shotPower);
  }

  public quickShoot(): void {
    if (
      this.paused ||
      (this.phase !== 'aiming' && this.phase !== 'charging')
    ) {
      return;
    }
    soundEngine.unlock();
    this.isCurveCharging = false;
    this.executeKick(this.power);
  }

  public nextTurn(): void {
    if (this.mode === 'vs_bot' || this.mode === 'penalty') {
      const scenarioForRound =
        this.mode === 'penalty'
          ? PENALTY_SCENARIO
          : CHALLENGE_SCENARIOS[
              Math.min(this.round - 1, CHALLENGE_SCENARIOS.length - 1)
            ];
      if (this.vsBotHalf === 'player_kick') {
        this.vsBotHalf = 'bot_kick';
        this.turnRole = 'gk';
        this.setupScenario(scenarioForRound, true);
        soundEngine.playWhistle(false);
        return;
      }
      if (this.round >= this.totalRounds) {
        // Sudden death in Penalty shootout when tied after 5+ kicks
        if (this.mode === 'penalty' && this.playerGoals === this.botGoals) {
          this.round += 1;
          this.totalRounds = this.round;
          this.vsBotHalf = 'player_kick';
          this.turnRole = 'kick';
          this.setupScenario(PENALTY_SCENARIO, true);
          soundEngine.playWhistle(false);
          return;
        }
        this.phase = 'match_over';
        this.emitSnapshot();
        return;
      }
      this.round += 1;
      this.vsBotHalf = 'player_kick';
      this.turnRole = 'kick';
      const nextScenario =
        this.mode === 'penalty'
          ? PENALTY_SCENARIO
          : CHALLENGE_SCENARIOS[
              Math.min(this.round - 1, CHALLENGE_SCENARIOS.length - 1)
            ];
      this.setupScenario(nextScenario, true);
      soundEngine.playWhistle(false);
    } else if (this.mode === 'gk_practice') {
      this.round += 1;
      this.turnRole = 'gk';
      this.setupScenario(
        this.practiceFocus === 'penalty'
          ? PENALTY_SCENARIO
          : CHALLENGE_SCENARIOS[(this.round - 1) % CHALLENGE_SCENARIOS.length],
        false,
      );
      soundEngine.playWhistle(false);
    } else if (this.mode === 'challenge') {
      if (this.round >= this.totalRounds) {
        this.phase = 'match_over';
        this.emitSnapshot();
        return;
      }
      this.round += 1;
      this.turnRole = 'kick';
      this.setupScenario(CHALLENGE_SCENARIOS[this.round - 1], false);
      soundEngine.playWhistle(false);
    } else if (this.mode === 'impossible') {
      if (this.onImpossibleAttempt && !this.onImpossibleAttempt()) {
        return;
      }
      this.round += 1;
      this.turnRole = 'kick';
      this.setupScenario(IMPOSSIBLE_SCENARIO, false);
      soundEngine.playWhistle(false);
    } else {
      const baseSpot =
        PRACTICE_SPOTS.find((s) => s.id === this.scenario.id) ||
        this.getDefaultPracticeSpot(this.practiceFocus);
      this.turnRole = 'kick';
      this.setupScenario(baseSpot, false);
    }
  }

  public retryCurrentSpot(): void {
    if (this.mode === 'impossible') {
      if (this.onImpossibleAttempt && !this.onImpossibleAttempt()) {
        return;
      }
      this.turnRole = 'kick';
      this.setupScenario(IMPOSSIBLE_SCENARIO, false);
      return;
    }
    if (this.mode === 'penalty') {
      this.turnRole = this.vsBotHalf === 'bot_kick' ? 'gk' : 'kick';
      this.setupScenario(PENALTY_SCENARIO, false);
      return;
    }
    if (this.mode === 'gk_practice') {
      this.turnRole = 'gk';
      this.setupScenario(
        this.practiceFocus === 'penalty'
          ? PENALTY_SCENARIO
          : CHALLENGE_SCENARIOS[(this.round - 1) % CHALLENGE_SCENARIOS.length],
        false,
      );
      return;
    }
    const baseSpot =
      PRACTICE_SPOTS.find((s) => s.id === this.scenario.id) ||
      this.getDefaultPracticeSpot(this.practiceFocus);
    this.turnRole = 'kick';
    this.setupScenario(baseSpot, false);
  }

  public playReplay(): void {
    if (this.replayFrames.length < 4) return;
    this.phase = 'replay';
    this.replayTimer = 0;
    this.trailPoints = [];
    this.trailGeo.setFromPoints([]);
    this.emitSnapshot();
  }

  public toggleMute(): void {
    soundEngine.muted = !soundEngine.muted;
    this.emitSnapshot();
  }

  public setOnlineHandlers(
    handlers: {
      onShot?: (payload: {
        aim: AimTarget;
        power: number;
        spin: SpinInput;
        kickerId: KickerId;
      }) => void;
      onGkDive?: (payload: {
        dir: 'left' | 'center' | 'right';
        targetX?: number;
        targetY?: number;
      }) => void;
      onTurnFinished?: (outcome: ShotOutcome) => void;
    } | null,
  ): void {
    this.onlineShotIntercept = handlers?.onShot ?? null;
    this.onlineGkDiveIntercept = handlers?.onGkDive ?? null;
    this.onlineTurnFinishedCb = handlers?.onTurnFinished ?? null;
  }

  public startOnlineDuelTurn(opts: {
    role: TurnRole;
    scenario: KickScenario;
    kickerId: KickerId;
    gkId: GoalkeeperId;
    round: number;
    totalRounds: number;
    playerGoals: number;
    botGoals: number;
  }): void {
    this.cleanupMatchEntities();
    this.setFreeKickEntitiesVisible(true);
    this.mode = 'online_duel';
    this.paused = false;
    this.turnRole = opts.role;
    this.vsBotHalf = opts.role === 'kick' ? 'player_kick' : 'bot_kick';
    this.kickerId = opts.kickerId;
    this.activeBotKickerId = opts.kickerId;
    this.gkId = opts.gkId;
    this.round = opts.round;
    this.totalRounds = opts.totalRounds;
    this.playerGoals = opts.playerGoals;
    this.botGoals = opts.botGoals;
    this.lastOutcome = null;
    this.onlineWaitingSync = false;
    this.onlineForcedGkDive = null;
    this.setupScenario(opts.scenario, true);
  }

  public executeSyncedOnlineDuelShot(opts: {
    aim: AimTarget;
    power: number;
    spin: SpinInput;
    kickerId: KickerId;
    gkId: GoalkeeperId;
    gkDive: {
      dir: 'left' | 'center' | 'right';
      targetX?: number;
      targetY?: number;
    } | null;
  }): void {
    this.paused = false;
    this.mode = 'online_duel';
    this.kickerId = opts.kickerId;
    this.activeBotKickerId = opts.kickerId;
    this.gkId = opts.gkId;
    this.aim = { ...opts.aim };
    this.spin = { ...opts.spin };
    this.power = THREE.MathUtils.clamp(opts.power, 0.15, 1.0);
    this.pendingKickPower = this.power;
    this.onlineForcedGkDive = opts.gkDive;
    this.onlineWaitingSync = true;
    this.phase = 'runup';
    this.runupElapsed = 0;
    this.replayFrames = [];
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  private executeKick(power01: number): void {
    if (
      this.mode === 'online_duel' &&
      this.turnRole === 'kick' &&
      this.onlineShotIntercept
    ) {
      if (this.onlineWaitingSync) return;
      this.onlineWaitingSync = true;
      let clampedPower = THREE.MathUtils.clamp(power01, 0.15, 1.0);
      if (this.isAdmin) {
        const kicker = KICKER_PROFILES[this.getActiveKickerId()];
        const cornerSide =
          Math.abs(this.gkHomeX) > 0.25
            ? -Math.sign(this.gkHomeX)
            : Math.abs(this.aim.x) > 0.15
            ? Math.sign(this.aim.x)
            : 1;
        const solved = this.solveAdminTopCornerShot(
          this.ballStart,
          kicker,
          this.scenario.wind,
          cornerSide,
          clampedPower,
        );
        this.aim = solved.aim;
        this.spin = solved.spin;
        clampedPower = solved.power;
      }
      this.power = clampedPower;
      this.pendingKickPower = clampedPower;
      this.onlineShotIntercept({
        aim: { ...this.aim },
        power: clampedPower,
        spin: { ...this.spin },
        kickerId: this.kickerId,
      });
      this.emitSnapshot();
      return;
    }
    this.pendingKickPower = THREE.MathUtils.clamp(power01, 0.15, 1.0);
    this.power = this.pendingKickPower;
    this.phase = 'runup';
    this.runupElapsed = 0;
    this.replayFrames = [];
    this.updateAimAndPreviewVisuals();
    this.emitSnapshot();
  }

  private launchBallFromRunup(): void {
    const kicker = KICKER_PROFILES[this.getActiveKickerId()];
    this.adminCornerTarget = null;
    const isAdminKick =
      this.isAdmin && this.turnRole === 'kick' && this.mode !== 'online_duel';

    let adminCornerSide = 1;
    if (isAdminKick) {
      adminCornerSide =
        Math.abs(this.gkHomeX) > 0.25
          ? -Math.sign(this.gkHomeX)
          : Math.abs(this.aim.x) > 0.15
          ? Math.sign(this.aim.x)
          : 1;
      const solved = this.solveAdminTopCornerShot(
        this.ballStart,
        kicker,
        this.scenario.wind,
        adminCornerSide,
        this.pendingKickPower,
      );
      this.aim = solved.aim;
      this.spin = solved.spin;
      this.power = solved.power;
      this.pendingKickPower = solved.power;
      this.adminCornerTarget = { x: solved.targetX, y: solved.targetY };
    }

    this.simState = computeLaunchState(
      this.ballStart,
      this.aim,
      this.pendingKickPower,
      this.spin,
      kicker,
      isAdminKick ? 'normal' : this.shotSkill,
    );
    if (this.mode === 'online_duel' && this.turnRole === 'kick') {
      const gkProfile = GK_PROFILES[this.getActiveGkId()];
      const forced = this.onlineForcedGkDive ?? { dir: 'center' as const };
      let targetX = forced.targetX;
      let targetY = forced.targetY;
      if (targetX === undefined) {
        targetX =
          forced.dir === 'left'
            ? 2.35
            : forced.dir === 'right'
            ? -2.35
            : 0;
      }
      if (targetY === undefined) {
        targetY = forced.dir === 'center' ? 1.95 : 1.38;
      }
      const dx = targetX - this.gkHomeX;
      this.gkPlan = {
        diveTargetX: THREE.MathUtils.clamp(
          targetX,
          -GOAL_HALF_WIDTH + 0.25,
          GOAL_HALF_WIDTH - 0.25,
        ),
        diveTargetY: THREE.MathUtils.clamp(targetY, 0.4, GOAL_HEIGHT - 0.15),
        diveDir: Math.abs(dx) < 0.35 ? 0 : Math.sign(dx),
        reactionDelay: 0.08,
        reachRadius: 0.66 + gkProfile.reachBonus,
      };
    } else if (this.turnRole === 'kick') {
      if (isAdminKick) {
        // Dramatic GK dive that falls short of Admin's top-corner rocket
        this.gkPlan = {
          diveDir: adminCornerSide,
          diveTargetX: adminCornerSide * 1.45,
          diveTargetY: 1.08,
          reactionDelay: 0.22,
          reachRadius: 0.25,
        };
      } else if (this.mode === 'impossible') {
        const pred = predictBallAtZ(this.simState, 0.45, this.scenario.wind);
        const targetX = THREE.MathUtils.clamp(
          pred.reached ? pred.x : 0,
          -GOAL_HALF_WIDTH + 0.12,
          GOAL_HALF_WIDTH - 0.12,
        );
        const targetY = THREE.MathUtils.clamp(
          pred.reached ? pred.y : 1.25,
          0.3,
          GOAL_HEIGHT - 0.12,
        );
        const dx = targetX - this.gkHomeX;
        this.gkPlan = {
          diveDir: Math.abs(dx) < 0.2 ? 0 : Math.sign(dx),
          diveTargetX: targetX,
          diveTargetY: targetY,
          reactionDelay: 0,
          reachRadius: 1.55,
        };
      } else {
        const gkProfile = GK_PROFILES[this.getActiveGkId()];
        const basePlan = planGoalkeeperDive(
          this.simState,
          this.scenario.wind,
          this.difficulty,
          this.gkHomeX,
          kicker,
          gkProfile.diveSpeedMult,
        );
        basePlan.reachRadius += gkProfile.reachBonus;
        this.gkPlan = basePlan;
      }
    } else {
      if (this.isAdmin && !this.playerGkDiveActive) {
        // Admin Invincible Auto-GK: immediately predicts exact ball arrival & launches intercepting dive
        const pred = predictBallAtZ(this.simState, 0.45, this.scenario.wind);
        const targetX = THREE.MathUtils.clamp(
          pred.reached ? pred.x : 0,
          -GOAL_HALF_WIDTH + 0.14,
          GOAL_HALF_WIDTH - 0.14,
        );
        const targetY = THREE.MathUtils.clamp(
          pred.reached ? pred.y : 1.35,
          0.35,
          GOAL_HEIGHT - 0.12,
        );
        const dx = targetX - this.gkCurrentX;
        const diveDir = Math.abs(dx) < 0.22 ? 0 : Math.sign(dx);
        this.playerGkDiveActive = true;
        this.playerGkDiveTargetX = targetX;
        this.playerGkDiveTargetY = targetY;
        this.playerGkDiveDir = diveDir;
        this.playerGkDiveElapsed = 0;
        if (this.mode === 'online_duel' && this.onlineGkDiveIntercept) {
          const dirLabel: 'left' | 'center' | 'right' =
            diveDir > 0 ? 'left' : diveDir < 0 ? 'right' : 'center';
          this.onlineGkDiveIntercept({ dir: dirLabel, targetX, targetY });
        }
      } else if (
        this.mode === 'online_duel' &&
        !this.playerGkDiveActive &&
        this.onlineForcedGkDive
      ) {
        const forced = this.onlineForcedGkDive;
        this.playerGkDiveActive = true;
        this.playerGkDiveTargetX =
          forced.targetX ??
          (forced.dir === 'left' ? 2.35 : forced.dir === 'right' ? -2.35 : 0);
        this.playerGkDiveTargetY =
          forced.targetY ?? (forced.dir === 'center' ? 1.95 : 1.38);
        const dx = this.playerGkDiveTargetX - this.gkCurrentX;
        this.playerGkDiveDir = Math.abs(dx) < 0.35 ? 0 : Math.sign(dx);
        this.playerGkDiveElapsed = 0;
      }
      this.gkPlan = null;
    }

    this.phase = 'flight';
    this.flightElapsed = 0;
    this.gkLastRepredictTime = 0;
    this.prevBallZ = this.ballStart.z;
    this.hitWoodworkInShot = false;
    this.hitWallInShot = false;
    this.shotResolved = false;
    this.outcomeSettleTimer = 0;
    this.trailPoints = [this.ballStart.clone()];
    if (this.trailMat) {
      if (this.shotSkill === 'power_shot') {
        this.trailMat.color.setHex(0xf43f5e);
      } else if (this.shotSkill === 'bicycle_volley') {
        this.trailMat.color.setHex(0xfbbf24);
      } else if (this.shotSkill === 'rabona') {
        this.trailMat.color.setHex(0xa855f7);
      } else if (this.shotSkill === 'chip_panenka') {
        this.trailMat.color.setHex(0x38bdf8);
      } else if (this.shotSkill === 'trivela') {
        this.trailMat.color.setHex(0xe879f9);
      } else if (this.shotSkill === 'knuckle') {
        this.trailMat.color.setHex(0xf97316);
      } else if (this.shotSkill === 'dip_topspin') {
        this.trailMat.color.setHex(0x34d399);
      } else {
        const hasHeavySpin =
          this.shotSkill === 'curler' || Math.abs(this.spin.curve) > 0.45;
        this.trailMat.color.setHex(
          hasHeavySpin ? 0x38bdf8 : this.power > 0.82 ? 0xf97316 : 0xfbbf24,
        );
      }
    }

    if (this.wallPlayers.length > 0 && this.power > 0.4) {
      this.wallHasJumped = true;
      this.wallJumpVel =
        this.difficulty === 'extreme'
          ? 4.8
          : this.difficulty === 'pro'
          ? 4.1
          : this.difficulty === 'medium'
          ? 3.3
          : 2.1;
    }

    this.gkTurfImpactDone = false;
    this.impactShakeTimer =
      this.shotSkill === 'power_shot' ? 0.22 : this.power > 0.85 ? 0.14 : 0.07;
    this.spawnTurfBurst(
      this.ballStart.x,
      0.04,
      this.ballStart.z,
      this.shotSkill === 'power_shot' ? 1.85 : 0.85 + this.power * 0.65,
    );
    if (this.shotSkill === 'power_shot') {
      soundEngine.playPowerShot();
    } else {
      soundEngine.playKick(this.power);
    }
    if (this.shotSkill !== 'normal' && this.turnRole === 'kick') {
      soundEngine.playSkillWhip();
    }
    this.emitSnapshot();
  }

  private resolveShotOutcome(type: ShotOutcome['type']): void {
    if (this.shotResolved) return;
    this.shotResolved = true;
    this.outcomeSettleTimer = 0;

    const kicker = KICKER_PROFILES[this.getActiveKickerId()];
    const gkProfile = GK_PROFILES[this.getActiveGkId()];
    const initialLaunch = computeLaunchState(
      this.ballStart,
      this.aim,
      this.power,
      this.spin,
      kicker,
      this.shotSkill,
    );
    const speedKmh = Math.round(initialLaunch.vel.length() * 3.6);
    const spinRpm = Math.round(
      (Math.hypot(this.spin.curve, this.spin.dip) *
        88 *
        kicker.curveMult *
        60) /
        (2 * Math.PI),
    );

    let points = 0;
    let title = '';
    let subtitle = '';

    if (this.turnRole === 'gk') {
      // Player is defending as Goalkeeper against Bot's free kick
      if (type === 'saved') {
        this.gkSaves += 1;
        this.streak += 1;
        points = Math.round(
          (120 + this.streak * 30) *
            DIFFICULTY_LABELS[this.difficulty].scoreMult,
        );
        this.score += points;
        if (this.isAdmin) {
          title = 'ADMIN GK BẤT BẠI!';
          subtitle = `${gkProfile.shortName} tự động bay người đúng hướng bắt gọn — khung thành Admin tuyệt đối bất khả xâm phạm!`;
        } else {
          title = 'CẢN PHÁ XUẤT THẦN!';
          subtitle = `${gkProfile.shortName} bay người cứu thua ngoạn mục trước cú sút của Bot (${kicker.shortName})!`;
        }
        soundEngine.playWhistle(true);
        soundEngine.playCrowdCheer();
        this.triggerCrowdReaction('goal', 2.6);
      } else if (type === 'goal' || type === 'goal_top_corner') {
        this.botGoals += 1;
        this.streak = 0;
        soundEngine.playCrowdGasp();
        this.triggerCrowdReaction('miss', 2.4);
        title = 'BOT GHI BÀN!';
        subtitle = `Bot (${kicker.shortName}) sút hiểm hóc đánh bại ${gkProfile.shortName}.`;
      } else {
        this.streak += 1;
        points = Math.round(40 * DIFFICULTY_LABELS[this.difficulty].scoreMult);
        this.score += points;
        soundEngine.playWhistle(true);
        soundEngine.playCrowdGasp();
        this.triggerCrowdReaction('miss', 1.9);
        title =
          type === 'wall_blocked'
            ? 'HÀNG RÀO CẢN PHÁ!'
            : type === 'woodwork'
            ? 'BÓNG TRÚNG KHUNG GỖ!'
            : 'BOT SÚT RA NGOÀI!';
        subtitle = 'Khung thành giữ sạch lưới, Bot không ghi được bàn.';
      }
    } else if (type === 'goal_top_corner' || type === 'goal') {
      this.streak += 1;
      this.goalsScored += 1;
      if (this.mode === 'vs_bot' || this.mode === 'penalty') {
        this.playerGoals += 1;
      }
      const distBonus = Math.round(this.ballStart.z * 3);
      const curveBonus = Math.abs(this.spin.curve) > 0.45 ? 40 : 0;
      const skillBonus = this.shotSkill !== 'normal' ? 60 : 0;
      const cornerBonus = type === 'goal_top_corner' ? 120 : 0;
      const headerBonus = this.teammateHeaderScored ? 110 : 0;
      const reboundBonus = this.reboundScoredShot ? 135 : 0;
      const streakBonus = (this.streak - 1) * 35;
      const rawPoints =
        100 +
        distBonus +
        curveBonus +
        skillBonus +
        cornerBonus +
        headerBonus +
        reboundBonus +
        streakBonus;
      points = Math.round(rawPoints * DIFFICULTY_LABELS[this.difficulty].scoreMult);
      this.score += points;

      if (this.reboundScoredShot) {
        title = 'SIÊU PHẨM ĐÁ BỒI!';
        subtitle = `Sau pha đẩy bóng của ${gkProfile.shortName}, đồng đội #9 băng vào đá bồi tung lưới tuyệt đẹp!`;
      } else if (this.teammateHeaderScored) {
        title = 'SIÊU PHẨM ĐÁNH ĐẦU!';
        subtitle = `Đường treo bóng chuẩn xác cho đồng đội #9 bật cao đánh đầu tung lưới ${gkProfile.shortName}!`;
      } else if (this.shotSkill === 'power_shot') {
        title = 'ĐẠI BÁC POWER SHOT!';
        subtitle = `${kicker.shortName} tung cú nã đại bác sấm sét xé toạc không khí hạ gục ${gkProfile.shortName}!`;
      } else if (this.shotSkill === 'bicycle_volley') {
        title = 'SIÊU PHẨM NGẢ BÀN ĐÈN!';
        subtitle = `${kicker.shortName} tung người móc bóng ngoạn mục vẽ cầu vồng đánh bại ${gkProfile.shortName}!`;
      } else if (this.shotSkill === 'rabona') {
        title = 'SIÊU PHẨM RABONA NGHỆ SĨ!';
        subtitle = `${kicker.shortName} vắt chéo chân Rabona xoáy hiểm hóc khiến ${gkProfile.shortName} bó tay!`;
      } else if (this.shotSkill === 'chip_panenka') {
        title = 'TUYỆT KỸ LỐP BÓNG PANENKA!';
        subtitle = `${kicker.shortName} gẩy bóng tinh tế qua đầu ${gkProfile.shortName} đầy ngẫu hứng!`;
      } else if (this.shotSkill === 'trivela') {
        title = 'SIÊU PHẨM TRIVELA MÁ NGOÀI!';
        subtitle = `${kicker.shortName} vẩy má ngoài cực dị vẽ đường cong xé lưới ${gkProfile.shortName}!`;
      } else if (this.shotSkill === 'knuckle') {
        title = 'KNUCKLEBALL BÓNG LẮC!';
        subtitle = `Cú sút mu chính diện khiến bóng lắc lư không thể bắt bài trước ${gkProfile.shortName}!`;
      } else if (this.shotSkill === 'dip_topspin') {
        title = 'TOPSPIN CHÚI BỔNG CỰC GẮT!';
        subtitle = `${kicker.shortName} đưa bóng vọt qua hàng rào rồi chúi thẳng vào lưới ${gkProfile.shortName}!`;
      } else if (this.shotSkill === 'curler') {
        title = 'SIÊU PHẨM SÚT XOÁY CỨA LÒNG!';
        subtitle = `${kicker.shortName} cứa lòng xoáy gắt đánh bại ${gkProfile.shortName}.`;
      } else if (type === 'goal_top_corner') {
        title = 'SIÊU PHẨM GÓC CHẾT!';
        subtitle = `${kicker.shortName} găm bóng thẳng vào góc chữ A đánh bại ${gkProfile.shortName}.`;
      } else {
        title = 'VÀO!';
        subtitle = this.hitWoodworkInShot
          ? `${kicker.shortName} sút đập khung gỗ bay vào lưới!`
          : `Cú dứt điểm chuẩn xác của ${kicker.shortName} đánh bại ${gkProfile.shortName}.`;
      }

      const isSuperGoal =
        type === 'goal_top_corner' ||
        this.teammateHeaderScored ||
        this.reboundScoredShot ||
        this.hitWoodworkInShot;
      soundEngine.playWhistle(true);
      soundEngine.playCrowdCheer();
      soundEngine.playGoalCelebration(isSuperGoal);
      this.triggerCrowdReaction('goal', 3.2);
      if (this.simState) {
        this.triggerConfetti(this.simState.pos.x, this.simState.pos.y, isSuperGoal, 0);
      }
    } else {
      this.streak = 0;
      soundEngine.playCrowdGasp();
      this.triggerCrowdReaction('miss', 2.4);
      if (type === 'saved') {
        if (this.mode === 'impossible') {
          title = 'KHÔNG THỂ GHI BÀN!';
          subtitle = `Siêu Thủ Môn ${gkProfile.shortName} đã bay người cản phá tuyệt đối! Khung thành 1 Tỷ Xu bất khả xâm phạm.`;
        } else {
          title = `${gkProfile.shortName.toUpperCase()} CẢN PHÁ!`;
          subtitle = `Pha bay người cứu thua xuất thần của ${gkProfile.shortName}.`;
        }
      } else if (type === 'wall_blocked') {
        title = 'CHẠM HÀNG RÀO';
        subtitle = 'Hãy tăng lực sút hoặc xoáy bóng vòng qua hàng rào.';
      } else if (type === 'woodwork') {
        title = 'TRÚNG KHUNG GỖ!';
        subtitle = 'Quá đáng tiếc, bóng dội xà ngang / cột dọc ra ngoài.';
      } else {
        title = 'RA NGOÀI';
        subtitle = 'Bóng đi chệch khung thành. Điều chỉnh lại điểm ngắm.';
      }
    }

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
      } catch {
        // ignore storage errors
      }
    }

    if (this.cornerAwardedInShot && type === 'saved') {
      subtitle += ' Bóng xoáy hết biên ngang — được hưởng PHẠT GÓC!';
    }

    this.lastOutcome = {
      type,
      title,
      subtitle,
      points,
      speedKmh,
      spinRpm,
      hitWoodwork: this.hitWoodworkInShot,
      isHeader: this.teammateHeaderScored,
      isRebound: this.reboundScoredShot,
      cornerAwarded: type === 'saved' ? this.cornerAwardedInShot : null,
    };

    if (
      this.mode === 'challenge' ||
      this.mode === 'vs_bot' ||
      this.mode === 'penalty'
    ) {
      this.history.push({
        round: this.round,
        scenarioLabel: this.scenario.label,
        role: this.turnRole,
        outcome: type,
        points,
        speedKmh,
        isHeader: this.teammateHeaderScored,
        isRebound: this.reboundScoredShot,
      });
    }
  }

  private emitSnapshot(): void {
    const owner =
      this.matchBallOwnerIdx !== null
        ? this.matchPlayers[this.matchBallOwnerIdx]
        : null;
    const matchPossession: 'home' | 'away' | 'loose' = owner
      ? owner.team
      : 'loose';

    this.onStateChange({
      mode: this.mode,
      practiceFocus: this.practiceFocus,
      phase: this.phase,
      turnRole: this.turnRole,
      vsBotHalf: this.vsBotHalf,
      difficulty: this.difficulty,
      kickerId: this.kickerId,
      gkId: this.gkId,
      playerSkinId: this.playerSkinId,
      activeBotKickerId: this.activeBotKickerId,
      cameraPreset: this.cameraPreset,
      scenario: this.scenario,
      round: this.round,
      totalRounds: this.totalRounds,
      score: this.score,
      bestScore: this.bestScore,
      streak: this.streak,
      goalsScored: this.goalsScored,
      playerGoals: this.playerGoals,
      botGoals: this.botGoals,
      gkSaves: this.gkSaves,
      homeTeamId: this.homeTeamId,
      awayTeamId: this.awayTeamId,
      matchFormat: this.matchFormat,
      runningAuraId: this.runningAuraId,
      activeDribbleSkill: this.activeDribbleSkill,
      matchTimeSec: this.matchTimeSec,
      matchDurationSec: this.matchDurationSec,
      matchPossession,
      matchEventText: this.matchEventText,
      matchShotsHome: this.matchShotsHome,
      matchShotsAway: this.matchShotsAway,
      matchGoalSeq: this.matchGoalSeq,
      matchGoalTier: this.matchGoalTier,
      power: this.power,
      spin: { ...this.spin },
      shotSkill: this.shotSkill,
      weather: this.weather,
      aim: { ...this.aim },
      lastOutcome: this.lastOutcome,
      history: [...this.history],
      muted: soundEngine.muted,
      hasReplay: this.replayFrames.length > 5,
      cameraOrbitMode: this.camOrbitMode,
      cameraHasCustomOrbit:
        Math.abs(this.camOrbitYaw) > 0.02 ||
        Math.abs(this.camOrbitPitch) > 0.02 ||
        Math.abs(this.camZoomMult - 1) > 0.02,
    });
  }

  // ---- Pointer & Keyboard Interaction ----

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    const handleResize = () => {
      if (this.disposed) return;
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      this.onContextLostChange?.(true);
    };

    const handleContextRestored = () => {
      this.onContextLostChange?.(false);
    };

    const updateAimFromPointer = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, this.camera);

      // Prefer goal plane only when pointing at/near goal front from in front of goal line
      if (
        _raycaster.ray.intersectPlane(_goalPlane, _v1) &&
        Math.abs(_v1.x) <= 13.5 &&
        _v1.y >= 0.15 &&
        _v1.y <= 9.5 &&
        this.camera.position.z > 1
      ) {
        this.aim.x = _v1.x;
        this.aim.y = _v1.y;
        this.aim.z = 0;
        this.updateAimAndPreviewVisuals();
        return;
      }

      // Full 360-degree pitch/sphere aiming around the ball
      if (_raycaster.ray.intersectPlane(_pitchPlane, _v1)) {
        const dx = _v1.x - this.ballStart.x;
        const dz = _v1.z - this.ballStart.z;
        const rawDist = Math.hypot(dx, dz);
        if (rawDist > 0.4) {
          const clampedDist = THREE.MathUtils.clamp(rawDist, 4.0, 42.0);
          this.aim.x = this.ballStart.x + (dx / rawDist) * clampedDist;
          this.aim.z = this.ballStart.z + (dz / rawDist) * clampedDist;
          this.aim.y = THREE.MathUtils.clamp(
            1.45 + Math.max(-0.4, _ndc.y) * 3.8,
            0.25,
            12.0,
          );
          this.updateAimAndPreviewVisuals();
          return;
        }
      }

      // Fallback sky ray projection in any 360 direction
      _v1.copy(this.ballStart).addScaledVector(_raycaster.ray.direction, 22);
      this.aim.x = THREE.MathUtils.clamp(_v1.x, -42, 42);
      this.aim.z = THREE.MathUtils.clamp(_v1.z, -24, PITCH_LENGTH);
      this.aim.y = THREE.MathUtils.clamp(_v1.y, 0.25, 15.0);
      this.updateAimAndPreviewVisuals();
    };

    const getGkPlaneHit = (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = dom.getBoundingClientRect();
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, this.camera);
      return _raycaster.ray.intersectPlane(_gkPlane, _v1) ? _v1 : null;
    };

    const updateMatchClickTarget = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_ndc, this.camera);
      if (_raycaster.ray.intersectPlane(_pitchPlane, _v1)) {
        this.matchClickTarget = {
          x: THREE.MathUtils.clamp(_v1.x, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5),
          z: THREE.MathUtils.clamp(_v1.z, 1.5, PITCH_LENGTH - 1.5),
        };
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlock();
      this.container.focus({ preventScroll: true });
      if (this.paused) return;

      // Free 360-degree camera orbit: Right-drag, Middle-drag, Alt+Left-drag, or Orbit Toggle active
      if (e.button === 2 || e.button === 1 || e.altKey || this.camOrbitMode) {
        e.preventDefault();
        this.isOrbitDragging = true;
        this.orbitLastPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      if (this.mode === 'match') {
        if (this.phase === 'playing') {
          this.isMatchPitchDragging = true;
          updateMatchClickTarget(e.clientX, e.clientY);
        }
        return;
      }

      if (this.turnRole === 'gk') {
        const hit = getGkPlaneHit(e.clientX, e.clientY);
        if (this.phase === 'runup' || this.phase === 'flight') {
          if (hit) {
            this.diveGoalkeeper('center', hit.x, hit.y);
          } else {
            const rect = dom.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            this.diveGoalkeeper(relX < 0.38 ? 'left' : relX > 0.62 ? 'right' : 'center');
          }
        } else if (this.phase === 'aiming') {
          this.isPointerAiming = true;
          if (hit) {
            this.gkHomeX = THREE.MathUtils.clamp(hit.x, -3.1, 3.1);
            this.gkCurrentX = this.gkHomeX;
            this.goalkeeper.group.position.x = this.gkCurrentX;
          }
        }
        return;
      }

      if (this.phase !== 'aiming') return;

      const rect = dom.getBoundingClientRect();
      const relY = (e.clientY - rect.top) / rect.height;

      // Lower 32% of screen near ball starts a swipe-to-kick gesture
      if (relY > 0.68) {
        this.isSwiping = true;
        this.swipeStart = { x: e.clientX, y: e.clientY, time: performance.now() };
        this.swipeCurrent = { x: e.clientX, y: e.clientY };
      } else {
        this.isPointerAiming = true;
        updateAimFromPointer(e.clientX, e.clientY);
        this.emitSnapshot();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.paused) return;
      if (this.isOrbitDragging) {
        const dx = e.clientX - this.orbitLastPointer.x;
        const dy = e.clientY - this.orbitLastPointer.y;
        this.orbitLastPointer = { x: e.clientX, y: e.clientY };
        this.camOrbitYaw -= dx * 0.0068;
        this.camOrbitPitch = THREE.MathUtils.clamp(
          this.camOrbitPitch - dy * 0.0052,
          -1.05,
          0.75,
        );
        return;
      }
      if (this.mode === 'match') {
        if (this.isMatchPitchDragging && this.phase === 'playing') {
          updateMatchClickTarget(e.clientX, e.clientY);
        }
        return;
      }
      if (this.phase !== 'aiming') return;
      if (this.turnRole === 'gk') {
        if (this.isPointerAiming) {
          const hit = getGkPlaneHit(e.clientX, e.clientY);
          if (hit) {
            this.gkHomeX = THREE.MathUtils.clamp(hit.x, -3.1, 3.1);
            this.gkCurrentX = this.gkHomeX;
            this.goalkeeper.group.position.x = this.gkCurrentX;
          }
        }
        return;
      }
      if (this.isSwiping) {
        this.swipeCurrent = { x: e.clientX, y: e.clientY };
      } else if (this.isPointerAiming) {
        updateAimFromPointer(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      this.isMatchPitchDragging = false;
      if (this.isOrbitDragging) {
        this.isOrbitDragging = false;
        this.emitSnapshot();
        return;
      }
      if (this.paused) return;
      if (this.isSwiping && this.phase === 'aiming' && this.turnRole === 'kick') {
        const dy = this.swipeStart.y - e.clientY;
        const dx = e.clientX - this.swipeStart.x;
        const dtMs = Math.max(40, performance.now() - this.swipeStart.time);
        this.isSwiping = false;

        if (dy > 38) {
          // Swipe upward launches immediate shot along current 360° direction!
          const swipeSpeed = Math.hypot(dx, dy) / dtMs;
          const power = THREE.MathUtils.clamp(0.32 + swipeSpeed * 0.45, 0.35, 0.98);
          const rect = dom.getBoundingClientRect();
          this.moveAim360((dx / rect.width) * 9.0, (dy / rect.height) * 2.4 - 0.8);
          this.executeKick(power);
          return;
        }
      }

      if (this.isPointerAiming) {
        this.isPointerAiming = false;
        this.emitSnapshot();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (this.paused) return;
      e.preventDefault();
      this.camZoomMult = THREE.MathUtils.clamp(
        this.camZoomMult * (1 + Math.sign(e.deltaY) * 0.08),
        0.45,
        2.2,
      );
      this.emitSnapshot();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const resolveKeyCodes = (e: KeyboardEvent): string[] => {
      const codes: string[] = [];
      if (e.code) codes.push(e.code);
      const k = (e.key || '').toLowerCase();
      if (k === 'w' || k === 'ư' || k === 'arrowup') codes.push('KeyW');
      else if (k === 's' || k === 'arrowdown') codes.push('KeyS');
      else if (k === 'a' || k === 'ă' || k === 'â' || k === 'arrowleft')
        codes.push('KeyA');
      else if (k === 'd' || k === 'đ' || k === 'arrowright') codes.push('KeyD');
      else if (k === ' ' || k === 'spacebar') codes.push('Space');
      else if (k === 'enter') codes.push('Enter');
      else if (k === 'j') codes.push('KeyJ');
      else if (k === 'k') codes.push('KeyK');
      else if (k === 'q') codes.push('KeyQ');
      else if (k === 'e' || k === 'ê') codes.push('KeyE');
      else if (k === 'c') codes.push('KeyC');
      else if (k === 't') codes.push('KeyT');
      else if (k === 'b') codes.push('KeyB');
      else if (k === 'r') codes.push('KeyR');
      else if (k === 'v') codes.push('KeyV');
      else if (k === 'f') codes.push('KeyF');
      else if (k === 'x') codes.push('KeyX');
      else if (k === '1') codes.push('Digit1');
      else if (k === '2') codes.push('Digit2');
      else if (k === '3') codes.push('Digit3');
      else if (k === '4') codes.push('Digit4');
      else if (k === '5') codes.push('Digit5');
      else if (k === '6') codes.push('Digit6');
      else if (k === '7') codes.push('Digit7');
      else if (k === 'shift') codes.push('ShiftLeft');
      return Array.from(new Set(codes));
    };

    const isTextOrSelectTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.paused) return;
      if (isTextOrSelectTarget(e.target)) return;

      const mapped = resolveKeyCodes(e);
      for (const c of mapped) {
        this.keys[c] = true;
      }

      if (
        mapped.some((c) =>
          [
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Space',
            'Tab',
          ].includes(c),
        )
      ) {
        e.preventDefault();
      }

      if (this.mode === 'match') {
        if (!e.repeat && mapped.includes('KeyV')) {
          e.preventDefault();
          const order: CameraPreset[] = ['kicker', 'broadcast', 'behind_goal'];
          const next = order[(order.indexOf(this.cameraPreset) + 1) % order.length];
          this.setCameraPreset(next);
          return;
        }
        if (this.phase === 'playing' && !e.repeat) {
          if (mapped.includes('Space') || mapped.includes('Enter')) {
            e.preventDefault();
            this.matchShoot();
          } else if (mapped.includes('KeyX')) {
            e.preventDefault();
            this.triggerMatchSlideTackle();
          } else if (mapped.includes('KeyJ') || mapped.includes('KeyC')) {
            e.preventDefault();
            this.matchPass();
          } else if (mapped.includes('KeyK') || mapped.includes('KeyE')) {
            e.preventDefault();
            this.matchLobPass();
          } else if (mapped.includes('KeyQ') || mapped.includes('Tab')) {
            e.preventDefault();
            this.matchSwitchPlayer();
          } else if (mapped.includes('Digit1')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('stepover');
          } else if (mapped.includes('Digit2')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('roulette');
          } else if (mapped.includes('Digit3')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('elastico');
          } else if (mapped.includes('Digit4')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('rainbow_flick');
          } else if (mapped.includes('Digit5')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('maradona_spin');
          } else if (mapped.includes('Digit6')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('heel_chop');
          } else if (mapped.includes('Digit7')) {
            e.preventDefault();
            this.triggerMatchDribbleSkill('ball_roll_dash');
          } else if (mapped.includes('KeyF')) {
            e.preventDefault();
            const active = this.matchPlayers[this.matchActiveIdx];
            if (active && active.team === 'home') {
              active.sprintBurstTimer = 1.6;
              this.matchEventText = `${active.playerName.toUpperCase()} BỨT TỐC!`;
              this.matchEventTimer = 0.85;
              this.emitSnapshot();
            }
          }
        }
        return;
      }

      if (this.turnRole === 'gk') {
        if (
          this.phase === 'result' &&
          (mapped.includes('Space') || mapped.includes('Enter')) &&
          !e.repeat
        ) {
          e.preventDefault();
          this.nextTurn();
          return;
        }
        if (this.phase === 'result' && mapped.includes('KeyR')) {
          this.playReplay();
          return;
        }
        if (
          (this.phase === 'runup' || this.phase === 'flight') &&
          !e.repeat
        ) {
          if (
            mapped.includes('ArrowLeft') ||
            mapped.includes('KeyA') ||
            mapped.includes('KeyQ')
          ) {
            e.preventDefault();
            this.diveGoalkeeper('left');
          } else if (
            mapped.includes('ArrowRight') ||
            mapped.includes('KeyD') ||
            mapped.includes('KeyE')
          ) {
            e.preventDefault();
            this.diveGoalkeeper('right');
          } else if (
            mapped.includes('Space') ||
            mapped.includes('ArrowUp') ||
            mapped.includes('KeyW')
          ) {
            e.preventDefault();
            this.diveGoalkeeper('center');
          }
        }
        return;
      }

      if (mapped.includes('Space')) {
        e.preventDefault();
        if (this.phase === 'aiming' && !e.repeat) {
          this.beginCharge();
        } else if (this.phase === 'result' && !e.repeat) {
          this.nextTurn();
        }
      } else if (mapped.includes('Enter')) {
        e.preventDefault();
        if (this.phase === 'aiming' && !e.repeat) {
          this.quickShoot();
        } else if (this.phase === 'result' && !e.repeat) {
          this.nextTurn();
        }
      } else if (mapped.includes('KeyC')) {
        e.preventDefault();
        if (this.phase === 'aiming' && !e.repeat) {
          this.beginCurveCharge();
        }
      } else if (mapped.includes('KeyT')) {
        e.preventDefault();
        if (this.phase === 'aiming' && !e.repeat) {
          this.beginSkillCharge('trivela');
        }
      } else if (mapped.includes('KeyB')) {
        e.preventDefault();
        if (this.phase === 'aiming' && !e.repeat) {
          this.beginSkillCharge('knuckle');
        }
      } else if (mapped.includes('KeyR') && this.phase === 'result') {
        this.playReplay();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = resolveKeyCodes(e);
      for (const c of mapped) {
        this.keys[c] = false;
      }
      if (e.code) this.keys[e.code] = false;
      if (this.paused) return;
      if (
        this.turnRole === 'kick' &&
        (mapped.includes('Space') ||
          mapped.includes('KeyC') ||
          mapped.includes('KeyT') ||
          mapped.includes('KeyB')) &&
        this.phase === 'charging'
      ) {
        e.preventDefault();
        this.releaseChargeAndShoot();
      }
    };

    const clearKeys = () => {
      this.keys = {};
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', clearKeys);
    dom.addEventListener('webglcontextlost', handleContextLost);
    dom.addEventListener('webglcontextrestored', handleContextRestored);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    this.extraDisposables.push({
      dispose: () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('blur', clearKeys);
        dom.removeEventListener('webglcontextlost', handleContextLost);
        dom.removeEventListener('webglcontextrestored', handleContextRestored);
        dom.removeEventListener('pointerdown', onPointerDown);
        dom.removeEventListener('wheel', onWheel);
        dom.removeEventListener('contextmenu', onContextMenu);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
      },
    });
  }

  // ---- Main Simulation & Render Loop ----

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.elapsedTotal += dt;

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.ALREADY_SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private getHomeControlInput(): { x: number; z: number } {
    let x = this.matchInputDir.x;
    let z = this.matchInputDir.z;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) x -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) x += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) z -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) z += 1;
    const len = Math.hypot(x, z);
    if (len > 0.05) {
      this.matchClickTarget = null;
      if (len > 1) {
        x /= len;
        z /= len;
      }
      return { x, z };
    }

    const active = this.matchPlayers[this.matchActiveIdx];
    if (!active) return { x: 0, z: 0 };

    if (this.matchAutoAssist) {
      const hasBall = this.matchBallOwnerIdx === active.index;
      const tx = hasBall ? 0 : this.getMatchBallPosition().x;
      const tz = hasBall ? 8 : this.getMatchBallPosition().z;
      const dx = tx - active.pos.x;
      const dz = tz - active.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.4) {
        return { x: dx / d, z: dz / d };
      }
      return { x: 0, z: 0 };
    }

    if (this.matchClickTarget) {
      const dx = this.matchClickTarget.x - active.pos.x;
      const dz = this.matchClickTarget.z - active.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.55) {
        this.matchClickTarget = null;
        return { x: 0, z: 0 };
      }
      return { x: dx / d, z: dz / d };
    }

    return { x: 0, z: 0 };
  }

  private updateCornerFlags(): void {
    if (!this.stadium.flagCloths) return;
    for (let i = 0; i < this.stadium.flagCloths.length; i++) {
      const cloth = this.stadium.flagCloths[i];
      cloth.rotation.y =
        Math.sin(this.elapsedTotal * 5.2 + i * 1.4) * 0.28 +
        this.effectiveWind.x * 0.14;
    }
  }

  private updateMatch(dt: number): void {
    this.stadium.net.update(dt);
    this.stadium.netSouth.update(dt);
    this.updateCrowd(dt);
    this.updateCornerFlags();
    this.updateConfetti(dt);
    this.updateWeather(dt);
    this.updateCamera(dt);

    if (this.paused || this.matchPlayers.length === 0) return;

    if (this.matchEventTimer > 0) {
      this.matchEventTimer -= dt;
      if (this.matchEventTimer <= 0) {
        this.matchEventText = null;
        this.emitSnapshot();
      }
    }

    if (this.phase === 'match_goal') {
      if (this.matchBallSim) {
        stepBallPhysics(this.matchBallSim, { x: 0, z: 0 }, dt);
        this.ballObj.mesh.position.copy(this.matchBallSim.pos);
        this.ballObj.shadowMesh.position.set(
          this.matchBallSim.pos.x,
          0.018,
          this.matchBallSim.pos.z,
        );
      }
      // Animate Home scorer celebrating!
      const fallbackHomeScorer = this.matchPlayers.find(
        (p) => p.team === 'home' && p.role !== 'gk',
      );
      const scorer = this.matchPlayers[this.matchActiveIdx] ?? fallbackHomeScorer;
      if (scorer && this.matchGoalTier) {
        const hop = Math.abs(Math.sin(this.elapsedTotal * 7.5)) * 0.24;
        scorer.mesh.bodyPivot.position.y = 0.92 + hop;
        scorer.mesh.leftArm.rotation.set(-0.35, 0, -2.35);
        scorer.mesh.rightArm.rotation.set(-0.35, 0, 2.35);
        scorer.mesh.leftLeg.rotation.set(-hop * 0.8, 0, 0.12);
        scorer.mesh.rightLeg.rotation.set(-hop * 0.8, 0, -0.12);
      }
      this.matchGoalTimer -= dt;
      if (this.matchGoalTimer <= 0) {
        resetMatchPositions(this.matchPlayers, this.matchKickoffTeam);
        const homeKick =
          this.matchPlayers.find((p) => p.team === 'home' && p.role === 'fwd' && p.isStar) ??
          this.matchPlayers.find((p) => p.team === 'home' && p.role !== 'gk');
        const awayKick =
          this.matchPlayers.find((p) => p.team === 'away' && p.role === 'fwd' && p.isStar) ??
          this.matchPlayers.find((p) => p.team === 'away' && p.role !== 'gk');
        this.matchBallOwnerIdx =
          this.matchKickoffTeam === 'home'
            ? homeKick?.index ?? 1
            : awayKick?.index ?? 6;
        this.matchActiveIdx = homeKick?.index ?? 1;
        this.matchBallSim = null;
        this.matchKickCooldown = 0.25;
        this.matchStealGraceTimer = 0.5;
        this.matchPassTargetIdx = null;
        this.matchPassHoldTimer = 0;
        this.matchAutoSwitchCooldown = 0;
        this.matchEventText = null;
        this.phase = 'playing';
        this.emitSnapshot();
      }
      return;
    }

    if (this.phase !== 'playing') return;

    this.matchTimeSec += dt;
    this.matchEmitAccum += dt;
    if (this.activeDribbleSkillTimer > 0) {
      this.activeDribbleSkillTimer = Math.max(0, this.activeDribbleSkillTimer - dt);
      if (this.activeDribbleSkillTimer === 0) {
        this.activeDribbleSkill = null;
      }
    }
    if (this.matchTimeSec >= this.matchDurationSec) {
      this.matchTimeSec = this.matchDurationSec;
      this.phase = 'match_over';
      soundEngine.playWhistle(true);
      this.emitSnapshot();
      return;
    }

    this.matchKickCooldown = Math.max(0, this.matchKickCooldown - dt);
    this.matchStealGraceTimer = Math.max(0, this.matchStealGraceTimer - dt);
    this.matchAutoSwitchCooldown = Math.max(0, this.matchAutoSwitchCooldown - dt);
    if (this.matchPassHoldTimer > 0) {
      this.matchPassHoldTimer = Math.max(0, this.matchPassHoldTimer - dt);
      if (this.matchPassHoldTimer <= 0) {
        this.matchPassTargetIdx = null;
      }
    }

    const homeGkAgent = this.matchPlayers.find((p) => p.team === 'home' && p.role === 'gk');
    const awayGkAgent = this.matchPlayers.find((p) => p.team === 'away' && p.role === 'gk');
    const homeOutfield = this.matchPlayers.filter((p) => p.team === 'home' && p.role !== 'gk');
    const awayOutfield = this.matchPlayers.filter((p) => p.team === 'away' && p.role !== 'gk');

    // 1. Update Ball Physics or Dribble Carry
    if (
      this.matchBallOwnerIdx !== null &&
      this.matchPlayers[this.matchBallOwnerIdx]
    ) {
      this.matchAdminShotTarget = null;
      const owner = this.matchPlayers[this.matchBallOwnerIdx];
      this.matchLastTouchTeam = owner.team;
      const bx = owner.pos.x + Math.sin(owner.facingYaw) * 0.56;
      const bz = owner.pos.z + Math.cos(owner.facingYaw) * 0.56;
      let ballY = BALL_RADIUS;
      if (owner.skillType === 'rainbow_flick' && owner.skillTimer > 0) {
        const flickProg = THREE.MathUtils.clamp(1 - owner.skillTimer / 0.52, 0, 1);
        ballY = BALL_RADIUS + Math.sin(flickProg * Math.PI) * 1.48;
      }
      this.ballObj.mesh.position.set(bx, ballY, bz);
      this.ballObj.shadowMesh.position.set(bx, 0.018, bz);
      this.ballObj.shadowMesh.scale.setScalar(Math.max(0.55, 1 - (ballY - BALL_RADIUS) * 0.25));
      (this.ballObj.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0.24,
        0.65 - (ballY - BALL_RADIUS) * 0.22,
      );
      const carrySpeed = Math.hypot(owner.vel.x, owner.vel.z);
      if (carrySpeed > 0.2) {
        this.ballObj.mesh.rotation.x -= carrySpeed * dt * 3.5;
      }
      this.trailPoints = [];
      this.trailGeo.setFromPoints([]);
    } else if (this.matchBallSim) {
      const sim = this.matchBallSim;
      const isAdminMatchShot = Boolean(this.isAdmin && this.matchAdminShotTarget);
      const subSteps = 2;
      const subDt = dt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        const prevZ = sim.pos.z;
        stepBallPhysics(sim, { x: 0, z: 0 }, subDt);

        if (
          isAdminMatchShot &&
          this.matchAdminShotTarget &&
          sim.pos.z > -0.25 &&
          sim.pos.z < PITCH_LENGTH + 2
        ) {
          const speedNow = Math.max(28, sim.vel.length());
          const tRem = Math.max(0.03, (sim.pos.z + 0.15) / speedNow);
          const reqVx = (this.matchAdminShotTarget.x - sim.pos.x) / tRem;
          const reqVy =
            (this.matchAdminShotTarget.y - sim.pos.y + 0.5 * 9.81 * tRem * tRem) /
            tRem;
          const reqVz = (-0.25 - sim.pos.z) / tRem;
          const guideAlpha = 1 - Math.exp(-18 * subDt);
          sim.vel.x = THREE.MathUtils.lerp(sim.vel.x, reqVx, guideAlpha);
          sim.vel.y = THREE.MathUtils.lerp(sim.vel.y, reqVy, guideAlpha);
          sim.vel.z = THREE.MathUtils.lerp(sim.vel.z, reqVz, guideAlpha);
        }

        const omegaLen = sim.omega.length();
        if (omegaLen > 0.01) {
          _v2.copy(sim.omega).normalize();
          _q1.setFromAxisAngle(_v2, omegaLen * subDt);
          this.ballObj.mesh.quaternion.premultiply(_q1);
        }

        // North Goal woodwork & goal check (z = 0)
        if (!isAdminMatchShot && resolveWoodworkCollision(sim)) {
          soundEngine.playPostClang();
          soundEngine.playCrowdGasp();
          this.triggerCrowdReaction('miss', 2.1);
        }
        if (
          prevZ >= 0 &&
          sim.pos.z < 0 &&
          Math.abs(sim.pos.x) < GOAL_HALF_WIDTH - BALL_RADIUS * 0.4 &&
          sim.pos.y < GOAL_HEIGHT - BALL_RADIUS * 0.35
        ) {
          this.matchAdminShotTarget = null;
          this.playerGoals += 1;
          const isSuperGoal =
            this.matchLastShotDist >= 19 ||
            Math.abs(sim.pos.x) > GOAL_HALF_WIDTH - 0.85 ||
            sim.pos.y > GOAL_HEIGHT - 0.72;
          this.matchGoalSeq += 1;
          this.matchGoalTier = isSuperGoal ? 'super' : 'normal';
          this.stadium.net.triggerRipple(sim.pos.x, sim.pos.y, 0.72);
          soundEngine.playWhistle(true);
          soundEngine.playCrowdCheer();
          soundEngine.playNetRipple();
          soundEngine.playGoalCelebration(isSuperGoal);
          this.triggerCrowdReaction('goal', 3.0);
          this.triggerConfetti(sim.pos.x, sim.pos.y, isSuperGoal, 0);
          this.phase = 'match_goal';
          this.matchGoalTimer = 2.2;
          this.matchKickoffTeam = 'away';
          this.matchEventText = isSuperGoal
            ? `SIÊU PHẨM ${TEAM_PROFILES[this.homeTeamId].shortCode}! +100 XU`
            : `VÀO! ${TEAM_PROFILES[this.homeTeamId].shortCode} GHI BÀN! +100 XU`;
          this.matchEventTimer = 2.2;
          this.emitSnapshot();
          return;
        }

        // South Goal woodwork & goal check (z = PITCH_LENGTH)
        sim.pos.z = PITCH_LENGTH - sim.pos.z;
        sim.vel.z = -sim.vel.z;
        if (resolveWoodworkCollision(sim)) {
          soundEngine.playPostClang();
          this.triggerCrowdReaction('miss', 2.0);
        }
        sim.pos.z = PITCH_LENGTH - sim.pos.z;
        sim.vel.z = -sim.vel.z;

        if (
          prevZ <= PITCH_LENGTH &&
          sim.pos.z > PITCH_LENGTH &&
          Math.abs(sim.pos.x) < GOAL_HALF_WIDTH - BALL_RADIUS * 0.4 &&
          sim.pos.y < GOAL_HEIGHT - BALL_RADIUS * 0.35
        ) {
          if (this.isAdmin) {
            if (homeGkAgent) {
              homeGkAgent.diveTimer = 0.78;
              homeGkAgent.diveDir = sim.pos.x >= homeGkAgent.pos.x ? -1 : 1;
            }
            sim.pos.z = PITCH_LENGTH - 1.2;
            sim.vel.z = -Math.abs(sim.vel.z) * 0.55 - 7.5;
            sim.vel.x = (sim.pos.x >= 0 ? 1 : -1) * 6.5;
            sim.vel.y = 3.2;
            this.matchLastTouchTeam = 'home';
            this.matchKickCooldown = 0.35;
            soundEngine.playGloveSave();
            this.matchEventText = 'ADMIN GK CỨU THUA TUYỆT ĐỐI!';
            this.matchEventTimer = 1.4;
            this.emitSnapshot();
          } else {
            this.matchAdminShotTarget = null;
            this.botGoals += 1;
            this.stadium.netSouth.triggerRipple(-sim.pos.x, sim.pos.y, 0.72);
            soundEngine.playWhistle(true);
            soundEngine.playCrowdGasp();
            this.triggerCrowdReaction('miss', 2.4);
            soundEngine.playNetRipple();
            this.phase = 'match_goal';
            this.matchGoalTimer = 2.2;
            this.matchKickoffTeam = 'home';
            this.matchEventText = `${TEAM_PROFILES[this.awayTeamId].shortCode} GHI BÀN!`;
            this.matchEventTimer = 2.2;
            this.emitSnapshot();
            return;
          }
        }
      }

      this.ballObj.mesh.position.copy(sim.pos);
      this.ballObj.shadowMesh.position.set(sim.pos.x, 0.018, sim.pos.z);
      this.trailPoints.push(sim.pos.clone());
      if (this.trailPoints.length > 40) this.trailPoints.shift();
      this.trailGeo.setFromPoints(this.trailPoints);

      // Out of bounds: Goal Kick OR Live Corner Kick if deflected/parried!
      if (
        Math.abs(sim.pos.x) > PITCH_HALF_W - 0.5 ||
        sim.pos.z < -0.6 ||
        sim.pos.z > PITCH_LENGTH + 0.6
      ) {
        if (sim.pos.z < -0.6) {
          this.matchAdminShotTarget = null;
          if (this.matchLastTouchTeam === 'away') {
            const side: 'left' | 'right' = sim.pos.x < 0 ? 'left' : 'right';
            this.matchCornerSide = side;
            const cornerTaker = resetMatchCornerPositions(this.matchPlayers, 'home', side);
            this.matchBallOwnerIdx = cornerTaker ? cornerTaker.index : homeOutfield[0]?.index ?? 1;
            this.matchActiveIdx = this.matchBallOwnerIdx;
            this.matchBallSim = null;
            this.matchLastTouchTeam = 'home';
            this.matchStealGraceTimer = 0.85;
            soundEngine.playWhistle(false);
            this.matchEventText = `PHẠT GÓC ${side === 'left' ? 'TRÁI' : 'PHẢI'} CHO ĐỘI BẠN!`;
            this.matchEventTimer = 1.6;
          } else if (awayGkAgent) {
            this.matchBallOwnerIdx = awayGkAgent.index;
            awayGkAgent.aiActionTimer = 0.5;
            soundEngine.playCrowdGasp();
            this.triggerCrowdReaction('miss', 2.0);
          }
        } else if (sim.pos.z > PITCH_LENGTH + 0.6) {
          this.matchAdminShotTarget = null;
          if (this.matchLastTouchTeam === 'home') {
            const side: 'left' | 'right' = sim.pos.x < 0 ? 'left' : 'right';
            this.matchCornerSide = side;
            const awayCornerTaker = resetMatchCornerPositions(this.matchPlayers, 'away', side);
            this.matchBallOwnerIdx = awayCornerTaker ? awayCornerTaker.index : awayOutfield[0]?.index ?? 6;
            this.matchBallSim = null;
            this.matchLastTouchTeam = 'away';
            this.matchStealGraceTimer = 0.85;
            soundEngine.playWhistle(false);
            this.matchEventText = `PHẠT GÓC CHO ${TEAM_PROFILES[this.awayTeamId].shortCode}!`;
            this.matchEventTimer = 1.6;
          } else if (homeGkAgent) {
            this.matchBallOwnerIdx = homeGkAgent.index;
            homeGkAgent.aiActionTimer = 0.5;
          }
        } else {
          this.matchAdminShotTarget = null;
          sim.pos.x = THREE.MathUtils.clamp(sim.pos.x, -(PITCH_HALF_W - 2.5), PITCH_HALF_W - 2.5);
          sim.pos.z = THREE.MathUtils.clamp(sim.pos.z, 3, PITCH_LENGTH - 3);
          sim.vel.multiplyScalar(0.25);
        }
        if (this.matchBallOwnerIdx !== null) {
          this.matchBallSim = null;
        }
      }
    }

    const ballPos = this.getMatchBallPosition();
    const carrier =
      this.matchBallOwnerIdx !== null
        ? this.matchPlayers[this.matchBallOwnerIdx]
        : null;

    // Determine nearest & second-nearest presser on Away for smart AI coordination
    let awayNearestIdx = awayOutfield[0]?.index ?? 6;
    let awaySecondIdx = awayOutfield[1]?.index ?? awayNearestIdx;
    let awayNearestDist = Infinity;
    let awaySecondDist = Infinity;
    for (const aPlayer of awayOutfield) {
      const d = aPlayer.pos.distanceTo(ballPos);
      if (d < awayNearestDist) {
        awaySecondDist = awayNearestDist;
        awaySecondIdx = awayNearestIdx;
        awayNearestDist = d;
        awayNearestIdx = aPlayer.index;
      } else if (d < awaySecondDist) {
        awaySecondDist = d;
        awaySecondIdx = aPlayer.index;
      }
    }

    const diffMult =
      this.difficulty === 'extreme'
        ? 1.24
        : this.difficulty === 'pro'
        ? 1.12
        : this.difficulty === 'medium'
        ? 0.98
        : 0.84;

    // Auto-optimize controlling the Home player closest to the ball
    if (this.matchBallOwnerIdx !== null) {
      this.matchPassTargetIdx = null;
      this.matchPassHoldTimer = 0;
    }
    if (
      this.matchBallOwnerIdx !== null &&
      this.matchPlayers[this.matchBallOwnerIdx]?.team === 'home'
    ) {
      if (this.matchPlayers[this.matchBallOwnerIdx].role !== 'gk') {
        this.matchActiveIdx = this.matchBallOwnerIdx;
      }
    } else if (this.matchPassTargetIdx === null && this.matchAutoSwitchCooldown <= 0) {
      const optimal = this.getOptimalHomePlayerNearBall();
      const activeAgent = this.matchPlayers[this.matchActiveIdx];
      if (activeAgent && optimal.index !== this.matchActiveIdx) {
        const curVel = this.matchBallSim?.vel;
        const predX =
          ballPos.x + (curVel ? THREE.MathUtils.clamp(curVel.x * 0.28, -4.5, 4.5) : 0);
        const predZ =
          ballPos.z + (curVel ? THREE.MathUtils.clamp(curVel.z * 0.28, -4.5, 4.5) : 0);
        const curDistNow = Math.hypot(
          activeAgent.pos.x - ballPos.x,
          activeAgent.pos.z - ballPos.z,
        );
        const curDistPred = Math.hypot(
          activeAgent.pos.x - predX,
          activeAgent.pos.z - predZ,
        );
        const curScore = curDistPred * 0.65 + curDistNow * 0.35;
        if (optimal.score + 1.15 < curScore) {
          this.matchActiveIdx = optimal.index;
          this.matchAutoSwitchCooldown = 0.38;
        }
      }
    }

    // 2. Update All Match Agents (5v5 or 11v11)
    for (let i = 0; i < this.matchPlayers.length; i++) {
      const p = this.matchPlayers[i];
      p.tackleCooldown = Math.max(0, p.tackleCooldown - dt);

      if (p.role === 'gk') {
        const goalZ = p.team === 'home' ? PITCH_LENGTH - 1.2 : 1.2;
        const shotIncoming =
          this.matchBallOwnerIdx === null &&
          this.matchBallSim !== null &&
          ((p.team === 'away' &&
            this.matchBallSim.vel.z < -3.2 &&
            this.matchBallSim.pos.z < 38) ||
            (p.team === 'home' &&
              this.matchBallSim.vel.z > 3.2 &&
              this.matchBallSim.pos.z > PITCH_LENGTH - 38));

        let targetX = THREE.MathUtils.clamp(ballPos.x * 0.56, -3.25, 3.25);
        if (shotIncoming && this.matchBallSim) {
          const pred = predictBallAtZ(this.matchBallSim, goalZ, { x: 0, z: 0 });
          if (pred) {
            targetX = THREE.MathUtils.clamp(pred.x, -3.45, 3.45);
          }
        }

        const dx = targetX - p.pos.x;
        const gkMoveCap =
          p.team === 'away'
            ? 6.1 * Math.max(0.9, diffMult)
            : this.isAdmin
            ? 18.0
            : 6.5;
        p.vel.x = THREE.MathUtils.clamp(dx * (shotIncoming ? 9.5 : 6.4), -gkMoveCap, gkMoveCap);
        p.vel.z = (goalZ - p.pos.z) * 4.5;
        p.pos.x += p.vel.x * dt;
        p.pos.z += p.vel.z * dt;
        p.facingYaw = p.team === 'home' ? Math.PI : 0;

        // GK acts if carrying ball: pass to most open teammate
        if (this.matchBallOwnerIdx === p.index) {
          p.aiActionTimer -= dt;
          if (p.aiActionTimer <= 0) {
            const mates = p.team === 'home' ? homeOutfield : awayOutfield;
            const opps = p.team === 'home' ? awayOutfield : homeOutfield;
            let bestMate = mates[0] ?? p;
            let bestSpace = -1;
            for (const cand of mates) {
              let minOpp = Infinity;
              for (const o of opps) {
                minOpp = Math.min(minOpp, cand.pos.distanceTo(o.pos));
              }
              if (minOpp > bestSpace) {
                bestSpace = minOpp;
                bestMate = cand;
              }
            }
            const passDist = Math.hypot(bestMate.pos.x - p.pos.x, bestMate.pos.z - p.pos.z);
            this.launchMatchBallTo(
              p,
              bestMate.pos.x,
              0.2,
              bestMate.pos.z,
              THREE.MathUtils.clamp(10.5 + passDist * 0.48, 12.5, 20.5),
              0.22,
              0,
            );
            if (p.team === 'home' && bestMate.role !== 'gk') {
              bestMate.vel.set(0, 0, 0);
              bestMate.tackleCooldown = 0;
              this.matchPassTargetIdx = bestMate.index;
              this.matchPassHoldTimer = 2.2;
              this.matchActiveIdx = bestMate.index;
              this.matchClickTarget = null;
            }
          }
        } else if (
          this.matchBallOwnerIdx === null &&
          this.matchBallSim &&
          this.matchKickCooldown <= 0 &&
          !(this.isAdmin && this.matchAdminShotTarget && p.team === 'away')
        ) {
          const distToBall = Math.hypot(
            this.matchBallSim.pos.x - p.pos.x,
            this.matchBallSim.pos.z - p.pos.z,
          );
          const ballSpeed = this.matchBallSim.vel.length();
          const saveReach =
            p.team === 'away'
              ? 1.82 * Math.max(0.9, Math.min(1.12, diffMult))
              : this.isAdmin
              ? 3.25
              : 1.85;
          if (distToBall < saveReach && this.matchBallSim.pos.y < 2.55) {
            this.matchPassTargetIdx = null;
            this.matchPassHoldTimer = 0;
            this.matchAdminShotTarget = null;
            this.matchLastTouchTeam = p.team;
            if (ballSpeed > 11.0) {
              p.diveTimer = 0.78;
              const worldSide = this.matchBallSim.pos.x >= p.pos.x ? 1 : -1;
              p.diveDir = (Math.cos(p.facingYaw) >= 0 ? -1 : 1) * worldSide;
              const sprayIntensity =
                this.weather === 'rain' || this.weather === 'storm' ? 1.55 : 1.25;
              this.spawnTurfBurst(p.pos.x, 0.04, p.pos.z, sprayIntensity);
              this.impactShakeTimer = 0.14;
              const clearSide =
                Math.abs(this.matchBallSim.pos.x) > 0.35
                  ? Math.sign(this.matchBallSim.pos.x)
                  : p.diveDir * -1;
              // Fierce shots can parry outward with spin across the byline for a Corner Kick!
              const parryCornerSpin = ballSpeed > 22 && Math.random() < 0.34;
              if (parryCornerSpin) {
                this.matchBallSim.vel.z = (p.team === 'home' ? 1 : -1) * 4.4;
                this.matchBallSim.vel.x = clearSide * 8.6;
                this.matchBallSim.vel.y = 2.5;
                this.matchBallSim.omega.set(0, clearSide * 22, 0);
              } else {
                this.matchBallSim.vel.z =
                  (p.team === 'home' ? -1 : 1) * (5.5 + Math.abs(this.matchBallSim.vel.z) * 0.38);
                this.matchBallSim.vel.x =
                  clearSide * (6.2 + Math.random() * 2.5) +
                  (this.matchBallSim.pos.x - p.pos.x) * 3.0;
                this.matchBallSim.vel.y = Math.max(2.2, this.matchBallSim.vel.y * 0.4 + 2.4);
              }
              this.matchKickCooldown = 0.35;
              soundEngine.playGloveSave();
              if (p.team === 'away') {
                soundEngine.playCrowdGasp();
                this.triggerCrowdReaction('miss', 2.0);
              } else {
                soundEngine.playCrowdCheer();
                this.triggerCrowdReaction('goal', 2.2);
              }
              this.matchEventText =
                p.team === 'away' ? 'THỦ MÔN ĐỘI BẠN CẢN PHÁ!' : 'THỦ MÔN CỨU THUA!';
              this.matchEventTimer = 1.1;
            } else {
              this.matchBallOwnerIdx = p.index;
              this.matchBallSim = null;
              p.aiActionTimer = 0.48;
              soundEngine.playGloveSave();
            }
          }
        }

        animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
        continue;
      }

      // Designated Pass Receiver holds still facing incoming pass so it doesn't fly past
      if (
        p.index === this.matchPassTargetIdx &&
        this.matchPassHoldTimer > 0 &&
        this.matchBallOwnerIdx === null &&
        this.matchBallSim
      ) {
        p.vel.set(0, 0, 0);
        p.facingYaw = Math.atan2(
          this.matchBallSim.pos.x - p.pos.x,
          this.matchBallSim.pos.z - p.pos.z,
        );
        animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
        continue;
      }

      // Active User-Controlled Home Player
      if (p.index === this.matchActiveIdx && p.team === 'home') {
        if (p.slideTackleTimer && p.slideTackleTimer > 0) {
          const slideSpeed = 12.8 * Math.max(0.25, p.slideTackleTimer / 0.56);
          p.vel.set((p.slideDirX ?? 0) * slideSpeed, 0, (p.slideDirZ ?? 1) * slideSpeed);
          p.pos.x = THREE.MathUtils.clamp(p.pos.x + p.vel.x * dt, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
          p.pos.z = THREE.MathUtils.clamp(p.pos.z + p.vel.z * dt, 1.5, PITCH_LENGTH - 1.5);

          // Extended slide tackle steal hitbox
          if (
            this.matchBallOwnerIdx !== null &&
            this.matchPlayers[this.matchBallOwnerIdx]?.team === 'away' &&
            this.matchStealGraceTimer <= 0
          ) {
            const victim = this.matchPlayers[this.matchBallOwnerIdx];
            const tackleReach = p.pos.distanceTo(victim.pos);
            if (tackleReach < 2.35 && victim.skillTimer < 0.15) {
              victim.tackleCooldown = 1.65;
              victim.stunTimer = 1.15;
              const sx = victim.pos.x - p.pos.x;
              const sz = victim.pos.z - p.pos.z;
              const sl = Math.max(0.01, Math.hypot(sx, sz));
              victim.pos.x = THREE.MathUtils.clamp(
                victim.pos.x + (sx / sl) * 1.45,
                -(PITCH_HALF_W - 1.5),
                PITCH_HALF_W - 1.5,
              );
              victim.pos.z = THREE.MathUtils.clamp(
                victim.pos.z + (sz / sl) * 1.45,
                1.5,
                PITCH_LENGTH - 1.5,
              );
              this.matchBallOwnerIdx = p.index;
              this.matchLastTouchTeam = 'home';
              this.matchStealGraceTimer = 1.05;
              this.spawnTurfBurst(p.pos.x, 0.04, p.pos.z, 1.2);
              soundEngine.playKick(0.38);
              this.matchEventText = `${p.playerName.toUpperCase()}: SOẠT BÓNG THÀNH CÔNG!`;
              this.matchEventTimer = 1.1;
            }
          } else if (
            this.matchBallOwnerIdx === null &&
            this.matchBallSim &&
            this.matchKickCooldown <= 0 &&
            this.matchBallSim.pos.y < 1.35 &&
            Math.hypot(p.pos.x - this.matchBallSim.pos.x, p.pos.z - this.matchBallSim.pos.z) < 2.25
          ) {
            this.matchBallOwnerIdx = p.index;
            this.matchLastTouchTeam = 'home';
            this.matchBallSim = null;
            this.matchStealGraceTimer = 0.75;
            soundEngine.playKick(0.32);
          }

          animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
          continue;
        }
        const ctrl = this.getHomeControlInput();
        const sprint =
          this.keys['ShiftLeft'] ||
          this.keys['ShiftRight'] ||
          this.matchSprintActive ||
          p.sprintBurstTimer > 0
            ? p.sprintBurstTimer > 0
              ? 1.32
              : 1.18
            : 1.0;
        const pacMult = Math.min(1.75, 0.93 + (p.pacStat - 75) * 0.0056);
        const moveSpeed = 7.8 * pacMult * sprint;
        p.vel.set(ctrl.x * moveSpeed, 0, ctrl.z * moveSpeed);
        p.pos.x = THREE.MathUtils.clamp(p.pos.x + p.vel.x * dt, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
        p.pos.z = THREE.MathUtils.clamp(p.pos.z + p.vel.z * dt, 1.5, PITCH_LENGTH - 1.5);
        animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
        continue;
      }

      // AI Controlled Outfield Players (Home teammates + Away opponents)
      let desiredX = p.homeAnchor.x;
      let desiredZ = p.homeAnchor.z;
      let maxSpeed = 6.2 * (p.team === 'away' ? diffMult : 1.0);

      if (this.matchBallOwnerIdx === p.index) {
        // Away AI attacks South goal (z = PITCH_LENGTH) with defender evasion
        let evadeX = 0;
        for (const def of homeOutfield) {
          const dz = def.pos.z - p.pos.z;
          const dx = def.pos.x - p.pos.x;
          if (dz > -0.5 && dz < 5.5 && Math.abs(dx) < 3.4) {
            evadeX -= (dx >= 0 ? 1 : -1) * (3.6 - Math.abs(dx)) * 1.4;
          }
        }
        desiredX = THREE.MathUtils.clamp(
          p.pos.x * 0.72 + evadeX + Math.sin(this.elapsedTotal * 2.2 + i) * 2.2,
          -18,
          18,
        );
        desiredZ = PITCH_LENGTH - 4.5;
        maxSpeed = 6.95 * diffMult;

        p.aiActionTimer -= dt;
        const distToSouthGoal = PITCH_LENGTH - p.pos.z;
        if (distToSouthGoal < 26 && Math.abs(p.pos.x) < 16 && p.aiActionTimer <= 0) {
          const corner = (homeGkAgent?.pos.x ?? 0) >= 0 ? -1 : 1;
          const aimX = corner * THREE.MathUtils.lerp(2.15, 3.22, Math.random());
          const awayStar =
            KICKER_PROFILES[TEAM_PROFILES[this.awayTeamId].starKickerId];
          this.launchMatchBallTo(
            p,
            aimX,
            THREE.MathUtils.lerp(0.42, 1.98, Math.random()),
            PITCH_LENGTH,
            25.8 * awayStar.powerMult * Math.min(1.1, diffMult),
            2.65,
            corner * 32,
          );
          this.matchShotsAway += 1;
          p.aiActionTimer = 0.95;
          animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
          continue;
        }

        // Check pressure from Home defenders to pass to best open forward teammate
        let pressured = false;
        for (const hDef of homeOutfield) {
          if (hDef.pos.distanceTo(p.pos) < 3.6) {
            pressured = true;
            break;
          }
        }
        if (pressured && p.aiActionTimer <= 0) {
          let openMate: MatchPlayerAgent | null = null;
          let bestScore = -999;
          for (const mate of awayOutfield) {
            if (mate.index === p.index) continue;
            let nearestDef = Infinity;
            for (const hDef of homeOutfield) {
              nearestDef = Math.min(nearestDef, mate.pos.distanceTo(hDef.pos));
            }
            const score = (mate.pos.z - p.pos.z) * 0.7 + nearestDef * 1.3;
            if (mate.pos.z > p.pos.z - 4 && score > bestScore) {
              bestScore = score;
              openMate = mate;
            }
          }
          if (openMate) {
            this.launchMatchBallTo(
              p,
              openMate.pos.x,
              0.24,
              Math.min(PITCH_LENGTH - 4, openMate.pos.z + 2.4),
              17.8,
              0.12,
              0,
            );
            p.aiActionTimer = 0.72;
            animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
            continue;
          }
        }
      } else if (p.team === 'home') {
        if (carrier?.team === 'home') {
          desiredZ = THREE.MathUtils.clamp(
            p.homeAnchor.z - (PITCH_HALF_L - carrier.pos.z) * 0.65 - 8,
            6,
            PITCH_LENGTH - 8,
          );
          desiredX = p.homeAnchor.x * 1.12;
        } else {
          desiredZ = THREE.MathUtils.clamp(
            (p.homeAnchor.z + ballPos.z) * 0.55 + 6,
            12,
            PITCH_LENGTH - 6,
          );
          desiredX = THREE.MathUtils.lerp(p.homeAnchor.x, ballPos.x, 0.35);
        }
      } else {
        if (p.index === awayNearestIdx) {
          desiredX = ballPos.x;
          desiredZ = ballPos.z;
          maxSpeed = 7.2 * diffMult;
        } else if (p.index === awaySecondIdx && carrier?.team === 'home') {
          desiredX = THREE.MathUtils.clamp(ballPos.x * 0.62, -14, 14);
          desiredZ = THREE.MathUtils.clamp(ballPos.z - 5.2, 6, PITCH_LENGTH - 12);
          maxSpeed = 6.8 * diffMult;
        } else if (carrier?.team === 'away') {
          desiredZ = THREE.MathUtils.clamp(
            p.homeAnchor.z + (carrier.pos.z - PITCH_HALF_L) * 0.68 + 12,
            8,
            PITCH_LENGTH - 6,
          );
          desiredX = p.homeAnchor.x * 1.1;
        } else {
          desiredZ = THREE.MathUtils.clamp(
            (p.homeAnchor.z + ballPos.z) * 0.55 - 8,
            5,
            PITCH_LENGTH - 14,
          );
          desiredX = THREE.MathUtils.lerp(p.homeAnchor.x, ballPos.x, 0.4);
        }
      }

      const toX = desiredX - p.pos.x;
      const toZ = desiredZ - p.pos.z;
      const dist = Math.hypot(toX, toZ);
      if (dist > 0.35) {
        const sp = Math.min(maxSpeed, dist * 3.5);
        p.vel.set((toX / dist) * sp, 0, (toZ / dist) * sp);
        p.pos.x = THREE.MathUtils.clamp(p.pos.x + p.vel.x * dt, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
        p.pos.z = THREE.MathUtils.clamp(p.pos.z + p.vel.z * dt, 1.5, PITCH_LENGTH - 1.5);
      } else {
        p.vel.set(0, 0, 0);
      }

      animateMatchPlayer(p, dt, this.runningAuraId, this.elapsedTotal);
    }

    // Soft player-to-player collision separation
    for (let i = 0; i < this.matchPlayers.length; i++) {
      const a = this.matchPlayers[i];
      if (a.role === 'gk') continue;
      for (let j = i + 1; j < this.matchPlayers.length; j++) {
        const b = this.matchPlayers[j];
        if (b.role === 'gk') continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const minSep = 0.85;
        if (d > 0.001 && d < minSep) {
          const push = (minSep - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          a.pos.x = THREE.MathUtils.clamp(a.pos.x - nx * push, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
          a.pos.z = THREE.MathUtils.clamp(a.pos.z - nz * push, 1.5, PITCH_LENGTH - 1.5);
          b.pos.x = THREE.MathUtils.clamp(b.pos.x + nx * push, -(PITCH_HALF_W - 1.5), PITCH_HALF_W - 1.5);
          b.pos.z = THREE.MathUtils.clamp(b.pos.z + nz * push, 1.5, PITCH_LENGTH - 1.5);
        }
      }
    }

    // 3. Ball Pickup & Tackle Detection
    if (
      this.matchBallOwnerIdx === null &&
      this.matchBallSim &&
      this.matchKickCooldown <= 0 &&
      !(this.isAdmin && this.matchAdminShotTarget) &&
      this.matchBallSim.pos.y < (this.matchPassTargetIdx !== null ? 1.9 : 1.35)
    ) {
      let bestPickupIdx: number | null = null;
      let bestPickupScore = Infinity;
      for (let i = 0; i < this.matchPlayers.length; i++) {
        const p = this.matchPlayers[i];
        if (p.role === 'gk' || p.tackleCooldown > 0) continue;
        const isDesignatedReceiver =
          i === this.matchPassTargetIdx && this.matchPassHoldTimer > 0;
        const maxPickupRadius = isDesignatedReceiver ? 1.65 : 1.08;
        const maxHeight = isDesignatedReceiver ? 1.9 : 1.35;
        if (this.matchBallSim.pos.y >= maxHeight) continue;
        const d = Math.hypot(
          p.pos.x - this.matchBallSim.pos.x,
          p.pos.z - this.matchBallSim.pos.z,
        );
        if (d < maxPickupRadius && d < bestPickupScore) {
          bestPickupScore = d;
          bestPickupIdx = i;
        }
      }
      if (bestPickupIdx !== null) {
        this.matchBallOwnerIdx = bestPickupIdx;
        this.matchLastTouchTeam = this.matchPlayers[bestPickupIdx].team;
        this.matchBallSim = null;
        this.matchStealGraceTimer = 0.55;
        this.matchPassTargetIdx = null;
        this.matchPassHoldTimer = 0;
        if (this.matchPlayers[bestPickupIdx].team === 'home') {
          this.matchActiveIdx = bestPickupIdx;
        }
      }
    } else if (
      this.matchBallOwnerIdx !== null &&
      this.matchStealGraceTimer <= 0
    ) {
      const currentOwner = this.matchPlayers[this.matchBallOwnerIdx];
      for (let i = 0; i < this.matchPlayers.length; i++) {
        const challenger = this.matchPlayers[i];
        if (
          challenger.role === 'gk' ||
          challenger.team === currentOwner.team ||
          challenger.tackleCooldown > 0 ||
          currentOwner.skillTimer > 0.1
        ) {
          continue;
        }
        if (challenger.pos.distanceTo(currentOwner.pos) < 0.92) {
          currentOwner.tackleCooldown = 1.35;
          const sx = currentOwner.pos.x - challenger.pos.x;
          const sz = currentOwner.pos.z - challenger.pos.z;
          const sl = Math.hypot(sx, sz);
          if (sl > 0.01) {
            currentOwner.pos.x = THREE.MathUtils.clamp(
              currentOwner.pos.x + (sx / sl) * 0.95,
              -(PITCH_HALF_W - 1.5),
              PITCH_HALF_W - 1.5,
            );
            currentOwner.pos.z = THREE.MathUtils.clamp(
              currentOwner.pos.z + (sz / sl) * 0.95,
              1.5,
              PITCH_LENGTH - 1.5,
            );
          }
          this.matchBallOwnerIdx = challenger.index;
          this.matchLastTouchTeam = challenger.team;
          this.matchStealGraceTimer = 0.85;
          if (challenger.team === 'home') {
            this.matchActiveIdx = challenger.index;
          }
          soundEngine.playKick(0.32);
          break;
        }
      }
    }

    // 4. Sync Active & Carrier Floor Rings
    const activePlayer = this.matchPlayers[this.matchActiveIdx];
    if (activePlayer) {
      this.matchActiveRing.visible = true;
      this.matchActiveRing.position.set(activePlayer.pos.x, 0.03, activePlayer.pos.z);
    }
    const newOwner =
      this.matchBallOwnerIdx !== null
        ? this.matchPlayers[this.matchBallOwnerIdx]
        : null;
    if (newOwner) {
      this.matchCarrierRing.visible = true;
      this.matchCarrierRing.position.set(newOwner.pos.x, 0.028, newOwner.pos.z);
    } else {
      this.matchCarrierRing.visible = false;
    }

    if (this.matchEmitAccum >= 0.25) {
      this.matchEmitAccum = 0;
      this.emitSnapshot();
    }
  }

  private update(dt: number): void {
    const grassWindScale =
      this.weather === 'storm' ? 2.1 : this.weather === 'rain' ? 1.35 : 1.0;
    this.stadium.updateGrass(this.elapsedTotal * grassWindScale);
    this.updateWeather(dt);

    if (this.mode === 'match') {
      this.updateMatch(dt);
      return;
    }

    // Aiming phase: either Player aiming OR Player positioning GK while Bot prepares
    if (this.phase === 'aiming') {
      if (this.turnRole === 'gk') {
        const gkMoveSpeed = 4.4 * dt;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
          this.gkHomeX = THREE.MathUtils.clamp(this.gkHomeX + gkMoveSpeed, -3.1, 3.1);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
          this.gkHomeX = THREE.MathUtils.clamp(this.gkHomeX - gkMoveSpeed, -3.1, 3.1);
        }
        this.gkCurrentX = this.gkHomeX;
        this.goalkeeper.group.position.x = this.gkCurrentX;
        this.goalkeeper.bodyPivot.position.y =
          0.92 + Math.abs(Math.sin(this.elapsedTotal * 4.4)) * 0.04;

        if (!this.paused) {
          this.botPrepTimer -= dt;
          if (this.botPrepTimer <= 0) {
            this.executeKick(this.power);
          }
        }
      } else {
        let changed = false;
        const aimSpeed = 6.2 * dt;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
          this.moveAim360(-aimSpeed, 0);
          changed = true;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
          this.moveAim360(aimSpeed, 0);
          changed = true;
        }
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
          this.moveAim360(0, aimSpeed * 0.65);
          changed = true;
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
          this.moveAim360(0, -aimSpeed * 0.65);
          changed = true;
        }
        if (this.keys['KeyQ']) {
          this.spin.curve = THREE.MathUtils.clamp(this.spin.curve - 1.2 * dt, -1, 1);
          changed = true;
        }
        if (this.keys['KeyE']) {
          this.spin.curve = THREE.MathUtils.clamp(this.spin.curve + 1.2 * dt, -1, 1);
          changed = true;
        }
        if (changed) {
          this.updateAimAndPreviewVisuals();
          this.emitSnapshot();
        }

        // Goalkeeper idle anticipation sway
        this.gkCurrentX =
          this.gkHomeX + Math.sin(this.elapsedTotal * 2.2) * 0.22;
        this.goalkeeper.group.position.x = this.gkCurrentX;
        this.goalkeeper.bodyPivot.position.y =
          0.92 + Math.abs(Math.sin(this.elapsedTotal * 4.4)) * 0.04;
      }
    }

    // Power Charge Oscillation (speed scaled by difficulty)
    if (this.phase === 'charging') {
      const chargeSpeed = DIFFICULTY_LABELS[this.difficulty].chargeSpeed;
      this.power += this.chargingDir * dt * chargeSpeed;
      if (this.power >= 1.0) {
        this.power = 1.0;
        this.chargingDir = -1;
      } else if (this.power <= 0.18) {
        this.power = 0.18;
        this.chargingDir = 1;
      }
      // Subtle wind-up lean during power charge
      if (this.kickerPlayer) {
        const profile = KICKER_PROFILES[this.getActiveKickerId()];
        const kickLeg =
          profile.foot === 'right'
            ? this.kickerPlayer.rightLeg
            : this.kickerPlayer.leftLeg;
        kickLeg.rotation.x = THREE.MathUtils.damp(
          kickLeg.rotation.x,
          0.38 * this.power,
          8,
          dt,
        );
      }
      this.updateAimAndPreviewVisuals();
      this.emitSnapshot();
    }

    // Kicker Run-Up & Strike Animation
    if (this.phase === 'runup') {
      this.runupElapsed += dt;
      const dur = this.turnRole === 'gk' ? 0.42 : this.runupDuration;
      const p = Math.min(1, this.runupElapsed / dur);
      this.kickerCurrentPos.lerpVectors(
        this.kickerHomePos,
        this.kickerStrikePos,
        p,
      );
      if (this.kickerPlayer) {
        const profile = KICKER_PROFILES[this.getActiveKickerId()];
        this.kickerPlayer.group.position.copy(this.kickerCurrentPos);
        if (this.shotSkill === 'bicycle_volley' && this.turnRole === 'kick') {
          // Dramatic overhead bicycle leap & scissor kick
          const arc = Math.sin(p * Math.PI);
          this.kickerPlayer.bodyPivot.position.y = 0.96 + arc * 0.85;
          this.kickerPlayer.bodyPivot.rotation.set(-arc * 1.48, 0, arc * 0.36);
          const kickLeg =
            profile.foot === 'right'
              ? this.kickerPlayer.rightLeg
              : this.kickerPlayer.leftLeg;
          const suppLeg =
            profile.foot === 'right'
              ? this.kickerPlayer.leftLeg
              : this.kickerPlayer.rightLeg;
          kickLeg.rotation.set(-1.35 * p, 0, profile.foot === 'right' ? -0.15 : 0.15);
          suppLeg.rotation.set(0.45 * arc, 0, profile.foot === 'right' ? 0.15 : -0.15);
          this.kickerPlayer.leftArm.rotation.set(-0.5, 0, -1.2);
          this.kickerPlayer.rightArm.rotation.set(-0.5, 0, 1.2);
        } else if (this.shotSkill === 'rabona' && this.turnRole === 'kick') {
          // Stylized crossed-leg Rabona wrap behind support leg
          this.kickerPlayer.bodyPivot.position.y =
            0.92 + Math.abs(Math.sin(p * Math.PI * 2)) * 0.08;
          this.kickerPlayer.bodyPivot.rotation.set(0.24, profile.foot === 'right' ? -0.58 : 0.58, profile.foot === 'right' ? 0.34 : -0.34);
          const swing = p < 0.5 ? (p / 0.5) * 0.85 : 0.85 - ((p - 0.5) / 0.5) * 1.55;
          this.kickerKickLegRot = swing;
          this.kickerSupportLegRot = -swing * 0.25;
          if (profile.foot === 'right') {
            this.kickerPlayer.rightLeg.rotation.set(swing, -0.52, 0.42);
            this.kickerPlayer.leftLeg.rotation.set(this.kickerSupportLegRot, 0, 0.14);
          } else {
            this.kickerPlayer.leftLeg.rotation.set(swing, 0.52, -0.42);
            this.kickerPlayer.rightLeg.rotation.set(this.kickerSupportLegRot, 0, -0.14);
          }
          this.kickerPlayer.leftArm.rotation.set(-0.4, 0, -0.88);
          this.kickerPlayer.rightArm.rotation.set(0.4, 0, 0.88);
        } else {
          this.kickerPlayer.bodyPivot.position.y =
            0.92 + Math.abs(Math.sin(p * Math.PI * 2)) * (this.shotSkill === 'power_shot' ? 0.1 : 0.06);
          const windAmp = this.shotSkill === 'power_shot' ? 0.96 : this.shotSkill === 'chip_panenka' ? 0.48 : 0.72;
          const strikeAmp = this.shotSkill === 'power_shot' ? 1.85 : this.shotSkill === 'chip_panenka' ? 0.95 : 1.45;
          const swing = p < 0.55 ? (p / 0.55) * windAmp : windAmp - ((p - 0.55) / 0.45) * strikeAmp;
          this.kickerKickLegRot = swing;
          this.kickerSupportLegRot = -swing * 0.35;
          if (profile.foot === 'right') {
            this.kickerPlayer.rightLeg.rotation.set(this.kickerKickLegRot, 0, -0.1);
            this.kickerPlayer.leftLeg.rotation.set(this.kickerSupportLegRot, 0, 0.12);
          } else {
            this.kickerPlayer.leftLeg.rotation.set(this.kickerKickLegRot, 0, 0.1);
            this.kickerPlayer.rightLeg.rotation.set(this.kickerSupportLegRot, 0, -0.12);
          }
          if (this.kickerPlayer.rightKneePivot && this.kickerPlayer.leftKneePivot) {
            const kickKnee = profile.foot === 'right' ? this.kickerPlayer.rightKneePivot : this.kickerPlayer.leftKneePivot;
            kickKnee.rotation.x = p < 0.55 ? (p / 0.55) * 0.95 : 0.95 * (1 - (p - 0.55) / 0.45);
          }
          this.kickerPlayer.leftArm.rotation.set(-0.5, 0, this.shotSkill === 'power_shot' ? -0.92 : -0.55);
          this.kickerPlayer.rightArm.rotation.set(0.35, 0, this.shotSkill === 'power_shot' ? 0.92 : 0.55);
        }
      }

      if (this.teammateActive && this.teammatePlayer) {
        this.teammateCurrentPos.lerpVectors(
          this.teammateStartPos,
          this.teammateTargetPos,
          p * 0.25,
        );
        this.teammatePlayer.group.position.copy(this.teammateCurrentPos);
        const stride = Math.sin(this.elapsedTotal * 12) * 0.45;
        this.teammatePlayer.leftLeg.rotation.x = stride;
        this.teammatePlayer.rightLeg.rotation.x = -stride;
      }

      if (p >= 1) {
        this.launchBallFromRunup();
      }
    }

    // Ball Flight Simulation
    if (this.phase === 'flight' && this.simState) {
      // Relax kicker follow-through leg & realistic curl-lean posture
      if (this.kickerPlayer) {
        const profile = KICKER_PROFILES[this.getActiveKickerId()];
        this.kickerKickLegRot = THREE.MathUtils.damp(
          this.kickerKickLegRot,
          -0.25,
          6,
          dt,
        );
        if (profile.foot === 'right') {
          this.kickerPlayer.rightLeg.rotation.x = this.kickerKickLegRot;
        } else {
          this.kickerPlayer.leftLeg.rotation.x = this.kickerKickLegRot;
        }
        const leanMult =
          this.shotSkill === 'trivela' || this.shotSkill === 'rabona'
            ? 0.36
            : 0.24;
        this.kickerPlayer.bodyPivot.position.y = THREE.MathUtils.damp(
          this.kickerPlayer.bodyPivot.position.y,
          0.92,
          7,
          dt,
        );
        this.kickerPlayer.bodyPivot.rotation.z = THREE.MathUtils.damp(
          this.kickerPlayer.bodyPivot.rotation.z,
          -this.spin.curve * leanMult,
          7,
          dt,
        );
        this.kickerPlayer.bodyPivot.rotation.x = THREE.MathUtils.damp(
          this.kickerPlayer.bodyPivot.rotation.x,
          this.shotSkill === 'trivela' ? 0.18 : 0.12,
          7,
          dt,
        );
        this.kickerPlayer.bodyPivot.rotation.y = THREE.MathUtils.damp(
          this.kickerPlayer.bodyPivot.rotation.y,
          0,
          7,
          dt,
        );
      }
      this.updateFlight(dt);
    }

    // Scorer / Teammate Victory Celebration Animation on Free-Kick / Penalty Goals
    if (this.goalCelebrateTimer > 0 && this.phase !== 'replay') {
      this.goalCelebrateTimer = Math.max(0, this.goalCelebrateTimer - dt);
      const celebrant =
        this.teammateHeaderScored && this.teammatePlayer
          ? this.teammatePlayer
          : this.kickerPlayer;
      if (celebrant && this.turnRole === 'kick') {
        const hop = Math.abs(Math.sin(this.elapsedTotal * 7.2)) * 0.22;
        celebrant.bodyPivot.position.y = 0.92 + hop;
        celebrant.leftArm.rotation.set(
          -0.35,
          0,
          THREE.MathUtils.damp(celebrant.leftArm.rotation.z, -2.35, 9, dt),
        );
        celebrant.rightArm.rotation.set(
          -0.35,
          0,
          THREE.MathUtils.damp(celebrant.rightArm.rotation.z, 2.35, 9, dt),
        );
      }
    }

    // Slow-Mo Replay Playback
    if (this.phase === 'replay') {
      this.updateReplay(dt);
    }

    // Net Ripple Animation
    this.stadium.net.update(dt);

    // Crowd Cheering Wave
    this.updateCrowd(dt);

    // Corner Flag Wind Flutter
    this.updateCornerFlags();

    // Confetti particles
    this.updateConfetti(dt);

    // Smooth Camera Interpolation (THREE.MathUtils.damp)
    this.updateCamera(dt);
  }

  private updateFlight(dt: number): void {
    const sim = this.simState!;
    this.flightElapsed += dt;
    this.gkSaveCooldown = Math.max(0, this.gkSaveCooldown - dt);

    // Sub-step physics at 120Hz for rock-solid collision precision
    const subSteps = 3;
    const subDt = dt / subSteps;

    const isAdminKick =
      this.isAdmin && this.turnRole === 'kick' && this.mode !== 'online_duel';

    for (let s = 0; s < subSteps; s++) {
      this.prevBallZ = sim.pos.z;
      stepBallPhysics(sim, this.scenario.wind, subDt);

      // Precision homing assist during final approach for Admin's guaranteed top-corner strike
      if (
        isAdminKick &&
        this.adminCornerTarget &&
        !this.shotResolved &&
        sim.pos.z > -0.2 &&
        sim.pos.z < 12.5
      ) {
        const speedNow = Math.max(18, sim.vel.length());
        const tRem = Math.max(0.025, (sim.pos.z + 0.12) / speedNow);
        const reqVx = (this.adminCornerTarget.x - sim.pos.x) / tRem;
        const reqVy =
          (this.adminCornerTarget.y - sim.pos.y + 0.5 * 9.81 * tRem * tRem) / tRem;
        const reqVz = (-0.2 - sim.pos.z) / tRem;
        const alpha = 1 - Math.exp(-16 * subDt);
        sim.vel.x = THREE.MathUtils.lerp(sim.vel.x, reqVx, alpha);
        sim.vel.y = THREE.MathUtils.lerp(sim.vel.y, reqVy, alpha);
        sim.vel.z = THREE.MathUtils.lerp(sim.vel.z, reqVz, alpha);
      }

      // Rotate ball mesh visually around its angular velocity axis
      const omegaLen = sim.omega.length();
      if (omegaLen > 0.01) {
        _v2.copy(sim.omega).normalize();
        _q1.setFromAxisAngle(_v2, omegaLen * subDt);
        this.ballObj.mesh.quaternion.premultiply(_q1);
      }

      // Defensive Wall Collision (skipped once wall defenders peel back on cross-header plays)
      if (
        !isAdminKick &&
        !this.hitWallInShot &&
        !(this.defendersDroppingBack && this.flightElapsed > 0.22) &&
        this.wallColliders.length > 0
      ) {
        const currentWallTop = 1.84 + this.wallJumpY;
        for (const wc of this.wallColliders) {
          const dx = sim.pos.x - wc.x;
          const dz = sim.pos.z - wc.z;
          const rSum = wc.radius + BALL_RADIUS;
          if (
            dx * dx + dz * dz < rSum * rSum &&
            sim.pos.y < currentWallTop + BALL_RADIUS
          ) {
            this.hitWallInShot = true;
            const d = Math.max(0.001, Math.hypot(dx, dz));
            const nx = dx / d;
            const nz = dz / d;
            sim.pos.x = wc.x + nx * rSum;
            sim.pos.z = wc.z + nz * rSum;
            sim.vel.z = Math.abs(sim.vel.z) * 0.42 + 2.0;
            sim.vel.x = sim.vel.x * 0.45 + nx * 3.5;
            sim.vel.y = Math.max(1.2, sim.vel.y * 0.4);
            soundEngine.playGloveSave();
            this.resolveShotOutcome('wall_blocked');
            break;
          }
        }
      }

      // Goalpost / Crossbar Collision + Woodwork Đá Bồi Rebound!
      if (!isAdminKick && resolveWoodworkCollision(sim)) {
        this.hitWoodworkInShot = true;
        this.impactShakeTimer = 0.26;
        soundEngine.playPostClang();
        if (
          this.teammateActive &&
          this.reboundState === 'none' &&
          !this.shotResolved &&
          this.mode !== 'impossible' &&
          sim.vel.z > 0.35 &&
          sim.pos.z > 0.25
        ) {
          this.reboundState = 'chasing';
          this.teammateHasJumped = false;
          soundEngine.playCrowdGasp();
          this.triggerCrowdReaction('miss', 1.4);
        }
      }

      // Teammate Header Intercept in the Penalty Box
      if (
        !isAdminKick &&
        this.teammateActive &&
        !this.teammateHasHeaded &&
        this.reboundState === 'none' &&
        !this.shotResolved
      ) {
        const headY = 1.72 + this.teammateJumpY;
        const headDist = Math.hypot(
          sim.pos.x - this.teammateCurrentPos.x,
          sim.pos.y - headY,
          sim.pos.z - this.teammateCurrentPos.z,
        );
        const interceptRadius = this.teammateHeaderRequested ? 0.98 : 0.65;
        if (headDist < interceptRadius && sim.pos.z > 2.2) {
          this.teammateHasHeaded = true;
          this.teammateHeaderScored = true;

          const openCornerSide = this.gkCurrentX >= 0 ? -1 : 1;
          const headerTarget = _v3.set(
            openCornerSide * THREE.MathUtils.lerp(2.25, 3.05, Math.random()),
            THREE.MathUtils.lerp(1.35, 1.95, Math.random()),
            0,
          );
          const dir = headerTarget.sub(sim.pos).normalize();
          sim.vel.copy(dir).multiplyScalar(25.8);
          sim.vel.y += 1.45;
          sim.omega.set(-18, openCornerSide * 10, 0);

          if (this.teammatePlayer) {
            this.teammatePlayer.bodyPivot.rotation.x = 0.28;
          }
          soundEngine.playKick(0.85);

          // Re-plan Goalkeeper dive against the sudden header finish!
          const gkProfile = GK_PROFILES[this.getActiveGkId()];
          const newPlan = planGoalkeeperDive(
            sim,
            this.scenario.wind,
            this.difficulty,
            this.gkCurrentX,
            undefined,
            gkProfile.diveSpeedMult,
          );
          newPlan.reactionDelay += this.flightElapsed + 0.08;
          newPlan.reachRadius += gkProfile.reachBonus;
          this.gkPlan = newPlan;
        }
      }

      // Goalkeeper Save Collision (at z ~ 0.45)
      if (
        !isAdminKick &&
        !this.gkSavedBall &&
        this.gkSaveCooldown <= 0 &&
        !this.shotResolved
      ) {
        const isInvincibleDef =
          this.mode === 'impossible' || (this.turnRole === 'gk' && this.isAdmin);
        // Impossible Mode & Admin Invincible Auto-GK ironclad pre-line superhuman save
        if (
          isInvincibleDef &&
          sim.pos.z <= 0.78 &&
          sim.vel.z < 0 &&
          Math.abs(sim.pos.x) <= GOAL_HALF_WIDTH + 0.35 &&
          sim.pos.y <= GOAL_HEIGHT + 0.35
        ) {
          this.gkSavedBall = true;
          this.gkCurrentX = THREE.MathUtils.clamp(
            sim.pos.x,
            -GOAL_HALF_WIDTH + 0.14,
            GOAL_HALF_WIDTH - 0.14,
          );
          this.gkCurrentY = THREE.MathUtils.clamp(sim.pos.y - 1.0, 0, 1.85);
          this.goalkeeper.group.position.set(
            this.gkCurrentX,
            this.gkCurrentY,
            0.45,
          );
          sim.vel.z = Math.abs(sim.vel.z) * 0.48 + 4.2;
          sim.vel.x += (sim.pos.x >= 0 ? 1 : -1) * 3.6;
          sim.vel.y = Math.max(2.2, sim.vel.y * 0.45 + 2.2);
          soundEngine.playGloveSave();
          this.resolveShotOutcome('saved');
        } else {
          const gkProfile = GK_PROFILES[this.getActiveGkId()];
          const gkReach =
            this.turnRole === 'gk'
              ? (this.isAdmin ? 1.35 : 0.64) +
                gkProfile.reachBonus +
                (this.playerGkDiveActive ? 0.15 : 0)
              : this.gkPlan?.reachRadius ?? 0;

          if (gkReach > 0) {
            const gkCenterY = 1.0 + this.gkCurrentY;
            const distToGk = Math.hypot(
              sim.pos.x - this.gkCurrentX,
              sim.pos.y - gkCenterY,
              sim.pos.z - 0.45,
            );
            if (distToGk < gkReach) {
              const canTriggerRebound =
                this.teammateActive &&
                !isInvincibleDef &&
                this.reboundState === 'none' &&
                sim.pos.z > 0.12;

              const parrySide = sim.pos.x >= this.gkCurrentX ? 1 : -1;
              const isCornerParry =
                canTriggerRebound &&
                !this.teammateHeaderRequested &&
                Math.abs(sim.pos.x) > 1.85 &&
                sim.vel.length() > 21.5 &&
                Math.random() < 0.36;

              if (isCornerParry) {
                // GK fingertips spin the fierce shot wide past the byline -> PHẠT GÓC!
                this.gkSavedBall = true;
                this.cornerAwardedInShot = sim.pos.x < 0 ? 'left' : 'right';
                sim.pos.z = Math.max(0.45, sim.pos.z);
                sim.vel.x = parrySide * 8.2;
                sim.vel.z = -3.8;
                sim.vel.y = 2.6;
                sim.omega.set(0, parrySide * 22, 0);
                this.impactShakeTimer = 0.14;
                soundEngine.playGloveSave();
                this.resolveShotOutcome('saved');
              } else if (canTriggerRebound) {
                // GK parries ball into the 6-yard box; #9 sprints in for live Đá Bồi!
                this.reboundState = 'chasing';
                this.gkSaveCooldown = 0.32;
                this.teammateHasJumped = false;
                const parryTargetX = THREE.MathUtils.clamp(
                  sim.pos.x + parrySide * 1.45,
                  -4.2,
                  4.2,
                );
                sim.pos.z = Math.max(0.85, sim.pos.z);
                sim.vel.z = THREE.MathUtils.lerp(4.0, 6.0, Math.random());
                sim.vel.x = (parryTargetX - sim.pos.x) * 2.1;
                sim.vel.y = THREE.MathUtils.lerp(2.15, 3.25, Math.random());
                this.impactShakeTimer = 0.14;
                soundEngine.playGloveSave();
                soundEngine.playCrowdGasp();
                this.triggerCrowdReaction('miss', 1.4);
              } else {
                this.gkSavedBall = true;
                sim.vel.z = Math.abs(sim.vel.z) * 0.42 + 3.2;
                sim.vel.x += (sim.pos.x - this.gkCurrentX) * 5.0;
                sim.vel.y = Math.max(1.8, sim.vel.y * 0.5 + 2.0);
                soundEngine.playGloveSave();
                this.resolveShotOutcome('saved');
              }
            }
          }
        }
      }

      // Goal Line Crossing Detection (z crosses 0 from positive side)
      if (
        !this.shotResolved &&
        this.prevBallZ >= 0 &&
        sim.pos.z < 0 &&
        Math.abs(sim.pos.x) < GOAL_HALF_WIDTH - BALL_RADIUS * 0.4 &&
        sim.pos.y < GOAL_HEIGHT - BALL_RADIUS * 0.35
      ) {
        if (
          (this.mode === 'impossible' || (this.turnRole === 'gk' && this.isAdmin)) &&
          !isAdminKick
        ) {
          this.gkSavedBall = true;
          this.gkCurrentX = THREE.MathUtils.clamp(
            sim.pos.x,
            -GOAL_HALF_WIDTH + 0.14,
            GOAL_HALF_WIDTH - 0.14,
          );
          this.gkCurrentY = THREE.MathUtils.clamp(sim.pos.y - 1.0, 0, 1.85);
          this.goalkeeper.group.position.set(
            this.gkCurrentX,
            this.gkCurrentY,
            0.45,
          );
          sim.pos.z = 0.25;
          sim.vel.z = Math.abs(sim.vel.z) * 0.5 + 4.0;
          sim.vel.y = Math.max(2.0, sim.vel.y * 0.4 + 2.0);
          soundEngine.playGloveSave();
          this.resolveShotOutcome('saved');
        } else {
          const isTopCorner =
            isAdminKick ||
            (Math.abs(sim.pos.x) > GOAL_HALF_WIDTH - 1.15 &&
              sim.pos.y > GOAL_HEIGHT - 0.95);
          this.resolveShotOutcome(isTopCorner ? 'goal_top_corner' : 'goal');
        }
      }

      // Keep ball inside goal net once scored
      if (
        this.shotResolved &&
        (this.lastOutcome?.type === 'goal' ||
          this.lastOutcome?.type === 'goal_top_corner')
      ) {
        if (sim.pos.z <= -GOAL_DEPTH + BALL_RADIUS) {
          if (sim.vel.z < -2.0) {
            this.stadium.net.triggerRipple(
              sim.pos.x,
              sim.pos.y,
              Math.min(0.85, Math.abs(sim.vel.z) * 0.04),
            );
            soundEngine.playNetRipple();
          }
          sim.pos.z = -GOAL_DEPTH + BALL_RADIUS;
          sim.vel.z = Math.abs(sim.vel.z) * 0.18;
          sim.vel.x *= 0.45;
          sim.vel.y *= 0.45;
        }
        if (Math.abs(sim.pos.x) >= GOAL_HALF_WIDTH - BALL_RADIUS) {
          sim.pos.x =
            Math.sign(sim.pos.x) * (GOAL_HALF_WIDTH - BALL_RADIUS);
          sim.vel.x *= -0.35;
        }
        if (sim.pos.y >= GOAL_HEIGHT - BALL_RADIUS && sim.pos.z < 0) {
          sim.pos.y = GOAL_HEIGHT - BALL_RADIUS;
          sim.vel.y *= -0.35;
        }
      }
    }

    // Wall Jump Physics
    if (this.wallHasJumped) {
      this.wallJumpY += this.wallJumpVel * dt;
      this.wallJumpVel -= 11.5 * dt;
      if (this.wallJumpY <= 0) {
        this.wallJumpY = 0;
        this.wallJumpVel = 0;
        this.wallHasJumped = false;
      }
      this.wallPlayers.forEach((p) => {
        p.group.position.y = this.wallJumpY;
      });
    }

    // Teammate (#9) Run-Into-Box, Jump, and Rebound Tap-In (Đá Bồi)
    if (this.teammateActive && this.teammatePlayer) {
      if (this.reboundState === 'chasing' && !this.shotResolved) {
        const chaseTargetX = THREE.MathUtils.clamp(sim.pos.x, -5.8, 5.8);
        const chaseTargetZ = THREE.MathUtils.clamp(sim.pos.z, 1.3, 14.5);
        this.teammateCurrentPos.x = THREE.MathUtils.damp(
          this.teammateCurrentPos.x,
          chaseTargetX,
          9.4,
          dt,
        );
        this.teammateCurrentPos.z = THREE.MathUtils.damp(
          this.teammateCurrentPos.z,
          chaseTargetZ,
          9.4,
          dt,
        );
        this.teammatePlayer.group.lookAt(sim.pos.x, 0, Math.min(sim.pos.z - 2, 0));

        const reboundDist = Math.hypot(
          sim.pos.x - this.teammateCurrentPos.x,
          sim.pos.z - this.teammateCurrentPos.z,
        );
        if (
          reboundDist < 1.25 &&
          sim.pos.y < 1.65 &&
          this.gkSaveCooldown <= 0.22 &&
          sim.pos.z > 0.65
        ) {
          this.reboundState = 'struck';
          this.reboundScoredShot = true;
          const cornerSide = this.gkCurrentX >= 0 ? -1 : 1;
          const reboundTarget = _v3.set(
            cornerSide * THREE.MathUtils.lerp(2.25, 3.05, Math.random()),
            THREE.MathUtils.lerp(0.68, 1.48, Math.random()),
            0,
          );
          const dir = reboundTarget.sub(sim.pos).normalize();
          sim.vel.copy(dir).multiplyScalar(24.6);
          sim.vel.y += 1.15;
          sim.omega.set(-14, cornerSide * 9, 0);

          this.teammatePlayer.rightLeg.rotation.x = -0.98;
          this.teammatePlayer.leftLeg.rotation.x = 0.28;
          this.spawnTurfBurst(sim.pos.x, 0.04, sim.pos.z, 0.9);
          soundEngine.playKick(0.92);

          const gkProfile = GK_PROFILES[this.getActiveGkId()];
          const newPlan = planGoalkeeperDive(
            sim,
            this.scenario.wind,
            this.difficulty,
            this.gkCurrentX,
            undefined,
            gkProfile.diveSpeedMult,
          );
          newPlan.reactionDelay += this.flightElapsed + 0.12;
          newPlan.reachRadius += gkProfile.reachBonus;
          this.gkPlan = newPlan;
        }
      } else if (!this.teammateHasHeaded && this.reboundState === 'none') {
        if (
          !this.teammateHeaderRequested &&
          sim.pos.z < 12.5 &&
          sim.pos.y > 1.25
        ) {
          this.teammateTargetPos.x = THREE.MathUtils.clamp(sim.pos.x, -4.5, 4.5);
        }
        const runLambda = this.teammateHeaderRequested ? 7.2 : 4.8;
        this.teammateCurrentPos.x = THREE.MathUtils.damp(
          this.teammateCurrentPos.x,
          this.teammateTargetPos.x,
          runLambda,
          dt,
        );
        this.teammateCurrentPos.z = THREE.MathUtils.damp(
          this.teammateCurrentPos.z,
          this.teammateTargetPos.z,
          runLambda,
          dt,
        );

        const horizDist = Math.hypot(
          sim.pos.x - this.teammateCurrentPos.x,
          sim.pos.z - this.teammateCurrentPos.z,
        );
        if (
          !this.teammateHasJumped &&
          horizDist < 3.4 &&
          sim.pos.y > 1.25 &&
          sim.pos.z > this.teammateCurrentPos.z - 0.8
        ) {
          this.teammateHasJumped = true;
          this.teammateJumpVel = 4.6;
        }
      }

      if (this.teammateHasJumped || this.teammateJumpY > 0) {
        this.teammateJumpY += this.teammateJumpVel * dt;
        this.teammateJumpVel -= 10.5 * dt;
        if (this.teammateJumpY <= 0) {
          this.teammateJumpY = 0;
          this.teammateJumpVel = 0;
        }
      }

      this.teammatePlayer.group.position.set(
        this.teammateCurrentPos.x,
        this.teammateJumpY,
        this.teammateCurrentPos.z,
      );
      if (this.teammateJumpY <= 0.05) {
        if (this.reboundState === 'struck') {
          this.teammatePlayer.rightLeg.rotation.x = THREE.MathUtils.damp(
            this.teammatePlayer.rightLeg.rotation.x,
            -0.22,
            7,
            dt,
          );
          this.teammatePlayer.leftLeg.rotation.x = THREE.MathUtils.damp(
            this.teammatePlayer.leftLeg.rotation.x,
            0.12,
            7,
            dt,
          );
        } else {
          const stride = Math.sin(this.elapsedTotal * 14) * 0.45;
          this.teammatePlayer.leftLeg.rotation.x = stride;
          this.teammatePlayer.rightLeg.rotation.x = -stride;
        }
        this.teammatePlayer.bodyPivot.rotation.x = THREE.MathUtils.damp(
          this.teammatePlayer.bodyPivot.rotation.x,
          0,
          6,
          dt,
        );
      } else {
        this.teammatePlayer.leftLeg.rotation.x = 0.25;
        this.teammatePlayer.rightLeg.rotation.x = -0.25;
        this.teammatePlayer.leftArm.rotation.z = -0.85;
        this.teammatePlayer.rightArm.rotation.z = 0.85;
      }
    }

    // Tracking Box Defenders marking #9 & Wall Defenders sprinting back during crosses
    if (this.teammateActive && this.boxDefenders.length > 0) {
      for (let i = 0; i < this.boxDefenders.length; i++) {
        const d = this.boxDefenders[i];
        const anchorX =
          this.reboundState !== 'none'
            ? THREE.MathUtils.lerp(this.teammateCurrentPos.x, sim.pos.x, 0.55)
            : this.teammateCurrentPos.x;
        const anchorZ =
          this.reboundState !== 'none'
            ? THREE.MathUtils.lerp(this.teammateCurrentPos.z, sim.pos.z, 0.55)
            : this.teammateCurrentPos.z;
        const targetX = THREE.MathUtils.clamp(
          anchorX + d.markOffset.x * 0.65,
          -7.2,
          7.2,
        );
        const targetZ = THREE.MathUtils.clamp(
          anchorZ + d.markOffset.z * 0.65,
          1.8,
          14.5,
        );
        d.currentPos.x = THREE.MathUtils.damp(d.currentPos.x, targetX, 4.4, dt);
        d.currentPos.z = THREE.MathUtils.damp(d.currentPos.z, targetZ, 4.4, dt);
        d.player.group.position.set(d.currentPos.x, 0, d.currentPos.z);
        d.player.group.lookAt(sim.pos.x, 0, sim.pos.z);
        const dStride = Math.sin(this.elapsedTotal * 12 + i * 1.4) * 0.36;
        d.player.leftLeg.rotation.x = dStride;
        d.player.rightLeg.rotation.x = -dStride;
      }
    }

    if (
      this.defendersDroppingBack &&
      this.flightElapsed > 0.22 &&
      !this.wallHasJumped &&
      this.wallPlayers.length > 0
    ) {
      for (let i = 0; i < this.wallPlayers.length; i++) {
        const wp = this.wallPlayers[i];
        const home = this.wallDefenderPositions[i] ?? wp.group.position;
        const spreadIdx = i - (this.wallPlayers.length - 1) / 2;
        const dropTargetX = THREE.MathUtils.clamp(
          this.teammateCurrentPos.x * 0.35 + spreadIdx * 1.25,
          -8.5,
          8.5,
        );
        const dropTargetZ = Math.min(home.z, 6.4 + (i % 2) * 1.45);
        wp.group.position.x = THREE.MathUtils.damp(
          wp.group.position.x,
          dropTargetX,
          3.8,
          dt,
        );
        wp.group.position.z = THREE.MathUtils.damp(
          wp.group.position.z,
          dropTargetZ,
          3.8,
          dt,
        );
        wp.group.lookAt(sim.pos.x, 0, sim.pos.z);
        const stride = Math.sin(this.elapsedTotal * 13 + i) * 0.42;
        wp.leftLeg.rotation.x = stride;
        wp.rightLeg.rotation.x = -stride;
        wp.leftArm.rotation.set(0.2, 0, -0.25);
        wp.rightArm.rotation.set(-0.2, 0, 0.25);
      }
    }

    // Goalkeeper Dive Animation (AI or Playable GK) — airborne stretch followed by downward turf plunge
    if (this.turnRole === 'gk') {
      if (this.playerGkDiveActive) {
        const gkProfile = GK_PROFILES[this.getActiveGkId()];
        if (
          this.isAdmin &&
          !this.gkSavedBall &&
          !this.shotResolved &&
          sim.pos.z > 0.55
        ) {
          const pred = predictBallAtZ(sim, 0.45, this.scenario.wind);
          if (pred.reached) {
            this.playerGkDiveTargetX = THREE.MathUtils.clamp(
              pred.x,
              -GOAL_HALF_WIDTH + 0.12,
              GOAL_HALF_WIDTH - 0.12,
            );
            this.playerGkDiveTargetY = THREE.MathUtils.clamp(
              pred.y,
              0.3,
              GOAL_HEIGHT - 0.1,
            );
            const dx = this.playerGkDiveTargetX - this.gkCurrentX;
            if (Math.abs(dx) > 0.2) {
              this.playerGkDiveDir = Math.sign(dx);
            }
          }
        }

        this.playerGkDiveElapsed += dt;
        const diveDuration = this.isAdmin ? 0.48 : 0.98;
        const diveProgress = THREE.MathUtils.clamp(
          this.playerGkDiveElapsed / diveDuration,
          0,
          1,
        );
        const airT = Math.min(1, diveProgress / 0.56);
        const plunge = THREE.MathUtils.smoothstep(diveProgress, 0.4, 0.86);

        const adminTrackSpeed = this.isAdmin ? 2.2 : 1.0;
        const basePlayerGkLambda = this.isAdmin ? 8.8 : 5.0;
        this.gkCurrentX = THREE.MathUtils.damp(
          this.gkCurrentX,
          this.playerGkDiveTargetX,
          basePlayerGkLambda * gkProfile.diveSpeedMult * adminTrackSpeed * (1 - plunge * 0.48),
          dt,
        );
        const jumpPeak = Math.max(0.18, (this.playerGkDiveTargetY - 0.84) * 0.82);
        this.gkCurrentY = airT < 1 ? Math.sin(airT * Math.PI) * jumpPeak : 0;

        const dir = this.playerGkDiveDir;
        const airBodyY = 0.92 + Math.sin(airT * Math.PI) * 0.08;
        const targetBodyY = THREE.MathUtils.lerp(airBodyY, 0.22, plunge);
        const targetRoll =
          dir !== 0 ? -dir * THREE.MathUtils.lerp(1.42, 1.54, plunge) : 0;
        const targetPitch =
          dir !== 0
            ? THREE.MathUtils.lerp(0.16, 0.42, plunge)
            : THREE.MathUtils.lerp(0.55, 1.16, plunge);

        this.gkDiveRoll = THREE.MathUtils.damp(this.gkDiveRoll, targetRoll, 11.5, dt);
        this.gkDivePitch = THREE.MathUtils.damp(this.gkDivePitch, targetPitch, 11.0, dt);
        this.gkCurrentBodyY = THREE.MathUtils.damp(
          this.gkCurrentBodyY,
          targetBodyY,
          11.5,
          dt,
        );
        this.gkDiveProgress = diveProgress;
        this.gkActiveDiveDir = dir;

        this.goalkeeper.group.position.set(this.gkCurrentX, this.gkCurrentY, 0.45);
        this.applyGoalkeeperDivePose(
          dir,
          this.gkDiveRoll,
          this.gkDivePitch,
          this.gkCurrentBodyY,
          diveProgress,
        );
        if (!this.gkTurfImpactDone && diveProgress >= 0.48) {
          this.gkTurfImpactDone = true;
          const sprayIntensity =
            this.weather === 'rain' || this.weather === 'storm' ? 1.65 : 1.3;
          this.spawnTurfBurst(this.gkCurrentX, 0.04, 0.45, sprayIntensity);
        }
      } else {
        // Player can also sidestep before diving
        const gkMoveSpeed = 4.4 * dt;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
          this.gkCurrentX = THREE.MathUtils.clamp(this.gkCurrentX + gkMoveSpeed, -3.1, 3.1);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
          this.gkCurrentX = THREE.MathUtils.clamp(this.gkCurrentX - gkMoveSpeed, -3.1, 3.1);
        }
        this.goalkeeper.group.position.x = this.gkCurrentX;
      }
    } else if (this.gkPlan && this.flightElapsed > this.gkPlan.reactionDelay) {
      const gkProfile = GK_PROFILES[this.getActiveGkId()];
      // Smart mid-flight curve re-tracking for Impossible / Pro / Extreme / Medium Bot GKs
      const isImpossible = this.mode === 'impossible';
      if (
        !this.gkSavedBall &&
        !this.shotResolved &&
        (isImpossible || this.difficulty !== 'easy') &&
        sim.pos.z > 0.6 &&
        sim.pos.z < 26.0 &&
        this.flightElapsed - this.gkLastRepredictTime >= (isImpossible ? 0.015 : 0.11)
      ) {
        this.gkLastRepredictTime = this.flightElapsed;
        const pred = predictBallAtZ(sim, 0.45, this.scenario.wind);
        if (pred && Math.abs(pred.x) < GOAL_HALF_WIDTH + 0.9) {
          const trackAlpha = isImpossible
            ? 1.0
            : this.difficulty === 'extreme'
            ? 0.6
            : this.difficulty === 'pro'
            ? 0.44
            : 0.24;
          const clampedX = THREE.MathUtils.clamp(
            pred.x,
            -GOAL_HALF_WIDTH + 0.12,
            GOAL_HALF_WIDTH - 0.12,
          );
          const clampedY = THREE.MathUtils.clamp(
            pred.y,
            0.3,
            GOAL_HEIGHT - 0.12,
          );
          this.gkPlan.diveTargetX = THREE.MathUtils.lerp(
            this.gkPlan.diveTargetX,
            clampedX,
            trackAlpha,
          );
          this.gkPlan.diveTargetY = THREE.MathUtils.lerp(
            this.gkPlan.diveTargetY,
            clampedY,
            trackAlpha,
          );
          const dxTrack = this.gkPlan.diveTargetX - this.gkCurrentX;
          this.gkPlan.diveDir = Math.abs(dxTrack) < 0.25 ? 0 : Math.sign(dxTrack);
        }
      }

      const diveDuration = isImpossible ? 0.46 : 1.05;
      const diveProgress = THREE.MathUtils.clamp(
        (this.flightElapsed - this.gkPlan.reactionDelay) / diveDuration,
        0,
        1,
      );
      const airT = Math.min(1, diveProgress / 0.56);
      const plunge = THREE.MathUtils.smoothstep(diveProgress, 0.4, 0.86);

      const diffSpeedBoost = isImpossible
        ? 3.4
        : this.difficulty === 'extreme'
        ? 1.12
        : this.difficulty === 'pro'
        ? 1.02
        : this.difficulty === 'medium'
        ? 0.9
        : 0.74;
      const baseAiLambda = isImpossible ? 9.4 : 4.6;
      this.gkCurrentX = THREE.MathUtils.damp(
        this.gkCurrentX,
        this.gkPlan.diveTargetX,
        baseAiLambda * gkProfile.diveSpeedMult * diffSpeedBoost * (1 - plunge * 0.48),
        dt,
      );
      const jumpPeak = Math.max(0.18, (this.gkPlan.diveTargetY - 0.82) * 0.84);
      this.gkCurrentY = airT < 1 ? Math.sin(airT * Math.PI) * jumpPeak : 0;

      const dir = this.gkPlan.diveDir;
      const airBodyY = 0.92 + Math.sin(airT * Math.PI) * 0.08;
      const targetBodyY = THREE.MathUtils.lerp(airBodyY, 0.22, plunge);
      const targetRoll =
        dir !== 0 ? -dir * THREE.MathUtils.lerp(1.44, 1.56, plunge) : 0;
      const targetPitch =
        dir !== 0
          ? THREE.MathUtils.lerp(0.16, 0.42, plunge)
          : THREE.MathUtils.lerp(0.55, 1.18, plunge);

      this.gkDiveRoll = THREE.MathUtils.damp(this.gkDiveRoll, targetRoll, 12.2, dt);
      this.gkDivePitch = THREE.MathUtils.damp(this.gkDivePitch, targetPitch, 11.5, dt);
      this.gkCurrentBodyY = THREE.MathUtils.damp(
        this.gkCurrentBodyY,
        targetBodyY,
        12.0,
        dt,
      );
      this.gkDiveProgress = diveProgress;
      this.gkActiveDiveDir = dir;

      this.goalkeeper.group.position.set(this.gkCurrentX, this.gkCurrentY, 0.45);
      this.applyGoalkeeperDivePose(
        dir,
        this.gkDiveRoll,
        this.gkDivePitch,
        this.gkCurrentBodyY,
        diveProgress,
      );
      if (!this.gkTurfImpactDone && diveProgress >= 0.48) {
        this.gkTurfImpactDone = true;
        const sprayIntensity =
          this.weather === 'rain' || this.weather === 'storm' ? 1.65 : 1.3;
        this.spawnTurfBurst(this.gkCurrentX, 0.04, 0.45, sprayIntensity);
      }
    }

    // Sync ball & contact shadow
    this.ballObj.mesh.position.copy(sim.pos);
    this.ballObj.shadowMesh.position.set(sim.pos.x, 0.018, sim.pos.z);
    const shadowScale = THREE.MathUtils.clamp(1 + sim.pos.y * 0.28, 1, 2.4);
    this.ballObj.shadowMesh.scale.setScalar(shadowScale);
    (this.ballObj.shadowMesh.material as THREE.MeshBasicMaterial).opacity =
      THREE.MathUtils.clamp(0.65 - sim.pos.y * 0.14, 0.12, 0.65);

    // Update Ball Trail Ribbon
    this.trailPoints.push(sim.pos.clone());
    if (this.trailPoints.length > 90) this.trailPoints.shift();
    this.trailGeo.setFromPoints(this.trailPoints);

    // Record Replay Frame
    this.replayFrames.push({
      ballPos: sim.pos.clone(),
      ballQuat: this.ballObj.mesh.quaternion.clone(),
      gkX: this.gkCurrentX,
      gkY: this.gkCurrentY,
      gkBodyY: this.gkCurrentBodyY,
      gkRotX: this.gkDivePitch,
      gkRotZ: this.gkDiveRoll,
      gkDiveProgress: this.gkDiveProgress,
      gkDiveDir: this.gkActiveDiveDir,
      wallJumpY: this.wallJumpY,
      kickerPos: this.kickerCurrentPos.clone(),
      kickerKickLegRot: this.kickerKickLegRot,
      kickerSupportLegRot: this.kickerSupportLegRot,
      teammatePos: this.teammateActive ? this.teammateCurrentPos.clone() : undefined,
      teammateJumpY: this.teammateActive ? this.teammateJumpY : undefined,
      t: this.flightElapsed,
    });

    // Miss detection if ball flies past goal line outside goal frame
    if (!this.shotResolved && sim.pos.z < -2.6) {
      this.resolveShotOutcome(this.hitWoodworkInShot ? 'woodwork' : 'missed');
    }

    // Settle timer before showing Result UI (allow extra time while #9 sprints onto rebound)
    const maxFlightTime = this.reboundState === 'chasing' ? 5.2 : 3.2;
    if (this.shotResolved || this.flightElapsed > maxFlightTime) {
      if (!this.shotResolved) {
        this.resolveShotOutcome(this.hitWoodworkInShot ? 'woodwork' : 'missed');
      }
      this.outcomeSettleTimer += dt;
      if (this.outcomeSettleTimer > 0.95) {
        this.phase = 'result';
        this.emitSnapshot();
        if (this.mode === 'online_duel' && this.lastOutcome) {
          this.onlineTurnFinishedCb?.(this.lastOutcome);
        }
      }
    }
  }

  private updateReplay(dt: number): void {
    this.replayTimer += dt * 0.38; // 0.38x slow motion
    const lastT = this.replayFrames[this.replayFrames.length - 1]?.t ?? 1;
    if (this.replayTimer >= lastT) {
      this.phase = 'result';
      this.emitSnapshot();
      return;
    }

    // Find closest frame
    let frame = this.replayFrames[0];
    for (let i = 0; i < this.replayFrames.length; i++) {
      if (this.replayFrames[i].t >= this.replayTimer) {
        frame = this.replayFrames[i];
        break;
      }
    }

    this.ballObj.mesh.position.copy(frame.ballPos);
    this.ballObj.mesh.quaternion.copy(frame.ballQuat);
    this.ballObj.shadowMesh.position.set(frame.ballPos.x, 0.018, frame.ballPos.z);

    this.goalkeeper.group.position.set(frame.gkX, frame.gkY, 0.45);
    if (frame.gkDiveProgress > 0.01) {
      this.applyGoalkeeperDivePose(
        frame.gkDiveDir,
        frame.gkRotZ,
        frame.gkRotX,
        frame.gkBodyY,
        frame.gkDiveProgress,
      );
    } else {
      this.gkCurrentX = frame.gkX;
      this.resetGoalkeeperPose();
    }
    this.wallPlayers.forEach((p) => {
      p.group.position.y = frame.wallJumpY;
    });

    if (this.teammateActive && this.teammatePlayer && frame.teammatePos) {
      this.teammatePlayer.group.position.set(
        frame.teammatePos.x,
        frame.teammateJumpY ?? 0,
        frame.teammatePos.z,
      );
    }

    if (this.kickerPlayer) {
      const profile = KICKER_PROFILES[this.getActiveKickerId()];
      this.kickerPlayer.group.position.copy(frame.kickerPos);
      if (profile.foot === 'right') {
        this.kickerPlayer.rightLeg.rotation.x = frame.kickerKickLegRot;
        this.kickerPlayer.leftLeg.rotation.x = frame.kickerSupportLegRot;
      } else {
        this.kickerPlayer.leftLeg.rotation.x = frame.kickerKickLegRot;
        this.kickerPlayer.rightLeg.rotation.x = frame.kickerSupportLegRot;
      }
    }

    this.trailPoints.push(frame.ballPos.clone());
    if (this.trailPoints.length > 70) this.trailPoints.shift();
    this.trailGeo.setFromPoints(this.trailPoints);
  }

  private updateCrowd(dt: number): void {
    if (this.crowdExciteTimer > 0) {
      this.crowdExciteTimer = Math.max(0, this.crowdExciteTimer - dt);
      if (this.crowdExciteTimer <= 0) {
        this.crowdExcitement = 0;
        this.crowdMood = 'idle';
      }
    }

    const {
      crowdMesh,
      crowdHeadsMesh,
      crowdArmsMesh,
      crowdFlashMesh,
      crowdPositions,
      crowdScales,
      crowdPhases,
      crowdWaveAngles,
      crowdFlashPositions,
    } = this.stadium;

    const count = crowdScales.length;
    const t = this.elapsedTotal;
    const activeMood = this.crowdExciteTimer > 0 ? this.crowdMood : 'idle';
    const progress =
      this.crowdExciteTimer > 0
        ? 1 - this.crowdExciteTimer / Math.max(0.1, this.crowdExciteDuration)
        : 0;
    const intensity =
      activeMood === 'idle'
        ? 0
        : Math.min(1, this.crowdExciteTimer / 0.55) * this.crowdExcitement;

    for (let i = 0; i < count; i++) {
      const bx = crowdPositions[i * 3];
      const by = crowdPositions[i * 3 + 1];
      const bz = crowdPositions[i * 3 + 2];
      const s = crowdScales[i];
      const phase = crowdPhases[i];
      const waveAngle = crowdWaveAngles[i];
      const yawToPitch = Math.atan2(-bx, 18 - bz);

      let dy = 0;
      let leanX = 0;
      let rockZ = 0;
      let headShakeY = 0;
      let armDy = 0.14 * s;
      let armScaleX = 0.72 * s;
      let armRotX = 0;
      let armRotZ = 0;
      let stretchY = 1.0;

      if (activeMood === 'goal') {
        // Mexican wave + jubilant jumping + raised cheering arms
        const wave = Math.max(0, Math.sin(t * 6.2 - waveAngle * 3.2));
        const jump = Math.abs(Math.sin(t * 9.8 + phase));
        dy = (jump * 0.34 + wave * 0.26) * intensity;
        stretchY = 1.0 + jump * 0.12 * intensity;
        rockZ = Math.sin(t * 10.5 + phase) * 0.22 * intensity;
        leanX = -0.1 * intensity;
        armDy = (0.14 + 0.44 * intensity + Math.sin(t * 14 + phase) * 0.08 * intensity) * s;
        armScaleX = (0.72 + 0.28 * intensity) * s;
        armRotZ = Math.sin(t * 15 + phase) * 0.38 * intensity;
      } else if (activeMood === 'miss') {
        // Collective shock stand-up -> slump forward with hands clutching head in disbelief
        const shockPulse = progress < 0.2 ? Math.sin((progress / 0.2) * Math.PI) : 0;
        const slump = progress >= 0.16 ? Math.sin(Math.min(1, (progress - 0.16) / 0.84) * Math.PI) : 0;
        dy = (shockPulse * 0.18 - slump * 0.14) * intensity;
        leanX = slump * 0.34 * intensity;
        headShakeY = Math.sin(t * 13 + phase) * 0.32 * slump * intensity;
        rockZ = Math.sin(t * 6.5 + phase) * 0.09 * intensity;
        armDy = (0.14 + (0.28 * shockPulse + 0.26 * slump) * intensity) * s;
        armScaleX = (0.72 - 0.18 * slump * intensity) * s;
        armRotX = 0.45 * slump * intensity;
        armRotZ = Math.sin(t * 8 + phase) * 0.14 * intensity;
      } else {
        // Ambient stadium breathing + occasional subtle stand wave
        const ripple = Math.max(0, Math.sin(t * 1.4 - waveAngle * 2.2));
        dy = Math.max(0, Math.sin(t * 2.2 + phase)) * 0.035 + ripple * 0.04;
        rockZ = Math.sin(t * 1.8 + phase) * 0.03;
        armDy = (0.12 + ripple * 0.06) * s;
      }

      _crowdBodyObj.position.set(bx, by + dy, bz);
      _crowdBodyObj.rotation.set(leanX, yawToPitch, rockZ);
      _crowdBodyObj.scale.set(s, s * stretchY, s);
      _crowdBodyObj.updateMatrix();
      crowdMesh.setMatrixAt(i, _crowdBodyObj.matrix);

      _crowdHeadObj.position.set(
        bx,
        by + dy + 0.56 * s * stretchY,
        bz + Math.sin(leanX) * 0.16,
      );
      _crowdHeadObj.rotation.set(leanX * 1.15, yawToPitch + headShakeY, rockZ);
      _crowdHeadObj.scale.set(s, s, s);
      _crowdHeadObj.updateMatrix();
      crowdHeadsMesh.setMatrixAt(i, _crowdHeadObj.matrix);

      _crowdArmObj.position.set(
        bx,
        by + dy + armDy,
        bz + Math.sin(leanX) * 0.12,
      );
      _crowdArmObj.rotation.set(armRotX, yawToPitch, armRotZ);
      _crowdArmObj.scale.set(armScaleX, s, s);
      _crowdArmObj.updateMatrix();
      crowdArmsMesh.setMatrixAt(i, _crowdArmObj.matrix);
    }

    crowdMesh.instanceMatrix.needsUpdate = true;
    crowdHeadsMesh.instanceMatrix.needsUpdate = true;
    crowdArmsMesh.instanceMatrix.needsUpdate = true;

    // Stadium Camera Flashes sparkle on Goals and dramatic Misses
    if (activeMood !== 'idle') {
      crowdFlashMesh.visible = true;
      const flashCount = crowdFlashPositions.length / 3;
      const flashBoost = activeMood === 'goal' ? 1.35 : 0.72;
      for (let i = 0; i < flashCount; i++) {
        const pulse = Math.sin(t * 18.0 + i * 2.37);
        const fs =
          pulse > 0.74
            ? ((pulse - 0.74) / 0.26) * flashBoost * intensity
            : 0;
        const fx = crowdFlashPositions[i * 3];
        const fy = crowdFlashPositions[i * 3 + 1];
        const fz = crowdFlashPositions[i * 3 + 2];
        _flashObj.position.set(fx, fy, fz);
        _flashObj.rotation.set(0, Math.atan2(-fx, 18 - fz), t * 3 + i);
        _flashObj.scale.set(fs, fs, fs);
        _flashObj.updateMatrix();
        crowdFlashMesh.setMatrixAt(i, _flashObj.matrix);
      }
      crowdFlashMesh.instanceMatrix.needsUpdate = true;
    } else if (crowdFlashMesh.visible) {
      crowdFlashMesh.visible = false;
    }
  }

  private updateConfetti(dt: number): void {
    // 1. Confetti Ribbons
    if (this.confettiActive) {
      this.confettiTimer += dt;
      if (this.confettiTimer > 3.1) {
        this.confettiActive = false;
        this.confettiMesh.visible = false;
      } else {
        for (let i = 0; i < this.confettiPos.length; i++) {
          const p = this.confettiPos[i];
          const v = this.confettiVelocities[i];
          v.y -= 6.4 * dt;
          v.x *= Math.exp(-0.95 * dt);
          v.z *= Math.exp(-0.95 * dt);
          p.addScaledVector(v, dt);

          _mat4.makeRotationFromEuler(
            new THREE.Euler(
              this.confettiTimer * 5.6 + i,
              this.confettiTimer * 4.4 + i,
              0,
            ),
          );
          _mat4.setPosition(p);
          this.confettiMesh.setMatrixAt(i, _mat4);
        }
        this.confettiMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2. Dual Goalpost Pyro Sparks
    if (this.goalPyroActive) {
      this.goalPyroTimer += dt;
      if (this.goalPyroTimer > 2.0) {
        this.goalPyroActive = false;
        this.goalPyroMesh.visible = false;
      } else {
        const shrink = Math.max(0.05, 1 - this.goalPyroTimer / 2.0);
        for (let i = 0; i < this.goalPyroPos.length; i++) {
          const p = this.goalPyroPos[i];
          const v = this.goalPyroVel[i];
          v.y -= 9.5 * dt;
          v.x *= Math.exp(-1.1 * dt);
          v.z *= Math.exp(-1.1 * dt);
          p.addScaledVector(v, dt);
          if (p.y < 0.08) {
            p.y = 0.08;
            v.y = Math.abs(v.y) * 0.25;
          }
          _mat4.makeScale(shrink, shrink, shrink);
          _mat4.setPosition(p);
          this.goalPyroMesh.setMatrixAt(i, _mat4);
        }
        this.goalPyroMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 3. Expanding Goal Shockwave Ring
    if (this.goalShockwaveTimer < 0.9) {
      this.goalShockwaveTimer += dt;
      const t = Math.min(1, this.goalShockwaveTimer / 0.9);
      const scale = 0.35 + t * (this.goalIsSuper ? 4.4 : 3.2);
      this.goalShockwaveMesh.scale.setScalar(scale);
      this.goalShockwaveMat.opacity = Math.max(0, (1 - t) * (1 - t) * 0.92);
      if (t >= 1) {
        this.goalShockwaveMesh.visible = false;
      }
    }

    // 4. Dynamic Goal Flash Light decay
    if (this.goalFlashTimer < 1.35) {
      this.goalFlashTimer += dt;
      const decay = Math.exp(-3.1 * this.goalFlashTimer);
      this.goalFlashLight.intensity = (this.goalIsSuper ? 18 : 12) * decay;
      if (this.goalFlashTimer >= 1.35) {
        this.goalFlashLight.intensity = 0;
      }
    }

    // 5. Realistic Turf / Dirt Dust Particles (zero-GC)
    if (this.turfDustMesh.visible) {
      let anyAlive = false;
      for (let i = 0; i < this.turfDustLife.length; i++) {
        const life = this.turfDustLife[i];
        if (life <= 0) {
          _dustObj.position.set(0, -10, 0);
          _dustObj.scale.setScalar(0.001);
          _dustObj.updateMatrix();
          this.turfDustMesh.setMatrixAt(i, _dustObj.matrix);
          continue;
        }
        anyAlive = true;
        const nextLife = Math.max(0, life - dt);
        this.turfDustLife[i] = nextLife;
        const p = this.turfDustPos[i];
        const v = this.turfDustVel[i];
        v.y -= 10.5 * dt;
        v.x *= Math.exp(-2.2 * dt);
        v.z *= Math.exp(-2.2 * dt);
        p.addScaledVector(v, dt);
        if (p.y < 0.02) {
          p.y = 0.02;
          v.y = 0;
          v.x *= 0.6;
          v.z *= 0.6;
        }
        const scale = Math.max(0.05, nextLife / 0.65);
        _dustObj.position.copy(p);
        _dustObj.rotation.set(nextLife * 9 + i, nextLife * 6, i);
        _dustObj.scale.setScalar(scale);
        _dustObj.updateMatrix();
        this.turfDustMesh.setMatrixAt(i, _dustObj.matrix);
      }
      this.turfDustMesh.instanceMatrix.needsUpdate = true;
      if (!anyAlive) {
        this.turfDustMesh.visible = false;
      }
    }
  }

  private createWeatherSystem(): void {
    // 800 Falling Rain Streaks across wider 84m stadium
    const rainCount = 800;
    const rainGeo = new THREE.BoxGeometry(0.018, 0.72, 0.018);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    this.rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
    this.rainMesh.visible = false;
    this.rainMesh.frustumCulled = false;
    for (let i = 0; i < rainCount; i++) {
      this.rainPos.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 84,
          Math.random() * 26,
          (Math.random() - 0.5) * 76 + 18,
        ),
      );
      this.rainSpeed.push(21 + Math.random() * 9);
    }
    this.scene.add(this.rainMesh);

    // 550 Drifting Snowflakes
    const snowCount = 550;
    const snowGeo = new THREE.OctahedronGeometry(0.055, 0);
    const snowMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.snowMesh = new THREE.InstancedMesh(snowGeo, snowMat, snowCount);
    this.snowMesh.visible = false;
    this.snowMesh.frustumCulled = false;
    for (let i = 0; i < snowCount; i++) {
      this.snowPos.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 84,
          Math.random() * 24,
          (Math.random() - 0.5) * 76 + 18,
        ),
      );
      this.snowPhase.push(Math.random() * Math.PI * 2);
    }
    this.scene.add(this.snowMesh);

    // Visible 3D Jagged Lightning Bolt + Glow (12 cylinder segments: 9 main trunk + 3 branches)
    this.lightningBoltGroup = new THREE.Group();
    this.lightningBoltGroup.visible = false;
    const boltSegGeo = new THREE.CylinderGeometry(0.11, 0.16, 1, 6);
    const boltGlowGeo = new THREE.CylinderGeometry(0.36, 0.46, 1, 6);
    this.lightningCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });
    this.lightningGlowMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 12; i++) {
      const core = new THREE.Mesh(boltSegGeo, this.lightningCoreMat);
      const glow = new THREE.Mesh(boltGlowGeo, this.lightningGlowMat);
      this.lightningBoltGroup.add(glow, core);
      this.lightningBoltSegs.push({ core, glow });
    }
    this.scene.add(this.lightningBoltGroup);

    this.extraDisposables.push(
      rainGeo,
      rainMat,
      snowGeo,
      snowMat,
      boltSegGeo,
      boltGlowGeo,
      this.lightningCoreMat,
      this.lightningGlowMat,
    );
    this.applyWeatherMood();
  }

  private regenerateLightningBolt(strikeX: number, strikeZ: number): void {
    const _up = new THREE.Vector3(0, 1, 0);
    const _dir = new THREE.Vector3();
    const _mid = new THREE.Vector3();
    const pts: THREE.Vector3[] = [];
    const mainSteps = 9;
    let cx = strikeX + (Math.random() - 0.5) * 6;
    let cz = strikeZ + (Math.random() - 0.5) * 4;
    pts.push(new THREE.Vector3(cx, 54, cz));
    for (let i = 1; i <= mainSteps; i++) {
      const t = i / mainSteps;
      const jitter = (1 - t * 0.65) * 3.8;
      cx = THREE.MathUtils.lerp(cx, strikeX, 0.25) + (Math.random() - 0.5) * jitter;
      cz = THREE.MathUtils.lerp(cz, strikeZ, 0.25) + (Math.random() - 0.5) * jitter * 0.6;
      pts.push(new THREE.Vector3(cx, 54 * (1 - t), cz));
    }

    const setSeg = (
      seg: { core: THREE.Mesh; glow: THREE.Mesh },
      a: THREE.Vector3,
      b: THREE.Vector3,
      scaleWidth = 1,
    ) => {
      _dir.subVectors(b, a);
      const len = Math.max(0.2, _dir.length());
      _dir.normalize();
      _mid.addVectors(a, b).multiplyScalar(0.5);
      seg.core.position.copy(_mid);
      seg.glow.position.copy(_mid);
      seg.core.quaternion.setFromUnitVectors(_up, _dir);
      seg.glow.quaternion.copy(seg.core.quaternion);
      seg.core.scale.set(scaleWidth, len, scaleWidth);
      seg.glow.scale.set(scaleWidth * 1.25, len, scaleWidth * 1.25);
    };

    for (let i = 0; i < mainSteps; i++) {
      setSeg(this.lightningBoltSegs[i], pts[i], pts[i + 1], 1 - i * 0.04);
    }
    // 3 Dramatic sky forks
    for (let b = 0; b < 3; b++) {
      const startPt = pts[2 + b * 2];
      const forkEnd = new THREE.Vector3(
        startPt.x + (b % 2 === 0 ? 1 : -1) * (3.5 + Math.random() * 4.5),
        Math.max(4, startPt.y - (7 + Math.random() * 7)),
        startPt.z + (Math.random() - 0.5) * 3.5,
      );
      setSeg(this.lightningBoltSegs[mainSteps + b], startPt, forkEnd, 0.55);
    }
  }

  private applyWeatherMood(): void {
    if (!this.scene || !this.rainMesh || !this.snowMesh) return;
    const isRainOrStorm = this.weather === 'rain' || this.weather === 'storm';
    this.rainMesh.visible = isRainOrStorm;
    this.snowMesh.visible = this.weather === 'snow';
    if (this.stadium?.mudPuddlesGroup) {
      this.stadium.mudPuddlesGroup.visible = isRainOrStorm;
    }
    this.lightningFlash = 0;
    if (this.lightningLight) this.lightningLight.intensity = 0;
    if (this.lightningBoltGroup) this.lightningBoltGroup.visible = false;
    this.onLightningFlash?.(0);

    if (this.weather === 'storm') {
      this.lightningNextTimer = 1.4 + Math.random() * 2.2;
    } else if (this.weather === 'rain') {
      this.lightningNextTimer = 6.5 + Math.random() * 5.5;
    }

    let skyHex = 0x071226;
    let fogDensity = 0.0046;
    let hemiInt = 1.02;
    let keyInt = 2.4;
    let rimInt = 1.2;

    if (this.weather === 'rain') {
      skyHex = 0x0b1628;
      fogDensity = 0.0086;
      hemiInt = 0.82;
      keyInt = 1.75;
      rimInt = 1.35;
    } else if (this.weather === 'snow') {
      skyHex = 0x16243a;
      fogDensity = 0.0105;
      hemiInt = 1.18;
      keyInt = 1.9;
      rimInt = 1.45;
    } else if (this.weather === 'storm') {
      skyHex = 0x040914;
      fogDensity = 0.0112;
      hemiInt = 0.58;
      keyInt = 1.25;
      rimInt = 1.05;
    }

    (this.scene.background as THREE.Color).setHex(skyHex);
    this.scene.fog = new THREE.FogExp2(skyHex, fogDensity);
    if (this.hemiLight) this.hemiLight.intensity = hemiInt;
    if (this.keyLight) this.keyLight.intensity = keyInt;
    if (this.rimLight) this.rimLight.intensity = rimInt;
  }

  private updateWeather(dt: number): void {
    if (!this.rainMesh || !this.snowMesh) return;

    const focusZ =
      this.mode === 'match'
        ? this.getMatchBallPosition().z
        : this.ballStart.z * 0.55;

    if (this.weather === 'rain' || this.weather === 'storm') {
      const isStorm = this.weather === 'storm';
      const windVx = (isStorm ? 7.2 : 2.1) + this.effectiveWind.x * 1.4;
      const tiltZ = Math.atan2(windVx, 24);
      const speedMult = isStorm ? 1.38 : 1.0;

      for (let i = 0; i < this.rainPos.length; i++) {
        const p = this.rainPos[i];
        p.y -= this.rainSpeed[i] * speedMult * dt;
        p.x += windVx * dt;
        if (p.y < 0.05) {
          p.y = 22 + Math.random() * 5;
          p.x = (Math.random() - 0.5) * 84;
          p.z = focusZ + (Math.random() - 0.5) * 76;
        }
        if (p.x > 44) p.x -= 88;
        if (p.x < -44) p.x += 88;

        _weatherObj.position.copy(p);
        _weatherObj.rotation.set(0, 0, tiltZ);
        _weatherObj.scale.set(1, isStorm ? 1.28 : 1.0, 1);
        _weatherObj.updateMatrix();
        this.rainMesh.setMatrixAt(i, _weatherObj.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.weather === 'snow') {
      for (let i = 0; i < this.snowPos.length; i++) {
        const p = this.snowPos[i];
        const phase = this.snowPhase[i];
        p.y -= (2.4 + (i % 5) * 0.35) * dt;
        p.x +=
          (Math.sin(this.elapsedTotal * 1.8 + phase) * 1.15 +
            this.effectiveWind.x * 0.6) *
          dt;
        p.z += Math.cos(this.elapsedTotal * 1.5 + phase) * 0.75 * dt;
        if (p.y < 0.05) {
          p.y = 21 + Math.random() * 4;
          p.x = (Math.random() - 0.5) * 84;
          p.z = focusZ + (Math.random() - 0.5) * 76;
        }
        _weatherObj.position.copy(p);
        _weatherObj.rotation.set(
          this.elapsedTotal + phase,
          this.elapsedTotal * 0.7,
          0,
        );
        _weatherObj.scale.setScalar(1);
        _weatherObj.updateMatrix();
        this.snowMesh.setMatrixAt(i, _weatherObj.matrix);
      }
      this.snowMesh.instanceMatrix.needsUpdate = true;
    }

    // Periodic Storm & Rain Lightning Strike + Visible 3D Bolt + Full-Screen Flash + Loud Thunder Boom
    if (this.weather === 'storm' || this.weather === 'rain') {
      const isStorm = this.weather === 'storm';
      this.lightningNextTimer -= dt;
      if (this.lightningNextTimer <= 0) {
        this.lightningFlash = 1.0;
        this.lightningNextTimer = isStorm
          ? 3.2 + Math.random() * 4.4
          : 9.0 + Math.random() * 7.5;
        const strikeX = (Math.random() - 0.5) * 58;
        const strikeZ = THREE.MathUtils.clamp(
          focusZ - 16 + (Math.random() - 0.5) * 28,
          -22,
          PITCH_LENGTH + 18,
        );
        this.lightningLight.position.set(strikeX, 46, strikeZ);
        this.regenerateLightningBolt(strikeX, strikeZ);
        soundEngine.playThunder();
      }

      if (this.lightningFlash > 0) {
        this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.35);
        // Classic realistic double-flash pulse
        const doublePulse =
          this.lightningFlash > 0.48 && this.lightningFlash < 0.68
            ? 0.25
            : this.lightningFlash > 0.28 && this.lightningFlash <= 0.48
            ? 1.15
            : 1.0;
        const intensity = Math.min(1, this.lightningFlash * doublePulse);
        this.lightningLight.intensity = intensity * 380;

        if (this.lightningBoltGroup) {
          this.lightningBoltGroup.visible = intensity > 0.14;
          this.lightningCoreMat.opacity = Math.min(1, intensity * 1.15);
          this.lightningGlowMat.opacity = Math.min(0.78, intensity * 0.72);
        }

        const baseHemi = isStorm ? 0.58 : 0.82;
        const baseKey = isStorm ? 1.25 : 1.75;
        if (this.hemiLight) this.hemiLight.intensity = baseHemi + intensity * 2.4;
        if (this.keyLight) this.keyLight.intensity = baseKey + intensity * 2.8;

        const skyColor = this.scene.background as THREE.Color;
        const baseR = isStorm ? 0.015 : 0.043;
        const baseG = isStorm ? 0.035 : 0.086;
        const baseB = isStorm ? 0.078 : 0.157;
        skyColor.setRGB(
          Math.min(1, baseR + intensity * 0.75),
          Math.min(1, baseG + intensity * 0.82),
          Math.min(1, baseB + intensity * 0.94),
        );
        this.onLightningFlash?.(intensity);
      } else {
        if (this.lightningBoltGroup && this.lightningBoltGroup.visible) {
          this.lightningBoltGroup.visible = false;
        }
        const baseSky = isStorm ? 0x040914 : 0x0b1628;
        (this.scene.background as THREE.Color).setHex(baseSky);
        if (this.hemiLight) this.hemiLight.intensity = isStorm ? 0.58 : 0.82;
        if (this.keyLight) this.keyLight.intensity = isStorm ? 1.25 : 1.75;
        this.onLightningFlash?.(0);
      }
    }
  }

  private updateCamera(dt: number): void {
    const targetPos = _v1;
    const targetLook = _v2;
    let targetFov = 48;

    if (this.mode === 'match') {
      const bp = this.getMatchBallPosition();
      if (this.paused) {
        targetPos.set(
          Math.sin(this.elapsedTotal * 0.14) * 18,
          14.5,
          PITCH_HALF_L + Math.cos(this.elapsedTotal * 0.14) * 18,
        );
        targetLook.set(0, 0.8, PITCH_HALF_L);
        targetFov = 48;
      } else if (this.cameraPreset === 'broadcast') {
        targetPos.set(42, 20.5, THREE.MathUtils.clamp(bp.z + 4, 24, PITCH_LENGTH - 18));
        targetLook.set(bp.x * 0.4, 0.6, bp.z);
        targetFov = 47;
      } else {
        targetPos.set(
          THREE.MathUtils.clamp(bp.x * 0.45, -21, 21),
          11.6,
          THREE.MathUtils.clamp(bp.z + 18.0, 14, PITCH_LENGTH + 12),
        );
        targetLook.set(bp.x * 0.65, 0.7, Math.max(-1, bp.z - 8.0));
        targetFov = 50;
      }
    } else if (this.paused) {
      targetPos.set(
        Math.sin(this.elapsedTotal * 0.16) * 8.5,
        4.6,
        this.ballStart.z + 5.8,
      );
      targetLook.set(0, 1.35, 4.0);
      targetFov = 46;
    } else if (this.phase === 'aiming' || this.phase === 'charging' || this.phase === 'runup') {
      const setup = this.getDesiredSetupCamera();
      targetPos.copy(setup.pos);
      targetLook.copy(setup.lookAt);
      targetFov = this.phase === 'charging' || this.phase === 'runup' ? 46 : 48;
    } else if (this.phase === 'flight' && this.simState) {
      const bp = this.simState.pos;
      if (this.turnRole === 'gk') {
        targetPos.set(
          THREE.MathUtils.clamp(this.gkCurrentX * 0.25, -1.6, 1.6),
          2.05,
          -4.05,
        );
        targetLook.set(
          bp.x * 0.72,
          Math.max(0.85, bp.y * 0.85),
          Math.max(0.4, bp.z * 0.75),
        );
        targetFov = 50;
      } else {
        targetPos.set(
          THREE.MathUtils.clamp(bp.x * 0.55, -8, 8),
          Math.max(2.1, bp.y + 1.4),
          Math.max(7.5, bp.z + 6.8),
        );
        targetLook.set(bp.x * 0.6, Math.max(0.9, bp.y * 0.7), Math.max(-1.2, bp.z - 4));
        targetFov = 52;
      }
    } else if (this.phase === 'replay') {
      const bp = this.ballObj.mesh.position;
      // Dramatic low-angle sideline/goal corner camera
      targetPos.set(
        this.ballStart.x >= 0 ? -8.5 : 8.5,
        2.6,
        Math.max(3.5, bp.z * 0.45 + 3.5),
      );
      targetLook.set(bp.x * 0.85, Math.max(1.0, bp.y), bp.z * 0.85);
      targetFov = 44;
    } else {
      // Result / Match Over dramatic celebration camera sweep
      const sweep = this.goalCelebrateTimer > 0 ? Math.sin(this.elapsedTotal * 1.4) * 1.2 : 0;
      targetPos.set(
        (this.ballStart.x >= 0 ? -5.8 : 5.8) + sweep,
        this.goalCelebrateTimer > 0 ? 2.1 : 2.35,
        this.goalCelebrateTimer > 0 ? 8.2 : 9.2,
      );
      targetLook.set(0, 1.25, -0.5);
      targetFov = this.goalCelebrateTimer > 0 ? 43 : 46;
    }

    // Apply free 360-degree spherical camera orbit & zoom when user rotates angle
    if (
      !this.paused &&
      (Math.abs(this.camOrbitYaw) > 0.0005 ||
        Math.abs(this.camOrbitPitch) > 0.0005 ||
        Math.abs(this.camZoomMult - 1) > 0.0005)
    ) {
      _v3.subVectors(targetPos, targetLook);
      _camSpherical.setFromVector3(_v3);
      _camSpherical.radius = THREE.MathUtils.clamp(
        _camSpherical.radius * this.camZoomMult,
        2.4,
        92,
      );
      _camSpherical.theta += this.camOrbitYaw;
      _camSpherical.phi = THREE.MathUtils.clamp(
        _camSpherical.phi + this.camOrbitPitch,
        0.12,
        Math.PI * 0.485,
      );
      _v3.setFromSpherical(_camSpherical);
      targetPos.copy(targetLook).add(_v3);
    }

    // Subtle celebration / woodwork / strike impact micro-shake
    if (this.impactShakeTimer > 0) {
      this.impactShakeTimer = Math.max(0, this.impactShakeTimer - dt);
      const amp = Math.min(0.14, this.impactShakeTimer * 0.55);
      targetPos.x += Math.sin(this.elapsedTotal * 72) * amp;
      targetPos.y += Math.cos(this.elapsedTotal * 61) * amp * 0.75;
    } else if (this.goalCelebrateTimer > 2.32 && this.goalIsSuper) {
      targetPos.x += Math.sin(this.elapsedTotal * 65) * 0.14;
      targetPos.y += Math.cos(this.elapsedTotal * 55) * 0.1;
    }

    const lambda = this.isOrbitDragging
      ? 16.0
      : this.phase === 'flight'
      ? 5.5
      : 6.2;
    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, targetPos.x, lambda, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, targetPos.y, lambda, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, targetPos.z, lambda, dt);

    this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, targetLook.x, lambda, dt);
    this.camTarget.y = THREE.MathUtils.damp(this.camTarget.y, targetLook.y, lambda, dt);
    this.camTarget.z = THREE.MathUtils.damp(this.camTarget.z, targetLook.z, lambda, dt);

    this.camFov = THREE.MathUtils.damp(this.camFov, targetFov, 4.5, dt);
    if (Math.abs(this.camera.fov - this.camFov) > 0.05) {
      this.camera.fov = this.camFov;
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    this.stadium.dispose();
    this.ballObj.dispose();
    this.goalkeeper.dispose();
    this.kickerPlayer?.dispose();
    this.teammatePlayer?.dispose();
    this.wallPlayers.forEach((p) => p.dispose());
    this.boxDefenders.forEach((d) => d.player.dispose());
    this.cleanupMatchEntities();
    this.extraDisposables.forEach((d) => d.dispose());

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
