import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Camera,
  RotateCcw,
  CornerUpLeft,
  CornerUpRight,
  Zap,
  ShieldAlert,
  MoveHorizontal,
  Repeat,
  Send,
  UserPlus,
  Navigation,
  Minus,
  Plus,
  Compass,
  Flame,
  Wind,
  FastForward,
} from 'lucide-react';
import { Language } from '../game/fcData';
import {
  CameraPreset,
  CURVE_LAB_SPOTS,
  Difficulty,
  DIFFICULTY_LABELS,
  DribbleSkillType,
  GameSnapshot,
  GK_ORDER,
  GK_PROFILES,
  GoalkeeperId,
  KICKER_ORDER,
  KICKER_PROFILES,
  KickerId,
  MatchFormat,
  PLAYER_SKINS,
  PlayerSkinId,
  PRACTICE_SPOTS,
  PracticeFocus,
  RUNNING_AURA_ORDER,
  RUNNING_AURAS,
  RunningAuraId,
  ShotSkillType,
  SKIN_ORDER,
  SpinInput,
  TEAM_PROFILES,
  WeatherType,
  WindState,
} from '../game/types';

interface BottomDockProps {
  snapshot: GameSnapshot;
  lang: Language;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSpinChange: (spin: SpinInput) => void;
  onPowerChange: (power: number) => void;
  onNudgeAim: (dx: number, dy: number) => void;
  onQuickShoot: () => void;
  onBeginCharge: () => void;
  onBeginCurveCharge: (dir?: 'left' | 'right') => void;
  onBeginHorizontalCurve: (dir: 'left' | 'right') => void;
  onShootCrossHeader: () => void;
  onReleaseCharge: () => void;
  onSelectSpot: (spotId: string) => void;
  onSetPracticeFocus: (focus: PracticeFocus) => void;
  onSetDifficulty: (diff: Difficulty) => void;
  onSetKicker: (kickerId: KickerId) => void;
  onSetGoalkeeper: (gkId: GoalkeeperId) => void;
  onSetPlayerSkin: (skinId: PlayerSkinId) => void;
  onSetRunningAura: (auraId: RunningAuraId) => void;
  onSetMatchFormat: (format: MatchFormat) => void;
  onSetWeather: (weather: WeatherType) => void;
  onSetCustomWind: (wind: WindState) => void;
  onResetCustomWind: () => void;
  onSetShotSkill: (skill: ShotSkillType) => void;
  onBeginSkillCharge: (skill: ShotSkillType) => void;
  onGkDive: (dir: 'left' | 'center' | 'right') => void;
  onSetCamera: (preset: CameraPreset) => void;
  onToggleCameraOrbit: () => void;
  onResetCameraOrbit: () => void;
  onNudgeCameraOrbit: (dYaw: number, dPitch: number) => void;
  onRetrySpot: () => void;
  onMatchPass: () => void;
  onMatchLobPass: () => void;
  onMatchShoot: () => void;
  onMatchSwitchPlayer: () => void;
  onMatchMoveInput: (x: number, z: number) => void;
  onMatchSprintChange: (active: boolean) => void;
  onMatchAutoAssistChange: (active: boolean) => void;
  onMatchDribbleSkill: (skill: DribbleSkillType) => void;
  onMatchSlideTackle: () => void;
  onSkipMatchGoal: () => void;
}

const WEATHER_OPTIONS: Array<{
  id: WeatherType;
  labelVi: string;
  labelEn: string;
}> = [
  { id: 'clear', labelVi: 'Quang', labelEn: 'Clear' },
  { id: 'rain', labelVi: 'Mưa', labelEn: 'Rain' },
  { id: 'snow', labelVi: 'Tuyết', labelEn: 'Snow' },
  { id: 'storm', labelVi: 'Bão Sét', labelEn: 'Storm' },
];

const SKILL_OPTIONS: Array<{
  id: ShotSkillType;
  labelVi: string;
  labelEn: string;
}> = [
  { id: 'normal', labelVi: 'Thường', labelEn: 'Normal' },
  { id: 'curler', labelVi: 'Cứa Lòng', labelEn: 'Curler' },
  { id: 'trivela', labelVi: 'Trivela', labelEn: 'Trivela' },
  { id: 'knuckle', labelVi: 'Knuckle', labelEn: 'Knuckle' },
  { id: 'dip_topspin', labelVi: 'Topspin', labelEn: 'Topspin' },
  { id: 'power_shot', labelVi: 'Power Shot', labelEn: 'Power Shot' },
  { id: 'bicycle_volley', labelVi: 'Ngả Bàn Đèn', labelEn: 'Bicycle' },
  { id: 'rabona', labelVi: 'Rabona', labelEn: 'Rabona' },
  { id: 'chip_panenka', labelVi: 'Lốp Panenka', labelEn: 'Panenka' },
];

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'pro', 'extreme'];

export function BottomDock({
  snapshot,
  lang,
  collapsed,
  onToggleCollapse,
  onSpinChange,
  onPowerChange,
  onNudgeAim,
  onQuickShoot,
  onBeginCharge,
  onBeginCurveCharge,
  onBeginHorizontalCurve,
  onShootCrossHeader,
  onReleaseCharge,
  onSelectSpot,
  onSetPracticeFocus,
  onSetDifficulty,
  onSetKicker,
  onSetGoalkeeper,
  onSetPlayerSkin,
  onSetRunningAura,
  onSetMatchFormat,
  onSetWeather,
  onSetCustomWind,
  onResetCustomWind,
  onSetShotSkill,
  onBeginSkillCharge,
  onGkDive,
  onSetCamera,
  onToggleCameraOrbit,
  onResetCameraOrbit,
  onNudgeCameraOrbit,
  onRetrySpot,
  onMatchPass,
  onMatchLobPass,
  onMatchShoot,
  onMatchSwitchPlayer,
  onMatchMoveInput,
  onMatchSprintChange,
  onMatchAutoAssistChange,
  onMatchDribbleSkill,
  onMatchSlideTackle,
  onSkipMatchGoal,
}: BottomDockProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const powerBarRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const [draggingSpin, setDraggingSpin] = useState(false);
  const [draggingPower, setDraggingPower] = useState(false);
  const [joyActive, setJoyActive] = useState(false);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const [sprintOn, setSprintOn] = useState(false);
  const [autoRunOn, setAutoRunOn] = useState(false);
  const [padStyle, setPadStyle] = useState<'dpad' | 'stick'>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768
      ? 'dpad'
      : 'stick',
  );
  const [pressedDirs, setPressedDirs] = useState<{
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
  }>({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const mapDir = (
      e: KeyboardEvent,
    ): 'w' | 'a' | 's' | 'd' | null => {
      const code = e.code;
      const k = (e.key || '').toLowerCase();
      if (code === 'KeyW' || code === 'ArrowUp' || k === 'w' || k === 'ư')
        return 'w';
      if (code === 'KeyS' || code === 'ArrowDown' || k === 's') return 's';
      if (
        code === 'KeyA' ||
        code === 'ArrowLeft' ||
        k === 'a' ||
        k === 'ă' ||
        k === 'â'
      )
        return 'a';
      if (code === 'KeyD' || code === 'ArrowRight' || k === 'd' || k === 'đ')
        return 'd';
      return null;
    };
    const onDown = (e: KeyboardEvent) => {
      const dir = mapDir(e);
      if (dir) {
        setPressedDirs((prev) => (prev[dir] ? prev : { ...prev, [dir]: true }));
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const dir = mapDir(e);
      if (dir) {
        setPressedDirs((prev) =>
          !prev[dir] ? prev : { ...prev, [dir]: false },
        );
      }
    };
    const onBlur = () =>
      setPressedDirs({ w: false, a: false, s: false, d: false });

    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const isMatchMode = snapshot.mode === 'match';
  const isGkTurn = snapshot.turnRole === 'gk';
  const canShoot =
    snapshot.phase === 'aiming' || snapshot.phase === 'charging';
  const canDive =
    isGkTurn &&
    (snapshot.phase === 'aiming' ||
      snapshot.phase === 'runup' ||
      snapshot.phase === 'flight');
  const canPlayMatch = isMatchMode && snapshot.phase === 'playing';

  useEffect(() => {
    if (!canPlayMatch) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }
      if (e.code === 'KeyF' || (e.key || '').toLowerCase() === 'f') {
        e.preventDefault();
        const next = !autoRunOn;
        setAutoRunOn(next);
        onMatchAutoAssistChange(next);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canPlayMatch, autoRunOn, onMatchAutoAssistChange]);

  const activeKicker = KICKER_PROFILES[snapshot.kickerId];
  const activeGk = GK_PROFILES[snapshot.gkId];
  const botKicker = KICKER_PROFILES[snapshot.activeBotKickerId];
  const homeTeam = TEAM_PROFILES[snapshot.homeTeamId];
  const awayTeam = TEAM_PROFILES[snapshot.awayTeamId];

  const updatePowerFromPointer = (clientX: number) => {
    const el = powerBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0.18, ratio));
    onPowerChange(Number(clamped.toFixed(2)));
  };

  const updateSpinFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
    const len = Math.hypot(nx, ny);
    const clampedX = len > 1 ? nx / len : nx;
    const clampedY = len > 1 ? ny / len : ny;

    onSpinChange({
      curve: Number(clampedX.toFixed(2)),
      dip: Number((-clampedY).toFixed(2)),
    });
  };

  const windDirLabel =
    Math.abs(snapshot.scenario.wind.x) < 0.15
      ? 'Lặng gió'
      : `${Math.abs(snapshot.scenario.wind.x).toFixed(1)} m/s ${
          snapshot.scenario.wind.x > 0 ? '→' : '←'
        }`;

  const spinText =
    Math.abs(snapshot.spin.curve) < 0.12
      ? 'Sút Thẳng'
      : snapshot.spin.curve < 0
      ? `Xoáy Trái ${Math.round(Math.abs(snapshot.spin.curve) * 100)}%`
      : `Xoáy Phải ${Math.round(Math.abs(snapshot.spin.curve) * 100)}%`;

  const powerPct = Math.round(snapshot.power * 100);
  const isCornerSpot =
    snapshot.scenario.ballPos.z <= 2.4 &&
    Math.abs(snapshot.scenario.ballPos.x) >= 24;
  const canCrossHeader =
    snapshot.mode !== 'impossible' &&
    (snapshot.scenario.ballPos.z >= 10.5 || isCornerSpot);

  const showFloatingShoot = !isMatchMode && !isGkTurn && canShoot;

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      setJoyKnob({ x: 0, y: 0 });
      onMatchMoveInput(0, 0);
      return;
    }

    const ux = dx / dist;
    const uy = dy / dist;
    const visualMag = Math.min(1, dist / maxR);
    // Boost input so clicks/short drags move player smoothly at strong speed
    const moveMag = Math.min(1, Math.max(0.7, dist / (maxR * 0.55)));
    setJoyKnob({ x: ux * visualMag, y: uy * visualMag });
    onMatchMoveInput(
      Number((ux * moveMag).toFixed(3)),
      Number((uy * moveMag).toFixed(3)),
    );
  };

  const resetJoystick = () => {
    setJoyActive(false);
    setJoyKnob({ x: 0, y: 0 });
    onMatchMoveInput(0, 0);
  };

  const cycleCameraPreset = () => {
    const order: CameraPreset[] = ['kicker', 'broadcast', 'behind_goal'];
    const next = order[(order.indexOf(snapshot.cameraPreset) + 1) % order.length];
    onSetCamera(next);
  };

  if (isMatchMode) {
    if (snapshot.phase === 'match_goal') {
      const isHomeGoal = snapshot.matchGoalTeam !== 'away';
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-xl bg-[#09121f]/95 border border-amber-400/75 shadow-2xl select-none max-w-[95vw]">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white whitespace-nowrap">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm border border-white/30"
              style={{
                backgroundColor: isHomeGoal
                  ? homeTeam.jerseyColor
                  : awayTeam.jerseyColor,
              }}
              aria-hidden="true"
            />
            <span className={isHomeGoal ? 'text-emerald-300' : 'text-rose-300'}>
              {snapshot.matchGoalScorerName
                ? `${snapshot.matchGoalScorerName} · `
                : ''}
              {lang === 'vi' ? 'Đang ăn mừng bàn thắng' : 'Goal Celebration'}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onSkipMatchGoal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-extrabold text-xs sm:text-sm whitespace-nowrap cursor-pointer shadow-lg transition-all"
          >
            <FastForward size={15} fill="currentColor" />
            <span>
              {lang === 'vi' ? 'Bỏ Qua (Space)' : 'Skip (Space)'}
            </span>
          </button>
        </div>
      );
    }

    const renderDpadDirBtn = (
      x: number,
      z: number,
      dirKey: 'w' | 'a' | 's' | 'd',
      keyLabel: string,
      titleVi: string,
      icon: React.ReactNode,
    ) => {
      const activeKey = pressedDirs[dirKey];
      return (
        <button
          type="button"
          disabled={!canPlayMatch}
          aria-label={titleVi}
          title={titleVi}
          onPointerDown={(e) => {
            if (!canPlayMatch) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setPressedDirs((prev) => ({ ...prev, [dirKey]: true }));
            onMatchMoveInput(x, z);
          }}
          onPointerUp={() => {
            setPressedDirs((prev) => ({ ...prev, [dirKey]: false }));
            onMatchMoveInput(0, 0);
          }}
          onPointerCancel={() => {
            setPressedDirs((prev) => ({ ...prev, [dirKey]: false }));
            onMatchMoveInput(0, 0);
          }}
          onLostPointerCapture={() => {
            setPressedDirs((prev) => ({ ...prev, [dirKey]: false }));
            onMatchMoveInput(0, 0);
          }}
          className={`touch-none flex flex-col items-center justify-center w-10 h-10 rounded-lg border shadow-lg transition-colors select-none cursor-pointer ${
            !canPlayMatch
              ? 'bg-slate-900/70 border-white/5 text-slate-500 cursor-not-allowed'
              : activeKey
              ? 'bg-emerald-500 border-emerald-200 text-slate-950 scale-95'
              : 'bg-[#0B1320]/90 hover:bg-slate-800 border-white/20 text-white'
          }`}
        >
          {icon}
          <span className="text-[8.5px] font-mono-tabular font-bold opacity-80 leading-none">
            {keyLabel}
          </span>
        </button>
      );
    };

    return (
      <>
        {/* Bottom-Left Movement Controls: Compact PC D-Pad (WASD) or Analog Stick */}
        <div className="fixed bottom-2.5 left-3 sm:left-4 z-30 flex items-end gap-2 select-none">
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-1 bg-[#0B1320]/90 p-0.5 rounded-md border border-white/15 shadow">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  resetJoystick();
                  setPadStyle('dpad');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  padStyle === 'dpad'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {lang === 'vi' ? 'Nút PC' : 'PC Pad'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  resetJoystick();
                  setPadStyle('stick');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  padStyle === 'stick'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {lang === 'vi' ? 'Cần Kéo' : 'Stick'}
              </button>
            </div>

            {padStyle === 'dpad' ? (
              <div className="grid grid-cols-3 gap-1">
                <div />
                {renderDpadDirBtn(0, -1, 'w', '(W)', 'Chạy lên (W / ↑)', <ArrowUp size={14} />)}
                <div />
                {renderDpadDirBtn(-1, 0, 'a', '(A)', 'Chạy trái (A / ←)', <ArrowLeft size={14} />)}
                <button
                  type="button"
                  disabled={!canPlayMatch}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    const next = !autoRunOn;
                    setAutoRunOn(next);
                    onMatchAutoAssistChange(next);
                  }}
                  title={
                    lang === 'vi'
                      ? 'Bật/Tắt Tự Chạy theo bóng hoặc hướng lên gôn (Phím F)'
                      : 'Toggle Auto-Run toward ball/goal (F)'
                  }
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg border shadow-lg transition-colors cursor-pointer ${
                    autoRunOn
                      ? 'bg-sky-400 border-sky-200 text-slate-950'
                      : 'bg-slate-900/90 hover:bg-slate-800 border-white/15 text-sky-300'
                  } ${!canPlayMatch ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Navigation size={12} />
                  <span className="text-[8px] font-extrabold leading-none mt-0.5">
                    {lang === 'vi' ? 'TỰ (F)' : 'AUTO'}
                  </span>
                </button>
                {renderDpadDirBtn(1, 0, 'd', '(D)', 'Chạy phải (D / →)', <ArrowRight size={14} />)}
                <div />
                {renderDpadDirBtn(0, 1, 's', '(S)', 'Chạy lùi (S / ↓)', <ArrowDown size={14} />)}
                <div />
              </div>
            ) : (
              <div
                ref={joyRef}
                role="application"
                aria-label={
                  lang === 'vi'
                    ? 'Cần điều khiển chạy cầu thủ 3D'
                    : '3D Player Movement Joystick'
                }
                onPointerDown={(e) => {
                  if (!canPlayMatch) return;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setJoyActive(true);
                  updateJoystickFromPointer(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!joyActive || !canPlayMatch) return;
                  updateJoystickFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => resetJoystick()}
                onPointerCancel={() => resetJoystick()}
                onLostPointerCapture={() => resetJoystick()}
                className={`relative w-[114px] h-[114px] rounded-full bg-[#0B1320]/85 border-2 shadow-2xl touch-none select-none flex items-center justify-center transition-colors ${
                  canPlayMatch
                    ? joyActive
                      ? 'border-emerald-400 cursor-grabbing'
                      : 'border-emerald-400/40 hover:border-emerald-400/70 cursor-grab'
                    : 'border-white/10 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="pointer-events-none absolute inset-3 rounded-full border border-white/10" />
                <ArrowUp size={12} className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 text-slate-400" />
                <ArrowDown size={12} className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-slate-400" />
                <ArrowLeft size={12} className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <ArrowRight size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />

                <div
                  className={`pointer-events-none w-11 h-11 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform duration-75 ${
                    joyActive
                      ? 'bg-emerald-400 border-white text-slate-950 scale-105'
                      : 'bg-emerald-500/90 border-emerald-200/80 text-slate-950'
                  }`}
                  style={{
                    transform: `translate(${joyKnob.x * 32}px, ${joyKnob.y * 32}px)`,
                  }}
                >
                  <span className="text-[9px] font-extrabold tracking-wide">
                    {lang === 'vi' ? 'CHẠY' : 'MOVE'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-1 flex flex-col gap-1">
            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                const next = !autoRunOn;
                setAutoRunOn(next);
                onMatchAutoAssistChange(next);
              }}
              title={lang === 'vi' ? 'Tự chạy theo bóng (Phím F)' : 'Auto run (F)'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border shadow transition-colors cursor-pointer whitespace-nowrap ${
                autoRunOn
                  ? 'bg-sky-400 border-sky-200 text-slate-950'
                  : 'bg-[#0B1320]/88 hover:bg-slate-800 border-white/15 text-slate-200'
              } ${!canPlayMatch ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Navigation size={12} />
              <span>{lang === 'vi' ? 'Tự Chạy (F)' : 'Auto (F)'}</span>
            </button>

            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                const next = !sprintOn;
                setSprintOn(next);
                onMatchSprintChange(next);
              }}
              title={lang === 'vi' ? 'Bật/Tắt bứt tốc (Shift)' : 'Sprint (Shift)'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border shadow transition-colors cursor-pointer whitespace-nowrap ${
                sprintOn
                  ? 'bg-amber-400 border-amber-200 text-slate-950'
                  : 'bg-[#0B1320]/88 hover:bg-slate-800 border-white/15 text-slate-200'
              } ${!canPlayMatch ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Zap size={12} fill={sprintOn ? 'currentColor' : 'none'} />
              <span>{lang === 'vi' ? 'Bứt Tốc' : 'Sprint'}</span>
            </button>
          </div>
        </div>

        {/* Bottom-Center Compact Match Info, Difficulty & Camera (Desktop xl+) */}
        <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#0B1320]/90 border border-white/12 shadow-2xl">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm border border-white/30"
              style={{ backgroundColor: homeTeam.jerseyColor }}
              aria-hidden="true"
            />
            <span className="font-bold text-emerald-300">
              {homeTeam.shortCode}
            </span>
            <span className="font-mono-tabular text-slate-300">
              {snapshot.matchShotsHome} - {snapshot.matchShotsAway}
            </span>
            <span className="font-bold text-rose-300">{awayTeam.shortCode}</span>
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm border border-white/30"
              style={{
                backgroundColor:
                  homeTeam.id === awayTeam.id
                    ? awayTeam.altJerseyColor
                    : awayTeam.jerseyColor,
              }}
              aria-hidden="true"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-white/5">
            {DIFFICULTY_ORDER.map((diff) => {
              const info = DIFFICULTY_LABELS[diff];
              const active = snapshot.difficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetDifficulty(diff);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? diff === 'extreme'
                        ? 'bg-purple-500 text-white'
                        : diff === 'pro'
                        ? 'bg-rose-500 text-white'
                        : diff === 'medium'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetMatchFormat('5v5');
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                snapshot.matchFormat === '5v5'
                  ? 'bg-violet-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              5v5
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetMatchFormat('11v11');
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                snapshot.matchFormat === '11v11'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              11v11
            </button>
          </div>

          <select
            aria-label={lang === 'vi' ? 'Chọn Skin Cầu Thủ' : 'Player Skin'}
            value={snapshot.playerSkinId}
            onChange={(e) => {
              e.currentTarget.blur();
              onSetPlayerSkin(e.target.value as PlayerSkinId);
            }}
            className="h-8 px-2 bg-slate-900 border border-emerald-400/35 rounded-lg text-[11px] font-semibold text-emerald-200 focus:outline-none cursor-pointer"
          >
            {SKIN_ORDER.map((skinId) => (
              <option key={skinId} value={skinId}>
                {lang === 'vi' ? PLAYER_SKINS[skinId].nameVi : PLAYER_SKINS[skinId].nameEn}
              </option>
            ))}
          </select>

          <select
            aria-label={lang === 'vi' ? 'Hào Quang Chạy' : 'Running Aura'}
            value={snapshot.runningAuraId}
            onChange={(e) => {
              e.currentTarget.blur();
              onSetRunningAura(e.target.value as RunningAuraId);
            }}
            className="h-8 px-2 bg-slate-900 border border-amber-400/35 rounded-lg text-[11px] font-semibold text-amber-200 focus:outline-none cursor-pointer"
          >
            {RUNNING_AURA_ORDER.map((auraId) => (
              <option key={auraId} value={auraId}>
                {lang === 'vi' ? RUNNING_AURAS[auraId].nameVi : RUNNING_AURAS[auraId].nameEn}
              </option>
            ))}
          </select>

          <select
            aria-label={lang === 'vi' ? 'Thời tiết sân đấu' : 'Weather'}
            value={snapshot.weather}
            onChange={(e) => {
              e.currentTarget.blur();
              onSetWeather(e.target.value as WeatherType);
            }}
            className="h-8 px-2 bg-slate-900 border border-sky-400/35 rounded-lg text-[11px] font-semibold text-sky-200 focus:outline-none cursor-pointer"
          >
            {WEATHER_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>
                {lang === 'vi' ? `Thời tiết: ${w.labelVi}` : w.labelEn}
              </option>
            ))}
          </select>

          <select
            aria-label={lang === 'vi' ? 'Kỹ năng sút' : 'Shot Skill'}
            value={snapshot.shotSkill}
            onChange={(e) => {
              e.currentTarget.blur();
              onSetShotSkill(e.target.value as ShotSkillType);
            }}
            className="h-8 px-2 bg-slate-900 border border-fuchsia-400/35 rounded-lg text-[11px] font-semibold text-fuchsia-200 focus:outline-none cursor-pointer"
          >
            {SKILL_OPTIONS.map((sk) => (
              <option key={sk.id} value={sk.id}>
                {lang === 'vi' ? `Kỹ năng: ${sk.labelVi}` : sk.labelEn}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              cycleCameraPreset();
            }}
            title={lang === 'vi' ? 'Đổi góc camera (Phím V)' : 'Cycle camera (V)'}
            className="flex items-center gap-1.5 h-8 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-[11px] font-medium text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Camera size={13} />
            <span>
              {snapshot.cameraPreset === 'broadcast'
                ? lang === 'vi'
                  ? 'Toàn Sân (V)'
                  : 'Broadcast (V)'
                : snapshot.cameraPreset === 'behind_goal'
                ? lang === 'vi'
                  ? 'Gôn Bắc (V)'
                  : 'Goal Cam (V)'
                : lang === 'vi'
                ? 'Hành Động (V)'
                : 'Action (V)'}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCameraOrbit();
            }}
            title={
              lang === 'vi'
                ? 'Bật/Tắt kéo chuột xoay camera 360° (hoặc giữ chuột phải kéo mọi lúc)'
                : 'Toggle 360° camera orbit drag (or right-click drag anytime)'
            }
            className={`flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap cursor-pointer ${
              snapshot.cameraOrbitMode
                ? 'bg-sky-400 border-sky-200 text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-sky-300'
            }`}
          >
            <Compass size={13} />
            <span>{lang === 'vi' ? 'Xoay 360°' : '360° Cam'}</span>
          </button>

          {snapshot.cameraHasCustomOrbit ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onResetCameraOrbit();
              }}
              title={lang === 'vi' ? 'Đặt lại góc camera mặc định' : 'Reset camera angle'}
              className="flex items-center gap-1 h-8 px-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 rounded-lg text-[11px] font-bold text-amber-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{lang === 'vi' ? 'Đặt Lại' : 'Reset'}</span>
            </button>
          ) : null}
        </div>

        {/* Bottom-Right Slim Match Action Cluster */}
        <div className="fixed bottom-2.5 right-3 sm:right-4 z-30 flex flex-col items-end gap-1.5 select-none">
          {/* Compact Skin, Aura, Format, Camera & Difficulty bar for < xl */}
          <div className="flex xl:hidden items-center gap-1 flex-wrap justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetMatchFormat(snapshot.matchFormat === '11v11' ? '5v5' : '11v11');
              }}
              className="h-7 px-2 bg-violet-500/25 border border-violet-400/45 rounded-md text-[10.5px] font-extrabold text-violet-200 cursor-pointer"
            >
              {snapshot.matchFormat === '11v11' ? '11v11' : '5v5'}
            </button>
            <select
              aria-label={lang === 'vi' ? 'Skin Cầu Thủ' : 'Player Skin'}
              value={snapshot.playerSkinId}
              onChange={(e) => {
                e.currentTarget.blur();
                onSetPlayerSkin(e.target.value as PlayerSkinId);
              }}
              className="h-7 px-1.5 bg-[#0B1320]/90 border border-emerald-400/35 rounded-md text-[10.5px] font-semibold text-emerald-200 cursor-pointer"
            >
              {SKIN_ORDER.map((skinId) => (
                <option key={skinId} value={skinId}>
                  {lang === 'vi' ? PLAYER_SKINS[skinId].nameVi : PLAYER_SKINS[skinId].nameEn}
                </option>
              ))}
            </select>
            <select
              aria-label={lang === 'vi' ? 'Hào Quang' : 'Running Aura'}
              value={snapshot.runningAuraId}
              onChange={(e) => {
                e.currentTarget.blur();
                onSetRunningAura(e.target.value as RunningAuraId);
              }}
              className="h-7 px-1.5 bg-[#0B1320]/90 border border-amber-400/35 rounded-md text-[10.5px] font-semibold text-amber-200 cursor-pointer"
            >
              {RUNNING_AURA_ORDER.map((auraId) => (
                <option key={auraId} value={auraId}>
                  {lang === 'vi' ? RUNNING_AURAS[auraId].nameVi : RUNNING_AURAS[auraId].nameEn}
                </option>
              ))}
            </select>
            <select
              aria-label={lang === 'vi' ? 'Độ khó' : 'Difficulty'}
              value={snapshot.difficulty}
              onChange={(e) => {
                e.currentTarget.blur();
                onSetDifficulty(e.target.value as Difficulty);
              }}
              className="h-7 px-1.5 bg-[#0B1320]/90 border border-white/15 rounded-md text-[10.5px] font-semibold text-slate-200 cursor-pointer"
            >
              {DIFFICULTY_ORDER.map((diff) => (
                <option key={diff} value={diff}>
                  {DIFFICULTY_LABELS[diff].label}
                </option>
              ))}
            </select>
            <select
              aria-label={lang === 'vi' ? 'Thời tiết' : 'Weather'}
              value={snapshot.weather}
              onChange={(e) => {
                e.currentTarget.blur();
                onSetWeather(e.target.value as WeatherType);
              }}
              className="h-7 px-1.5 bg-[#0B1320]/90 border border-sky-400/35 rounded-md text-[10.5px] font-semibold text-sky-200 cursor-pointer"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {lang === 'vi' ? w.labelVi : w.labelEn}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                cycleCameraPreset();
              }}
              title={lang === 'vi' ? 'Đổi góc camera (Phím V)' : 'Cycle camera (V)'}
              className="flex items-center gap-1 h-7 px-2 bg-[#0B1320]/90 hover:bg-slate-800 border border-white/15 rounded-md text-[10.5px] font-semibold text-slate-200 cursor-pointer"
            >
              <Camera size={12} />
              <span>Cam</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCameraOrbit();
              }}
              title={lang === 'vi' ? 'Xoay camera 360°' : 'Toggle 360° camera orbit'}
              className={`flex items-center gap-1 h-7 px-1.5 rounded-md text-[10.5px] font-bold border cursor-pointer ${
                snapshot.cameraOrbitMode
                  ? 'bg-sky-400 border-sky-200 text-slate-950'
                  : 'bg-[#0B1320]/90 hover:bg-slate-800 border-white/15 text-sky-300'
              }`}
            >
              <Compass size={12} />
              <span>360°</span>
            </button>
            {snapshot.cameraHasCustomOrbit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onResetCameraOrbit();
                }}
                title={lang === 'vi' ? 'Đặt lại góc camera' : 'Reset camera angle'}
                className="flex items-center justify-center w-7 h-7 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 rounded-md text-amber-200 cursor-pointer"
              >
                <RotateCcw size={12} />
              </button>
            ) : null}
          </div>

          {/* Slim Single-Row / Compact Match Dribble Skills Bar */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[340px] sm:max-w-[520px]">
            {(
              [
                { id: 'stepover' as DribbleSkillType, labelVi: 'Đảo (1)', labelEn: 'Step (1)' },
                { id: 'roulette' as DribbleSkillType, labelVi: 'Compa (2)', labelEn: 'Spin (2)' },
                { id: 'elastico' as DribbleSkillType, labelVi: 'Elastico (3)', labelEn: 'Elast (3)' },
                { id: 'rainbow_flick' as DribbleSkillType, labelVi: 'Tâng (4)', labelEn: 'Flick (4)' },
                { id: 'maradona_spin' as DribbleSkillType, labelVi: 'Maradona (5)', labelEn: '360 (5)' },
                { id: 'heel_chop' as DribbleSkillType, labelVi: 'Chop (6)', labelEn: 'Chop (6)' },
                { id: 'ball_roll_dash' as DribbleSkillType, labelVi: 'Kéo (7)', labelEn: 'Roll (7)' },
              ]
            ).map((sk) => {
              const active = snapshot.activeDribbleSkill === sk.id;
              return (
                <button
                  key={sk.id}
                  type="button"
                  disabled={!canPlayMatch}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onMatchDribbleSkill(sk.id);
                  }}
                  className={`px-2 py-1 rounded-md text-[10.5px] font-bold border shadow transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-400 border-amber-200 text-slate-950'
                      : canPlayMatch
                      ? 'bg-[#0B1320]/90 hover:bg-slate-800 border-fuchsia-400/45 text-fuchsia-200'
                      : 'bg-slate-900/70 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {lang === 'vi' ? sk.labelVi : sk.labelEn}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                onMatchSwitchPlayer();
              }}
              title="Q / Tab"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border shadow transition-colors whitespace-nowrap cursor-pointer ${
                canPlayMatch
                  ? 'bg-[#0B1320]/90 hover:bg-slate-800 border-white/20 text-slate-100'
                  : 'bg-slate-900/70 border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Repeat size={13} />
              <span>{lang === 'vi' ? 'Đổi (Q)' : 'Switch (Q)'}</span>
            </button>

            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                onMatchLobPass();
              }}
              title="K / E"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow transition-colors whitespace-nowrap cursor-pointer ${
                canPlayMatch
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
              }`}
            >
              <UserPlus size={13} />
              <span>{lang === 'vi' ? 'Treo (K)' : 'Lob (K)'}</span>
            </button>

            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                onMatchPass();
              }}
              title="J / C"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow transition-colors whitespace-nowrap cursor-pointer ${
                canPlayMatch
                  ? 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                  : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send size={13} />
              <span>{lang === 'vi' ? 'Chuyền (J)' : 'Pass (J)'}</span>
            </button>

            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                onMatchSlideTackle();
              }}
              title={lang === 'vi' ? 'Soạt Bóng (Phím X)' : 'Slide Tackle (X)'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border shadow transition-colors whitespace-nowrap cursor-pointer ${
                canPlayMatch
                  ? 'bg-rose-500 hover:bg-rose-400 border-rose-200/70 text-white'
                  : 'bg-slate-800/70 border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShieldAlert size={13} />
              <span>{lang === 'vi' ? 'Soạt (X)' : 'Slide (X)'}</span>
            </button>

            <button
              type="button"
              disabled={!canPlayMatch}
              onClick={(e) => {
                e.currentTarget.blur();
                onMatchShoot();
              }}
              title="Space / Enter"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-display text-sm font-extrabold tracking-wide shadow-xl border transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                canPlayMatch
                  ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-200/80 text-slate-950'
                  : 'bg-slate-800/70 border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Zap size={15} fill="currentColor" />
              <span>
                {lang === 'vi'
                  ? snapshot.matchPossession === 'away'
                    ? 'CƯỚP (Space)'
                    : 'SÚT (Space)'
                  : snapshot.matchPossession === 'away'
                  ? 'TACKLE'
                  : 'SHOOT'}
              </span>
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showFloatingShoot ? (
        <div
          className={`fixed right-3 sm:right-5 z-30 flex items-center gap-2 ${
            collapsed ? 'bottom-4' : 'bottom-28 sm:bottom-24'
          }`}
        >
          {isCornerSpot && canCrossHeader ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onShootCrossHeader();
              }}
              title="Treo bóng bổng cho đồng đội #9 bật cao đánh đầu & đá bồi"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-display text-xs sm:text-sm font-extrabold tracking-wide shadow-xl border border-amber-200/80 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus size={15} />
              <span>{lang === 'vi' ? 'TREO ĐÁNH ĐẦU (#9)' : 'CROSS (#9)'}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onQuickShoot();
            }}
            title="Sút bóng ngay (Enter)"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-display text-sm sm:text-base font-extrabold tracking-wide shadow-xl border border-emerald-200/80 transition-all cursor-pointer whitespace-nowrap"
          >
            <Zap size={16} fill="currentColor" />
            <span>{lang === 'vi' ? 'SÚT BÓNG (Enter)' : 'SHOOT (Enter)'}</span>
          </button>
        </div>
      ) : null}

      <div
        className={`pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2 z-20 w-[min(98vw,1560px)] transition-transform duration-200 ${
          collapsed ? 'translate-y-[calc(100%-26px)]' : 'translate-y-0'
        }`}
      >
      {/* Slim Collapse / Expand Handle */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="pointer-events-auto flex items-center gap-1 px-2.5 py-0.5 bg-[#0B1320]/90 border border-white/10 rounded-md text-[10px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span>{collapsed ? 'Mở Bảng Điều Khiển (H)' : 'Thu Gọn (H)'}</span>
        </button>
      </div>

      {/* Main Flat Wide Dock Body */}
      <div className="pointer-events-auto bg-[#0B1320]/92 border border-white/12 rounded-xl px-2.5 py-1.5 shadow-2xl">
        {/* Top Flat Row: Kicker/GK + Practice Focus/Spot + Difficulty + Weather/Skin/Aura + Camera (Single Horizontal Scrollable Line) */}
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/10 overflow-x-auto">
          {isGkTurn ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10.5px] font-semibold text-amber-300 whitespace-nowrap">
                GK
              </span>
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-md border border-white/5">
                {GK_ORDER.map((id) => {
                  const gk = GK_PROFILES[id];
                  const active = snapshot.gkId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={snapshot.phase !== 'aiming'}
                      onClick={() => onSetGoalkeeper(id)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-amber-300 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      } ${
                        snapshot.phase !== 'aiming'
                          ? 'opacity-60 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: gk.jerseyColor }}
                        aria-hidden="true"
                      />
                      <span>{gk.shortName}</span>
                    </button>
                  );
                })}
              </div>
              {snapshot.mode === 'gk_practice' ? (
                <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-md border border-white/5">
                  <button
                    type="button"
                    onClick={() => onSetPracticeFocus('freekick')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      snapshot.practiceFocus === 'freekick'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Tập Bắt Sút Phạt
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetPracticeFocus('penalty')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      snapshot.practiceFocus === 'penalty'
                        ? 'bg-rose-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Tập Bắt Penalty
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-md border border-white/5">
                {KICKER_ORDER.map((id) => {
                  const k = KICKER_PROFILES[id];
                  const active = snapshot.kickerId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!canShoot}
                      onClick={() => onSetKicker(id)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-slate-100 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      } ${!canShoot ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: k.jerseyColor }}
                        aria-hidden="true"
                      />
                      <span className="font-mono-tabular text-[10px] opacity-75">
                        #{k.numberStr}
                      </span>
                      <span>{k.shortName}</span>
                    </button>
                  );
                })}
              </div>

              {snapshot.mode === 'practice' ? (
                <>
                  <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-md border border-white/10">
                    <button
                      type="button"
                      onClick={() => onSetPracticeFocus('freekick')}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        snapshot.practiceFocus === 'freekick'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Sút Phạt
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetPracticeFocus('penalty')}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        snapshot.practiceFocus === 'penalty'
                          ? 'bg-rose-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Penalty
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetPracticeFocus('corner')}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        snapshot.practiceFocus === 'corner'
                          ? 'bg-cyan-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Phạt Góc
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetPracticeFocus('curve_lab')}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        snapshot.practiceFocus === 'curve_lab'
                          ? 'bg-sky-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Xoáy
                    </button>
                  </div>

                  <select
                    aria-label="Chọn vị trí đá phạt"
                    value={snapshot.scenario.id}
                    onChange={(e) => onSelectSpot(e.target.value)}
                    className="h-6 px-1.5 bg-slate-900 border border-white/10 rounded-md text-[10.5px] font-medium text-slate-200 focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {(snapshot.practiceFocus === 'curve_lab'
                      ? CURVE_LAB_SPOTS
                      : PRACTICE_SPOTS
                    ).map((spot) => (
                      <option key={spot.id} value={spot.id}>
                        {spot.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          )}

          {/* Compact Right Controls: Difficulty, Weather, Skin, Aura, Camera & 360 Orbit */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-md border border-white/5">
              {DIFFICULTY_ORDER.map((diff) => {
                const info = DIFFICULTY_LABELS[diff];
                const active = snapshot.difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onSetDifficulty(diff)}
                    className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? diff === 'extreme'
                          ? 'bg-purple-500 text-white'
                          : diff === 'pro'
                          ? 'bg-rose-500 text-white'
                          : diff === 'medium'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>

            <select
              aria-label={lang === 'vi' ? 'Thời tiết sân đấu' : 'Stadium Weather'}
              value={snapshot.weather}
              onChange={(e) => onSetWeather(e.target.value as WeatherType)}
              className="h-6 px-1.5 bg-slate-900 border border-sky-400/35 rounded-md text-[10.5px] font-semibold text-sky-200 focus:outline-none cursor-pointer"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w.id} value={w.id}>
                  {lang === 'vi' ? w.labelVi : w.labelEn}
                </option>
              ))}
            </select>

            <select
              aria-label={lang === 'vi' ? 'Skin Cầu Thủ' : 'Player Skin'}
              value={snapshot.playerSkinId}
              onChange={(e) => onSetPlayerSkin(e.target.value as PlayerSkinId)}
              className="h-6 px-1.5 bg-slate-900 border border-emerald-400/35 rounded-md text-[10.5px] font-semibold text-emerald-200 focus:outline-none cursor-pointer"
            >
              {SKIN_ORDER.map((skinId) => (
                <option key={skinId} value={skinId}>
                  Skin: {lang === 'vi' ? PLAYER_SKINS[skinId].nameVi : PLAYER_SKINS[skinId].nameEn}
                </option>
              ))}
            </select>

            <select
              aria-label={lang === 'vi' ? 'Hào Quang Chạy' : 'Running Aura'}
              value={snapshot.runningAuraId}
              onChange={(e) => onSetRunningAura(e.target.value as RunningAuraId)}
              className="h-6 px-1.5 bg-slate-900 border border-amber-400/35 rounded-md text-[10.5px] font-semibold text-amber-200 focus:outline-none cursor-pointer"
            >
              {RUNNING_AURA_ORDER.map((auraId) => (
                <option key={auraId} value={auraId}>
                  {lang === 'vi' ? RUNNING_AURAS[auraId].nameVi : RUNNING_AURAS[auraId].nameEn}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => cycleCameraPreset()}
              title="Đổi góc camera (V)"
              className="flex items-center gap-1 h-6 px-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-md text-[10.5px] font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera size={12} />
              <span>
                {snapshot.cameraPreset === 'kicker'
                  ? 'Góc Sút'
                  : snapshot.cameraPreset === 'broadcast'
                  ? 'Toàn Cảnh'
                  : 'Sau Gôn'}
              </span>
            </button>

            <div className="flex items-center gap-0.5 bg-slate-900/95 p-0.5 rounded-md border border-sky-400/30">
              <button
                type="button"
                onClick={() => onToggleCameraOrbit()}
                title={
                  lang === 'vi'
                    ? 'Bật chế độ kéo chuột trái xoay camera 360°'
                    : 'Toggle 360° camera rotation'
                }
                className={`flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  snapshot.cameraOrbitMode
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-sky-300 hover:bg-slate-800'
                }`}
              >
                <Compass size={11} />
                <span>360°</span>
              </button>
              <button
                type="button"
                onClick={() => onNudgeCameraOrbit(-0.32, 0)}
                title="Xoay camera sang trái"
                aria-label="Xoay camera sang trái"
                className="flex items-center justify-center w-5 h-5 rounded text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft size={11} />
              </button>
              <button
                type="button"
                onClick={() => onNudgeCameraOrbit(0.32, 0)}
                title="Xoay camera sang phải"
                aria-label="Xoay camera sang phải"
                className="flex items-center justify-center w-5 h-5 rounded text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <ArrowRight size={11} />
              </button>
              <button
                type="button"
                onClick={() => onNudgeCameraOrbit(0, -0.18)}
                title="Nâng góc camera lên cao"
                aria-label="Nâng góc camera lên cao"
                className="flex items-center justify-center w-5 h-5 rounded text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <ArrowUp size={11} />
              </button>
              <button
                type="button"
                onClick={() => onNudgeCameraOrbit(0, 0.18)}
                title="Hạ góc camera xuống sát sân"
                aria-label="Hạ góc camera xuống sát sân"
                className="flex items-center justify-center w-5 h-5 rounded text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <ArrowDown size={11} />
              </button>
              {snapshot.cameraHasCustomOrbit ? (
                <button
                  type="button"
                  onClick={() => onResetCameraOrbit()}
                  title="Đặt lại góc camera"
                  className="flex items-center gap-0.5 h-5 px-1.5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-[10px] font-bold text-amber-200 whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw size={10} />
                </button>
              ) : null}
            </div>

            {snapshot.mode === 'practice' ? (
              <button
                type="button"
                onClick={onRetrySpot}
                title="Đặt lại bóng"
                className="flex items-center justify-center w-6 h-6 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-md text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Main Action Row: Playable GK Dive OR Ultra-Slim Edge-to-Edge Kicker Controls */}
        {isGkTurn ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/35 text-amber-300 shrink-0">
                <ShieldAlert size={17} />
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-300">
                  Bot #{botKicker.numberStr} {botKicker.shortName} đang chuẩn bị sút phạt!
                </div>
                <div className="text-[11px] text-slate-300">
                  {snapshot.scenario.label} · Gió: {windDirLabel} · Chạm thẳng khung thành để bắt bóng
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!canDive}
                onClick={() => onGkDive('left')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  canDive
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CornerUpLeft size={14} strokeWidth={2.5} />
                <span>Bay Trái (←)</span>
              </button>

              <button
                type="button"
                disabled={!canDive}
                onClick={() => onGkDive('center')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer border ${
                  canDive
                    ? 'bg-slate-800 hover:bg-slate-700 border-white/15 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                }`}
              >
                <ArrowUp size={14} strokeWidth={2.5} />
                <span>Nhảy Giữa (Space)</span>
              </button>

              <button
                type="button"
                disabled={!canDive}
                onClick={() => onGkDive('right')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  canDive
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Bay Phải (→)</span>
                <CornerUpRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            {/* Left: Compact Ball Contact / Spin Pad + Inline Slider & Quick Presets */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                ref={padRef}
                role="slider"
                aria-label="Điểm chạm xoáy bóng"
                aria-valuetext={spinText}
                tabIndex={0}
                onPointerDown={(e) => {
                  if (!canShoot) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDraggingSpin(true);
                  updateSpinFromPointer(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!draggingSpin) return;
                  updateSpinFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => setDraggingSpin(false)}
                onDoubleClick={() => onSpinChange({ curve: 0, dip: 0.15 })}
                className="relative w-11 h-11 rounded-full bg-slate-100 border-2 border-slate-300 shadow-inner cursor-crosshair shrink-0 overflow-hidden"
                title="Kéo điểm đỏ để chỉnh độ xoáy (Nháy đúp để đặt lại)"
              >
                <svg viewBox="0 0 64 64" className="w-full h-full opacity-25 pointer-events-none">
                  <polygon points="32,18 44,27 39,41 25,41 20,27" fill="#0f172a" />
                  <line x1="32" y1="0" x2="32" y2="64" stroke="#0f172a" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="0" y1="32" x2="64" y2="32" stroke="#0f172a" strokeWidth="1" strokeDasharray="2 2" />
                </svg>

                <div
                  className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-rose-500 border-2 border-white shadow pointer-events-none"
                  style={{
                    left: `${50 + snapshot.spin.curve * 38}%`,
                    top: `${50 - snapshot.spin.dip * 38}%`,
                  }}
                />
              </div>

              <div className="text-left">
                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="font-semibold text-white whitespace-nowrap">{spinText}</span>
                  <span className="font-mono-tabular font-semibold text-cyan-300">
                    {snapshot.previewBendMeters >= 0 ? '+' : '-'}
                    {Math.abs(snapshot.previewBendMeters).toFixed(1)}m
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() =>
                      onSpinChange({
                        curve: Number(Math.max(-1, snapshot.spin.curve - 0.15).toFixed(2)),
                        dip: snapshot.spin.dip,
                      })
                    }
                    title="Tăng xoáy trái (-15%)"
                    className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    ↶
                  </button>
                  <input
                    type="range"
                    aria-label="Chỉnh độ xoáy ngang"
                    min={-1}
                    max={1}
                    step={0.05}
                    disabled={!canShoot}
                    value={snapshot.spin.curve}
                    onChange={(e) =>
                      onSpinChange({
                        curve: Number(e.target.value),
                        dip: snapshot.spin.dip,
                      })
                    }
                    className="w-20 h-1 accent-cyan-400 cursor-pointer disabled:opacity-40"
                  />
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() =>
                      onSpinChange({
                        curve: Number(Math.min(1, snapshot.spin.curve + 0.15).toFixed(2)),
                        dip: snapshot.spin.dip,
                      })
                    }
                    title="Tăng xoáy phải (+15%)"
                    className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    ↷
                  </button>
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() => onSpinChange({ curve: -0.65, dip: 0.25 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer whitespace-nowrap ${
                      snapshot.spin.curve <= -0.35
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    } ${!canShoot ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Trái
                  </button>
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() => onSpinChange({ curve: 0, dip: 0.15 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer whitespace-nowrap ${
                      Math.abs(snapshot.spin.curve) < 0.12
                        ? 'bg-slate-200 text-slate-950 border-white'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    } ${!canShoot ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Thẳng
                  </button>
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() => onSpinChange({ curve: 0.65, dip: 0.25 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer whitespace-nowrap ${
                      snapshot.spin.curve >= 0.35
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    } ${!canShoot ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Phải
                  </button>
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() =>
                      onSpinChange({
                        curve: snapshot.spin.curve,
                        dip: snapshot.spin.dip >= 0.45 ? 0.1 : 0.65,
                      })
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer whitespace-nowrap ${
                      snapshot.spin.dip >= 0.45
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                    } ${!canShoot ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Chúi
                  </button>
                </div>
              </div>
            </div>

            {/* Right / Full Remaining Width: Power Bar + Aim + Shoot Buttons + Single-Line Skills Strip */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-300 whitespace-nowrap shrink-0 mr-1">
                  <span className="font-semibold text-white">{snapshot.scenario.label}</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span>
                    {snapshot.scenario.wallCount > 0 ? `Rào ${snapshot.scenario.wallCount}` : 'Trống'}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span>{windDirLabel}</span>
                </div>

                {/* Compact Aim Pad */}
                <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-md border border-white/10 shrink-0">
                  <button type="button" disabled={!canShoot} onClick={() => onNudgeAim(-0.45, 0)} title="Ngắm trái" className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-40 cursor-pointer"><ArrowLeft size={12} /></button>
                  <button type="button" disabled={!canShoot} onClick={() => onNudgeAim(0, 0.25)} title="Ngắm cao" className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-40 cursor-pointer"><ArrowUp size={12} /></button>
                  <button type="button" disabled={!canShoot} onClick={() => onNudgeAim(0, -0.25)} title="Ngắm thấp" className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-40 cursor-pointer"><ArrowDown size={12} /></button>
                  <button type="button" disabled={!canShoot} onClick={() => onNudgeAim(0.45, 0)} title="Ngắm phải" className="p-1 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-40 cursor-pointer"><ArrowRight size={12} /></button>
                </div>

                {/* Power - / Bar / + */}
                <button
                  type="button"
                  disabled={!canShoot || snapshot.phase === 'charging'}
                  onClick={() => onPowerChange(Number(Math.max(0.18, snapshot.power - 0.08).toFixed(2)))}
                  title="Giảm lực"
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Minus size={11} />
                </button>
                <div
                  ref={powerBarRef}
                  role="slider"
                  aria-label="Thanh lực sút"
                  aria-valuemin={18}
                  aria-valuemax={100}
                  aria-valuenow={powerPct}
                  onPointerDown={(e) => {
                    if (!canShoot || snapshot.phase === 'charging') return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDraggingPower(true);
                    updatePowerFromPointer(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (!draggingPower) return;
                    updatePowerFromPointer(e.clientX);
                  }}
                  onPointerUp={() => setDraggingPower(false)}
                  className="relative flex-1 min-w-[85px] h-4 bg-slate-900 rounded overflow-hidden border border-white/15 cursor-ew-resize"
                >
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-400/40 pointer-events-none"
                    style={{ left: '62%', width: '24%' }}
                  />
                  <div
                    className="h-full transition-none rounded-r-sm pointer-events-none"
                    style={{
                      width: `${powerPct}%`,
                      background:
                        powerPct >= 88
                          ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 65%, #ef4444 100%)'
                          : 'linear-gradient(90deg, #059669 0%, #34d399 100%)',
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={!canShoot || snapshot.phase === 'charging'}
                  onClick={() => onPowerChange(Number(Math.min(1, snapshot.power + 0.08).toFixed(2)))}
                  title="Tăng lực"
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Plus size={11} />
                </button>
                <span
                  className={`font-mono-tabular text-[11px] font-bold shrink-0 ${
                    powerPct >= 88 ? 'text-rose-400' : powerPct >= 60 ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {powerPct}%
                </span>

                <button
                  type="button"
                  disabled={!canShoot}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onQuickShoot();
                  }}
                  title="Sút ngay (Enter)"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    canShoot ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Zap size={13} fill="currentColor" />
                  <span>{lang === 'vi' ? 'Sút (Enter)' : 'Shoot'}</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginCurveCharge();
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  title="Sút xoáy cứa lòng (C)"
                  className={`touch-none flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    snapshot.phase === 'charging'
                      ? 'bg-amber-400 text-slate-950'
                      : canShoot
                      ? 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {snapshot.spin.curve < 0 ? <CornerUpLeft size={13} /> : <CornerUpRight size={13} />}
                  <span>Xoáy (C)</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginCharge();
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  title="Giữ để căn lực sút (Space)"
                  className={`touch-none px-2 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.phase === 'charging'
                      ? 'bg-amber-400 border-amber-300 text-slate-950'
                      : canShoot
                      ? 'bg-slate-800 hover:bg-slate-700 border-white/15 text-white'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {snapshot.phase === 'charging' ? 'Thả!' : 'Giữ Lực'}
                </button>
              </div>

              {/* Single Flat Horizontal Skills Row */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginHorizontalCurve('left');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    canShoot ? 'bg-cyan-500/18 hover:bg-cyan-500/30 border-cyan-400/50 text-cyan-200' : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <MoveHorizontal size={12} />
                  <span>Xoáy ↶</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginHorizontalCurve('right');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    canShoot ? 'bg-cyan-500/18 hover:bg-cyan-500/30 border-cyan-400/50 text-cyan-200' : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Xoáy ↷</span>
                  <MoveHorizontal size={12} />
                </button>

                {canCrossHeader ? (
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={onShootCrossHeader}
                    title="Treo bóng bổng cho đồng đội #9 đánh đầu & đá bồi"
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                      canShoot
                        ? isCornerSpot
                          ? 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-slate-950'
                          : 'bg-amber-400/18 hover:bg-amber-400/30 border-amber-400/55 text-amber-200'
                        : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <UserPlus size={12} />
                    <span>Treo (#9)</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('trivela');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'trivela'
                      ? 'bg-fuchsia-400 border-fuchsia-200 text-slate-950'
                      : canShoot
                      ? 'bg-fuchsia-500/18 hover:bg-fuchsia-500/30 border-fuchsia-400/55 text-fuchsia-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Wind size={11} />
                  <span>Trivela (T)</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('knuckle');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'knuckle'
                      ? 'bg-orange-400 border-orange-200 text-slate-950'
                      : canShoot
                      ? 'bg-orange-500/18 hover:bg-orange-500/30 border-orange-400/55 text-orange-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Flame size={11} />
                  <span>Knuckle (B)</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('dip_topspin');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'dip_topspin'
                      ? 'bg-emerald-400 border-emerald-200 text-slate-950'
                      : canShoot
                      ? 'bg-emerald-500/18 hover:bg-emerald-500/30 border-emerald-400/55 text-emerald-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowDown size={11} />
                  <span>Topspin</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('power_shot');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'power_shot'
                      ? 'bg-rose-400 border-rose-200 text-slate-950'
                      : canShoot
                      ? 'bg-rose-500/18 hover:bg-rose-500/30 border-rose-400/55 text-rose-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Zap size={11} />
                  <span>Power Shot</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('bicycle_volley');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'bicycle_volley'
                      ? 'bg-amber-300 border-amber-100 text-slate-950'
                      : canShoot
                      ? 'bg-amber-500/18 hover:bg-amber-500/30 border-amber-400/55 text-amber-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Ngả Bàn Đèn</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('rabona');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'rabona'
                      ? 'bg-violet-400 border-violet-200 text-slate-950'
                      : canShoot
                      ? 'bg-violet-500/18 hover:bg-violet-500/30 border-violet-400/55 text-violet-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Rabona</span>
                </button>

                <button
                  type="button"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    if (!canShoot) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onBeginSkillCharge('chip_panenka');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  onPointerCancel={() => {
                    if (snapshot.phase === 'charging') onReleaseCharge();
                  }}
                  className={`touch-none px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
                    snapshot.shotSkill === 'chip_panenka'
                      ? 'bg-sky-300 border-sky-100 text-slate-950'
                      : canShoot
                      ? 'bg-sky-500/18 hover:bg-sky-500/30 border-sky-400/55 text-sky-200'
                      : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Panenka</span>
                </button>

                {snapshot.shotSkill !== 'normal' ? (
                  <button
                    type="button"
                    disabled={!canShoot}
                    onClick={() => onSetShotSkill('normal')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10.5px] font-semibold text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Thường
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Compact Curve & Wind Studio Strip when practicing Technical Curve Lab */}
        {!isMatchMode &&
        !isGkTurn &&
        snapshot.mode === 'practice' &&
        snapshot.practiceFocus === 'curve_lab' ? (
          <div className="mt-1.5 pt-1.5 border-t border-cyan-400/25 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-cyan-300 mr-1 whitespace-nowrap">
                  <Wind size={12} />
                  <span>{lang === 'vi' ? 'Xoáy Kỹ Thuật' : 'Curve Studio'}</span>
                </span>
                {CURVE_LAB_SPOTS.map((spot) => {
                  const active = snapshot.scenario.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => onSelectSpot(spot.id)}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-cyan-400 border-cyan-200 text-slate-950'
                          : 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {spot.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono-tabular shrink-0">
                <span className="text-slate-300">
                  Cong:{' '}
                  <strong className="text-cyan-300">
                    {snapshot.previewBendMeters >= 0 ? '+' : '-'}
                    {Math.abs(snapshot.previewBendMeters).toFixed(2)}m
                  </strong>
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-300">
                  <strong className="text-amber-300">
                    {Math.round(
                      Math.hypot(snapshot.spin.curve, snapshot.spin.dip) *
                        (snapshot.shotSkill === 'trivela'
                          ? 1280
                          : snapshot.shotSkill === 'curler'
                          ? 1190
                          : 980),
                    )}{' '}
                    rpm
                  </strong>
                </span>
                {snapshot.customWindActive ? (
                  <button
                    type="button"
                    onClick={onResetCustomWind}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10px] font-sans font-bold text-slate-200 cursor-pointer whitespace-nowrap"
                  >
                    Đặt lại gió
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="px-2 py-1.5 rounded-lg bg-slate-900/80 border border-sky-400/25 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1 overflow-x-auto">
                  <span className="text-[10.5px] font-bold text-sky-300 whitespace-nowrap">
                    Gió (m/s)
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => onSetCustomWind({ x: -4.5, z: snapshot.scenario.wind.z })} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-sky-200 cursor-pointer whitespace-nowrap">← Trái</button>
                    <button type="button" onClick={() => onSetCustomWind({ x: 0, z: 0 })} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer whitespace-nowrap">Lặng</button>
                    <button type="button" onClick={() => onSetCustomWind({ x: 4.5, z: snapshot.scenario.wind.z })} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-sky-200 cursor-pointer whitespace-nowrap">Phải →</button>
                    <button type="button" onClick={() => onSetCustomWind({ x: snapshot.scenario.wind.x, z: -3.5 })} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-amber-200 cursor-pointer whitespace-nowrap">Ngược</button>
                    <button type="button" onClick={() => onSetCustomWind({ x: snapshot.scenario.wind.x, z: 3.5 })} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-emerald-200 cursor-pointer whitespace-nowrap">Thuận</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
                    <span className="whitespace-nowrap">Ngang</span>
                    <input type="range" min={-6} max={6} step={0.2} value={snapshot.scenario.wind.x} onChange={(e) => onSetCustomWind({ x: Number(e.target.value), z: snapshot.scenario.wind.z })} className="flex-1 h-1 accent-sky-400 cursor-pointer" />
                    <strong className="font-mono-tabular text-sky-300 w-9 text-right">{snapshot.scenario.wind.x > 0 ? '+' : ''}{snapshot.scenario.wind.x.toFixed(1)}</strong>
                  </label>
                  <label className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
                    <span className="whitespace-nowrap">Dọc</span>
                    <input type="range" min={-5} max={5} step={0.2} value={snapshot.scenario.wind.z} onChange={(e) => onSetCustomWind({ x: snapshot.scenario.wind.x, z: Number(e.target.value) })} className="flex-1 h-1 accent-sky-400 cursor-pointer" />
                    <strong className="font-mono-tabular text-sky-300 w-9 text-right">{snapshot.scenario.wind.z > 0 ? '+' : ''}{snapshot.scenario.wind.z.toFixed(1)}</strong>
                  </label>
                </div>
              </div>

              <div className="px-2 py-1.5 rounded-lg bg-slate-900/80 border border-emerald-400/25 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1 overflow-x-auto">
                  <span className="text-[10.5px] font-bold text-emerald-300 whitespace-nowrap">
                    Xoáy &amp; Chúi
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" disabled={!canShoot} onClick={() => { onSetShotSkill('curler'); onSpinChange({ curve: -0.92, dip: 0.38 }); }} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-emerald-200 cursor-pointer whitespace-nowrap disabled:opacity-40">Cứa Trái</button>
                    <button type="button" disabled={!canShoot} onClick={() => { onSetShotSkill('curler'); onSpinChange({ curve: 0.92, dip: 0.38 }); }} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-emerald-200 cursor-pointer whitespace-nowrap disabled:opacity-40">Cứa Phải</button>
                    <button type="button" disabled={!canShoot} onClick={() => { onSetShotSkill('trivela'); onSpinChange({ curve: -0.96, dip: 0.32 }); }} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-fuchsia-200 cursor-pointer whitespace-nowrap disabled:opacity-40">Trivela</button>
                    <button type="button" disabled={!canShoot} onClick={() => { onSetShotSkill('dip_topspin'); onSpinChange({ curve: -0.25, dip: 0.92 }); }} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-bold text-amber-200 cursor-pointer whitespace-nowrap disabled:opacity-40">Chúi</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
                    <span className="whitespace-nowrap">Curve</span>
                    <input type="range" min={-1} max={1} step={0.02} disabled={!canShoot} value={snapshot.spin.curve} onChange={(e) => onSpinChange({ curve: Number(e.target.value), dip: snapshot.spin.dip })} className="flex-1 h-1 accent-emerald-400 cursor-pointer disabled:opacity-40" />
                    <strong className="font-mono-tabular text-emerald-300 w-9 text-right">{Math.round(snapshot.spin.curve * 100)}%</strong>
                  </label>
                  <label className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
                    <span className="whitespace-nowrap">Dip</span>
                    <input type="range" min={-1} max={1} step={0.02} disabled={!canShoot} value={snapshot.spin.dip} onChange={(e) => onSpinChange({ curve: snapshot.spin.curve, dip: Number(e.target.value) })} className="flex-1 h-1 accent-emerald-400 cursor-pointer disabled:opacity-40" />
                    <strong className="font-mono-tabular text-emerald-300 w-9 text-right">{Math.round(snapshot.spin.dip * 100)}%</strong>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}
