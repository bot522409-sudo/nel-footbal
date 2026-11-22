import {
  ArrowLeftRight,
  ChevronDown,
  ClipboardCheck,
  CloudUpload,
  Coins,
  Flame,
  Globe,
  Hand,
  Languages,
  ListMusic,
  LogIn,
  LogOut,
  MessageSquare,
  Music,
  PackageOpen,
  Play,
  Shield,
  ShieldAlert,
  SkipForward,
  Snowflake,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { FcTrackMeta, soundEngine } from '../game/audio';
import { MusicPickerPanel } from './MusicPickerPanel';
import {
  countClaimableMissions,
  countClaimableWinterRewards,
  FC_PACKS,
  FcClubState,
  formatSquadOvr,
  Language,
  WinterEventState,
} from '../game/fcData';
import {
  computeImpossibleEntryFee,
  Difficulty,
  DIFFICULTY_LABELS,
  GameMode,
  GameSnapshot,
  GK_ORDER,
  GK_PROFILES,
  GoalkeeperId,
  IMPOSSIBLE_REWARD_COINS,
  KICKER_ORDER,
  KICKER_PROFILES,
  KickerId,
  MatchFormat,
  PLAYER_SKINS,
  PlayerSkinId,
  PracticeFocus,
  RUNNING_AURA_ORDER,
  RUNNING_AURAS,
  RunningAuraId,
  SKIN_ORDER,
  TEAM_ORDER,
  TEAM_PROFILES,
  TeamId,
} from '../game/types';
import { AuthModalInitialView } from './AuthGateModal';
import { OnlineAccountProfile } from '../services/onlineClubService';

interface MainMenuOverlayProps {
  snapshot: GameSnapshot;
  club: FcClubState;
  winterEvent: WinterEventState;
  lang: Language;
  account: OnlineAccountProfile | null;
  isAdmin: boolean;
  canToggleAdminMode?: boolean;
  adminModeEnabled: boolean;
  hasUnsavedGuestProgress: boolean;
  onlineCount: number;
  pendingMarketCoins?: number;
  onToggleLang: () => void;
  onToggleAdminMode: () => void;
  onOpenStore: (tab: 'packs' | 'winter' | 'squad' | 'missions' | 'market') => void;
  onOpenOnlineArena: (tab: 'duel' | 'leaderboard') => void;
  onOpenSocialPlaza: () => void;
  onOpenInbox: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: (view: AuthModalInitialView) => void;
  onQuickGoogleLogin?: () => void;
  googleAuthBusy?: boolean;
  onLogout: () => void;
  onSelectMode: (mode: GameMode) => void;
  onSelectMatchFormat: (format: MatchFormat) => void;
  onSelectPracticeFocus: (focus: PracticeFocus) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onSelectKicker: (kickerId: KickerId) => void;
  onSelectGoalkeeper: (gkId: GoalkeeperId) => void;
  onSelectPlayerSkin: (skinId: PlayerSkinId) => void;
  onSelectRunningAura: (auraId: RunningAuraId) => void;
  onSelectTeams: (homeTeamId: TeamId, awayTeamId: TeamId) => void;
  onStartGame: () => void;
  onStartCurveTraining: () => void;
  onToggleMute: () => void;
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'pro', 'extreme'];

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: 'Thủ môn chậm · Hàng rào thưa · AI nhẹ nhàng',
  medium: 'Cân bằng tiêu chuẩn · Gió & AI vừa phải',
  pro: 'Thủ môn phản xạ nhanh · Hàng rào dày · AI áp sát',
  extreme: 'Thủ môn siêu nhân · Hàng rào 7 người · AI tốc độ cao',
};

const SNOWFLAKES = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  leftPct: ((i * 37.3 + 11) % 100).toFixed(2),
  sizePx: 4 + (i % 5) * 1.8,
  durationSec: (5.8 + (i % 7) * 1.15).toFixed(2),
  delaySec: (-((i * 1.37) % 9)).toFixed(2),
  driftPx: ((i % 2 === 0 ? 1 : -1) * (14 + (i % 5) * 8)),
  isCrystal: i % 4 === 0,
}));

export function MainMenuOverlay({
  snapshot,
  club,
  winterEvent,
  lang,
  account,
  isAdmin,
  canToggleAdminMode = isAdmin,
  adminModeEnabled,
  hasUnsavedGuestProgress,
  onlineCount,
  pendingMarketCoins = 0,
  onToggleLang,
  onToggleAdminMode,
  onOpenStore,
  onOpenOnlineArena,
  onOpenSocialPlaza,
  onOpenInbox,
  onOpenAdmin,
  onOpenAuth,
  onQuickGoogleLogin,
  googleAuthBusy = false,
  onLogout,
  onSelectMode,
  onSelectMatchFormat,
  onSelectPracticeFocus,
  onSelectDifficulty,
  onSelectKicker,
  onSelectGoalkeeper,
  onSelectPlayerSkin,
  onSelectRunningAura,
  onSelectTeams,
  onStartGame,
  onStartCurveTraining,
  onToggleMute,
}: MainMenuOverlayProps) {
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(() =>
    soundEngine.isBgmEnabled(),
  );
  const [remixBoost, setRemixBoost] = useState<boolean>(() =>
    soundEngine.isRemixBoost(),
  );
  const [currentTrack, setCurrentTrack] = useState<FcTrackMeta>(() =>
    soundEngine.getCurrentTrack(),
  );
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);

  useEffect(() => {
    return soundEngine.onBgmChange(() => {
      setBgmEnabled(soundEngine.isBgmEnabled());
      setRemixBoost(soundEngine.isRemixBoost());
      setCurrentTrack(soundEngine.getCurrentTrack());
    });
  }, []);

  const isMatchMode = snapshot.mode === 'match';
  const isImpossibleMode = snapshot.mode === 'impossible';
  const impossibleFee = computeImpossibleEntryFee(club.coins, isAdmin);
  const squadOvrLabel = formatSquadOvr(club.lineupIds);
  const claimableMissions = countClaimableMissions(club);
  const claimableWinter = countClaimableWinterRewards(club, winterEvent);
  const isVi = lang === 'vi';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-white via-[#f1f7fe] to-[#dcecfb] p-3 sm:p-4 overflow-y-auto">
      {/* Full-Screen Winter Snowfall Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      >
        {SNOWFLAKES.map((flake) => (
          <div
            key={flake.id}
            className="animate-winter-snow absolute -top-6 select-none"
            style={
              {
                left: `${flake.leftPct}%`,
                animationDuration: `${flake.durationSec}s`,
                animationDelay: `${flake.delaySec}s`,
                '--snow-drift': `${flake.driftPx}px`,
              } as React.CSSProperties
            }
          >
            {flake.isCrystal ? (
              <span
                className="block font-bold text-sky-500"
                style={{ fontSize: `${Math.round(flake.sizePx * 1.4)}px`, lineHeight: 1 }}
              >
                ❄
              </span>
            ) : (
              <span
                className="block rounded-full bg-white border border-sky-300"
                style={{
                  width: `${flake.sizePx}px`,
                  height: `${flake.sizePx}px`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="relative z-20 w-full max-w-4xl max-h-[94vh] overflow-y-auto bg-white border-2 border-sky-300 rounded-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] text-slate-900 my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-sky-200">
          <div>
            <p className="text-xs font-extrabold text-sky-700 flex items-center gap-1.5">
              <Snowflake size={13} className="text-sky-600" />
              <span>
                {lang === 'vi'
                  ? 'NEL Football · Sự Kiện Winter Tuyết Trắng · Đá Phạt · 5v5 · Mở Pack FC'
                  : 'NEL Football · Winter Frost Event · Free Kicks · 5v5 · FC Club'}
              </span>
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-wide mt-0.5">
              NEL FOOTBALL
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {lang === 'vi'
                ? `Mở ${FC_PACKS.length} loại Pack cực vui, săn thẻ Winter 168 & cầu thủ Admin chỉ số ∞, chơi sân phủ tuyết!`
                : `Open ${FC_PACKS.length} fun Packs, collect Winter 168 & Admin ∞ players on a snowy pitch!`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-mono-tabular text-xs font-extrabold">
              <Coins size={15} className="text-amber-700" />
              <span>{isAdmin ? '∞ Xu' : `${club.coins.toLocaleString()} Xu`}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono-tabular text-xs font-extrabold">
              <Shield size={15} className="text-emerald-700" />
              <span>OVR {squadOvrLabel}</span>
            </div>

            {/* FC Soundtrack & Remix Player Controls */}
            <div className="flex items-center rounded-lg bg-sky-50 border border-pink-300 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.setBgmEnabled(!bgmEnabled);
                }}
                title={
                  bgmEnabled
                    ? isVi
                      ? 'Tắt nhạc nền FC'
                      : 'Mute FC Music'
                    : isVi
                    ? 'Bật nhạc nền FC'
                    : 'Play FC Music'
                }
                className={`flex items-center justify-center w-9 h-10 transition-colors cursor-pointer ${
                  bgmEnabled && !snapshot.muted
                    ? 'text-pink-600 hover:bg-pink-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-sky-100'
                }`}
              >
                <Music size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  setMusicPickerOpen((v) => !v);
                }}
                title={
                  isVi
                    ? 'Chọn bài nhạc & Bật/tắt Remix cực cháy'
                    : 'Choose track & Remix Boost'
                }
                className="flex items-center gap-1.5 h-10 px-2.5 border-l border-sky-200 text-xs font-bold text-slate-800 hover:bg-sky-100 cursor-pointer"
              >
                <ListMusic size={13} className="text-pink-600 shrink-0" />
                <span className="max-w-[115px] sm:max-w-[140px] truncate">
                  {bgmEnabled && !snapshot.muted
                    ? currentTrack.title
                    : isVi
                    ? 'Chọn Nhạc'
                    : 'Music'}
                </span>
                {remixBoost && bgmEnabled ? (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-pink-600 text-[9px] font-extrabold text-white">
                    REMIX
                  </span>
                ) : null}
                <ChevronDown size={12} className="text-slate-500 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  if (!bgmEnabled) soundEngine.setBgmEnabled(true);
                  soundEngine.nextFcTrack();
                }}
                title={isVi ? 'Chuyển bài nhạc tiếp theo' : 'Next FC Track'}
                className="flex items-center justify-center w-8 h-10 border-l border-sky-200 text-slate-600 hover:text-slate-900 hover:bg-sky-100 cursor-pointer"
              >
                <SkipForward size={13} />
              </button>
            </div>

            {musicPickerOpen ? (
              <div
                className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end p-4 pt-16 sm:pt-20 sm:pr-8 bg-slate-900/45"
                onClick={() => setMusicPickerOpen(false)}
              >
                <MusicPickerPanel
                  lang={lang}
                  muted={snapshot.muted}
                  onClose={() => setMusicPickerOpen(false)}
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={onToggleLang}
              title={
                lang === 'vi'
                  ? 'Chuyển sang Tiếng Anh'
                  : 'Switch to Vietnamese'
              }
              className="flex items-center gap-1.5 h-10 px-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-slate-800 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              <Languages size={15} />
              <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={snapshot.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="flex items-center justify-center w-10 h-10 bg-sky-50 border border-sky-200 rounded-lg text-slate-800 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              {snapshot.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        {/* Online Account & Cross-Device Sync Bar */}
        {account ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <UserCheck size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  @{account.username}{' '}
                  <span className="text-emerald-700 font-mono-tabular">
                    · {account.stats.elo} ELO
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 truncate">
                  {isVi
                    ? `Đã đăng nhập · Đã lưu đám mây (${account.stats.onlineWins} thắng online) · Chơi đa thiết bị`
                    : `Signed in · Cloud synced (${account.stats.onlineWins} online wins)`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {canToggleAdminMode ? (
                <>
                  <button
                    type="button"
                    onClick={onToggleAdminMode}
                    title={
                      adminModeEnabled
                        ? 'Đang bật Chế độ Admin (Auto sút góc A + Auto GK bất bại + ∞ Xu + Full cầu thủ ∞). Nhấn để chuyển sang Chế độ Người Chơi.'
                        : 'Đang ở Chế độ Người Chơi (đá công bằng, Xu giới hạn thực tế). Nhấn để bật lại Chế độ Admin.'
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer shrink-0 transition-colors ${
                      adminModeEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    <ShieldAlert size={14} />
                    <span>
                      {adminModeEnabled
                        ? isVi
                          ? 'Chế độ: Admin'
                          : 'Mode: Admin'
                        : isVi
                        ? 'Chế độ: Người Chơi'
                        : 'Mode: Player'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    <ShieldAlert size={14} />
                    <span>{isVi ? 'Quản Trị Viên' : 'Admin'}</span>
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer shrink-0"
              >
                <LogOut size={13} />
                <span>{isVi ? 'Đăng xuất' : 'Log out'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                <CloudUpload size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-amber-950">
                  {hasUnsavedGuestProgress
                    ? isVi
                      ? 'Bạn đang chơi nick Khách chưa đăng nhập (vẫn Đấu Online 1v1 bình thường)!'
                      : 'Playing as Guest (Online 1v1 PvP ready)!'
                    : isVi
                    ? 'Đấu Online ngay hoặc Đăng nhập để đồng bộ đa thiết bị'
                    : 'Play Online now or Sign in for Cross-Device Sync'}
                </div>
                <div className="text-[11px] text-amber-800">
                  {isVi
                    ? 'Khách vẫn đấu Online 1v1 tự do · Tạo tài khoản để lưu Xu, thẻ OVR 200 / ∞ & ELO sang máy khác'
                    : 'Guests can play Online 1v1 freely · Sign in to save Coins, 200/∞ OVR cards & ELO across devices'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('upgrade_guest')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                <UserPlus size={14} />
                <span>
                  {isVi
                    ? 'Tạo tài khoản với nick này'
                    : 'Create account with this profile'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                <span>{isVi ? '1. Tạo tài khoản' : '1. Sign Up'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer"
              >
                <LogIn size={13} />
                <span>{isVi ? '2. Đăng nhập' : '2. Log In'}</span>
              </button>

              {onQuickGoogleLogin ? (
                <button
                  type="button"
                  disabled={googleAuthBusy}
                  onClick={onQuickGoogleLogin}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-extrabold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.94 0 3.51.68 4.6 1.72l3.43-3.43C17.95 1.39 15.23.25 12 .25 7.31.25 3.26 2.94 1.29 6.86l3.99 3.1C6.24 7.09 8.88 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.72 2.89c2.18-2.01 3.7-4.96 3.7-8.71z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.04A7.18 7.18 0 0 1 4.9 12c0-.71.13-1.4.38-2.04l-3.99-3.1A11.73 11.73 0 0 0 .25 12c0 1.91.46 3.71 1.29 5.31l3.74-3.27z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.75c3.24 0 5.96-1.07 7.95-2.9l-3.72-2.89c-1.07.72-2.45 1.15-4.23 1.15-3.12 0-5.76-2.05-6.72-4.87l-3.74 3.27C3.49 21.31 7.45 23.75 12 23.75z"
                    />
                  </svg>
                  <span>
                    {googleAuthBusy
                      ? isVi
                        ? 'Đang mở Google...'
                        : 'Connecting...'
                      : isVi
                      ? 'Đăng nhập nhanh Google'
                      : 'Google Sign-In'}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Featured Winter Event Banner */}
        <button
          type="button"
          onClick={() => onOpenStore('winter')}
          className="mt-3.5 w-full flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-[#e0f2fe] via-[#f0f9ff] to-[#e0e7ff] border-2 border-sky-300 hover:border-sky-500 text-left shadow-sm transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Snowflake size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-sky-950">
                  {isVi
                    ? 'SỰ KIỆN WINTER · MÙA ĐÔNG TUYẾT TRẮNG'
                    : 'WINTER FROST EVENT · SNOWY PITCH'}
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] font-extrabold">
                  {claimableWinter > 0
                    ? isVi
                      ? `${claimableWinter} QUÀ MỚI`
                      : `${claimableWinter} READY`
                    : 'WINTER 168'}
                </span>
              </div>
              <div className="text-[11px] text-slate-700 truncate mt-0.5">
                {isVi
                  ? 'Nhận quà điểm danh +50.000 Xu & Thẻ Winter mỗi ngày · Săn Messi 168 & cầu thủ Admin chỉ số ∞!'
                  : 'Daily +50,000 Coins & Winter Card · Unlock Winter Messi 168 & Admin Infinity ∞ stars!'}
              </div>
            </div>
          </div>
          <span className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shrink-0">
            {isVi ? 'Vào Sự Kiện Winter ❄ →' : 'Open Winter Event ❄ →'}
          </span>
        </button>

        {/* FC Club, Inbox & Online Arena Quick Actions */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenOnlineArena('duel')}
            className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-300 hover:border-emerald-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shrink-0">
                <Globe size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-emerald-950 truncate">
                  {isVi ? 'Đấu Online 1v1' : 'Online 1v1 PvP'}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {isVi
                    ? `${onlineCount} online · Ghép trận & XH`
                    : `${onlineCount} online · Quick Match`}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-emerald-700 shrink-0">
              PvP →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('packs')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-300 hover:border-amber-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500 text-slate-950 shrink-0">
                <PackageOpen size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-amber-950 truncate">
                  {lang === 'vi'
                    ? `Cửa Hàng Pack (${FC_PACKS.length})`
                    : `FC Packs (${FC_PACKS.length})`}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {lang === 'vi'
                    ? 'Pack Winter, VN & Admin ∞'
                    : 'Winter, VN & Admin ∞'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-amber-800 shrink-0">
              {isAdmin ? '∞ Xu' : club.coins.toLocaleString()} →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('market')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-violet-50 border border-violet-300 hover:border-violet-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-600 text-white shrink-0">
                <ArrowLeftRight size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-violet-950 truncate">
                  {lang === 'vi' ? 'Khu Trao Đổi' : 'Transfer Market'}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {pendingMarketCoins > 0
                    ? lang === 'vi'
                      ? `Nhận +${pendingMarketCoins.toLocaleString()} Xu`
                      : `Claim +${pendingMarketCoins.toLocaleString()}`
                    : lang === 'vi'
                    ? 'Rao bán & mua thẻ'
                    : 'Sell & buy cards'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-violet-700 shrink-0">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('missions')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-sky-50 border border-sky-300 hover:border-sky-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-600 text-white shrink-0">
                <ClipboardCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-sky-950 truncate">
                  {lang === 'vi' ? 'Nhiệm Vụ' : 'Missions'}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {lang === 'vi'
                    ? 'Ghi 30 bàn · Góc A'
                    : 'Goals · Top Bins'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-sky-700 shrink-0">
              {claimableMissions > 0
                ? `${lang === 'vi' ? 'Nhận' : 'Claim'} ${claimableMissions} →`
                : '→'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('squad')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 hover:border-emerald-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-emerald-950 truncate">
                  {lang === 'vi'
                    ? `Đội Hình (${club.ownedIds.length})`
                    : `Squad (${club.ownedIds.length})`}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {lang === 'vi'
                    ? 'Xếp đội hình 5v5'
                    : '5v5 starting lineup'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-emerald-700 shrink-0">
              OVR {squadOvrLabel} →
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenInbox}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cyan-50 border border-cyan-300 hover:border-cyan-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-600 text-white shrink-0">
                <MessageSquare size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-cyan-950 truncate">
                  {lang === 'vi' ? 'Hộp Thư & Mic' : 'Inbox & Voice'}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {lang === 'vi'
                    ? 'Chat thế giới · Bật Mic'
                    : 'Global Chat · Mic'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-cyan-700 shrink-0">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSocialPlaza}
            className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 border border-pink-300 hover:border-pink-500 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-600 text-white shrink-0">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-pink-950 truncate">
                  {lang === 'vi'
                    ? 'Khu Chat & Giải Trí Online (Siêu Sao Resort)'
                    : 'Online Social Plaza & Resort (Disco · 5★ Hotel · Mini-Games)'}
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {lang === 'vi'
                    ? 'Chọn nhân vật danh thủ · Giao lưu chat · Nhảy sàn Disco · Vào Khách Sạn 5★ & Mini-Game'
                    : 'Pick famous footballers · Live chat · Disco floor · 5★ Hotel & Mini-Games'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-pink-700 shrink-0">
              {lang === 'vi' ? 'Vào Khu →' : 'Enter →'}
            </span>
          </button>
        </div>

        <div className="space-y-4 py-4">
          {/* 1. Game Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Chế độ thi đấu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectMode('match')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  isMatchMode
                    ? 'bg-violet-600 border-violet-700 text-white shadow-sm'
                    : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${isMatchMode ? 'text-white' : 'text-violet-600'}`}>
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">
                    Trận Đấu 3D ({snapshot.matchFormat === '11v11' ? '11v11' : '5v5'})
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isMatchMode ? 'text-violet-100' : 'text-slate-600'}`}>
                    Chọn 5v5 hoặc 11v11 sân cực đại 105m: rê bóng, bứt tốc, treo bổng &amp; dứt điểm!
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('vs_bot')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'vs_bot'
                    ? 'bg-sky-600 border-sky-700 text-white shadow-sm'
                    : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${snapshot.mode === 'vs_bot' ? 'text-white' : 'text-sky-600'}`}>
                  <Swords size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Thi Đấu Với Bot (1v1)</div>
                  <div className={`text-[11px] mt-0.5 ${snapshot.mode === 'vs_bot' ? 'text-sky-100' : 'text-slate-600'}`}>
                    5 lượt đấu luân phiên: Bạn sút phạt &amp; tự làm GK cản phá cú sút của Bot.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('penalty')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'penalty'
                    ? 'bg-rose-600 border-rose-700 text-white shadow-sm'
                    : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${snapshot.mode === 'penalty' ? 'text-white' : 'text-rose-600'}`}>
                  <Target size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Đá Penalty (11m)</div>
                  <div className={`text-[11px] mt-0.5 ${snapshot.mode === 'penalty' ? 'text-rose-100' : 'text-slate-600'}`}>
                    Loạt sút luân lưu 5 quả 11m cân não: Bạn sút &amp; làm GK đối đầu Bot (có sút quyết định).
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('challenge')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'challenge'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                    : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${snapshot.mode === 'challenge' ? 'text-white' : 'text-emerald-600'}`}>
                  <Trophy size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Thử Thách (5 Lượt)</div>
                  <div className={`text-[11px] mt-0.5 ${snapshot.mode === 'challenge' ? 'text-emerald-100' : 'text-slate-600'}`}>
                    Chinh phục 5 cự ly từ 18m đến 29m và lập kỷ lục điểm số.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('gk_practice')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'gk_practice'
                    ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-sm'
                    : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${snapshot.mode === 'gk_practice' ? 'text-slate-950' : 'text-amber-600'}`}>
                  <Hand size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Làm Thủ Môn (GK)</div>
                  <div className={`text-[11px] mt-0.5 ${snapshot.mode === 'gk_practice' ? 'text-slate-900' : 'text-slate-600'}`}>
                    Trực tiếp điều khiển thủ môn bay người cản phá các siêu phẩm của Bot.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (snapshot.practiceFocus === 'curve_lab') {
                    onSelectPracticeFocus('freekick');
                  }
                  onSelectMode('practice');
                }}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'practice' &&
                  snapshot.practiceFocus !== 'curve_lab'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                    : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${snapshot.mode === 'practice' && snapshot.practiceFocus !== 'curve_lab' ? 'text-white' : 'text-emerald-600'}`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Luyện Tập Sút Phạt &amp; Penalty</div>
                  <div className={`text-[11px] mt-0.5 ${snapshot.mode === 'practice' && snapshot.practiceFocus !== 'curve_lab' ? 'text-emerald-100' : 'text-slate-600'}`}>
                    Tập không giới hạn Sút Phạt (18m–28m), xoáy ngang, đánh đầu &amp; Penalty 11m.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectPracticeFocus('curve_lab');
                  onSelectMode('practice');
                }}
                onDoubleClick={onStartCurveTraining}
                className={`sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'practice' &&
                  snapshot.practiceFocus === 'curve_lab'
                    ? 'bg-cyan-600 border-cyan-700 text-white shadow-sm'
                    : 'bg-cyan-50 border-cyan-300 text-slate-900 hover:border-cyan-500'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 shrink-0 ${snapshot.mode === 'practice' && snapshot.practiceFocus === 'curve_lab' ? 'text-white' : 'text-cyan-700'}`}>
                    <Wind size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-extrabold ${snapshot.mode === 'practice' && snapshot.practiceFocus === 'curve_lab' ? 'text-white' : 'text-cyan-950'}`}>
                        {isVi
                          ? 'Luyện Sút Xoáy Kỹ Thuật (Điều Chỉnh Gió & Độ Xoáy)'
                          : 'Technical Curve Lab (Custom Wind & Spin Studio)'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-700 text-[10px] font-extrabold text-white">
                        {isVi ? 'CHUYÊN SÂU' : 'PRO LAB'}
                      </span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${snapshot.mode === 'practice' && snapshot.practiceFocus === 'curve_lab' ? 'text-cyan-100' : 'text-slate-600'}`}>
                      {isVi
                        ? 'Tự chỉnh hướng & tốc độ gió (X/Z), độ xoáy Curve/Dip theo thời gian thực, vòng mục tiêu góc chữ A & đo độ cong Magnus (m).'
                        : 'Fine-tune wind speed & direction (X/Z), live Curve/Dip spin, glowing top-corner hoops & real-time Magnus bend readout.'}
                    </div>
                  </div>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCurveTraining();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isVi ? 'Vào Tập Ngay →' : 'Launch Lab →'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('impossible')}
                className={`sm:col-span-2 lg:col-span-3 flex items-start justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  isImpossibleMode
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 border-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 border-amber-300 text-slate-900 hover:border-amber-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${isImpossibleMode ? 'text-white' : 'text-amber-600'}`}>
                    <Flame size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-extrabold ${isImpossibleMode ? 'text-white' : 'text-amber-950'}`}>
                        {isVi
                          ? 'Sút Phạt Siêu Khó (Giải 1 Tỷ Xu)'
                          : 'Boss Free Kick (1B Coin Jackpot)'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-[10px] font-extrabold text-white">
                        {isAdmin
                          ? isVi
                            ? 'ADMIN MIỄN PHÍ'
                            : 'ADMIN FREE'
                          : isVi
                          ? 'PHÍ 10% SỐ XU / LƯỢT'
                          : '10% COINS FEE / SHOT'}
                      </span>
                    </div>
                    <div className={`text-[11px] mt-1 ${isImpossibleMode ? 'text-amber-50' : 'text-slate-700'}`}>
                      {isAdmin
                        ? isVi
                          ? `Quản trị viên tham gia Miễn Phí (∞ Xu) · Siêu thủ môn Yashin + hàng rào 7 người · Sút chuẩn vào lưới vẫn ghi bàn!`
                          : `Admin enters Free (∞ Coins) · Boss GK Yashin + 7-man wall · Shoot cleanly into the net to score!`
                        : isVi
                        ? `Tham gia tốn 10% số Xu hiện có (${
                            club.coins < 10
                              ? 'Cần tối thiểu 10 Xu'
                              : `${impossibleFee.toLocaleString()} Xu`
                          }) · Sút vô lưới là ghi bàn & thưởng ngay ${IMPOSSIBLE_REWARD_COINS.toLocaleString()} Xu!`
                        : `Costs 10% of your Coins (${
                            club.coins < 10
                              ? 'Min 10 Coins'
                              : `${impossibleFee.toLocaleString()} Coins`
                          }) · Score into the net to win ${IMPOSSIBLE_REWARD_COINS.toLocaleString()} Coins!`}
                    </div>
                  </div>
                </div>
                <span className={`font-mono-tabular text-xs font-extrabold shrink-0 self-center ${isImpossibleMode ? 'text-white' : 'text-amber-800'}`}>
                  {isAdmin
                    ? '0 Xu'
                    : club.coins < 10
                    ? '<10 Xu'
                    : `-${impossibleFee.toLocaleString()} Xu`}
                </span>
              </button>
            </div>

            {isMatchMode ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-violet-50 border border-violet-300">
                <span className="text-xs font-bold text-violet-900 mr-1">
                  {isVi ? 'Thể thức sân 105m:' : 'Pitch Format:'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectMatchFormat('5v5')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                    snapshot.matchFormat === '5v5'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-slate-800 hover:bg-violet-100 border border-violet-200'
                  }`}
                >
                  5v5 (Nhanh &amp; Gọn)
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMatchFormat('11v11')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                    snapshot.matchFormat === '11v11'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-800 hover:bg-emerald-100 border border-violet-200'
                  }`}
                >
                  11v11 (Sân Chuẩn FIFA 105m)
                </button>
              </div>
            ) : null}

            {snapshot.mode === 'practice' || snapshot.mode === 'gk_practice' ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                <span className="text-xs font-semibold text-slate-700 mr-1">
                  {snapshot.mode === 'gk_practice'
                    ? 'Nội dung tập bắt GK:'
                    : 'Nội dung tập sút:'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPracticeFocus('freekick')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    snapshot.practiceFocus === 'freekick'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-800 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  {snapshot.mode === 'gk_practice'
                    ? 'Bắt Sút Phạt (Có Hàng Rào)'
                    : 'Luyện Sút Phạt (18m–28m)'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPracticeFocus('penalty')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    snapshot.practiceFocus === 'penalty'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-800 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  {snapshot.mode === 'gk_practice'
                    ? 'Bắt Penalty (11m)'
                    : 'Luyện Penalty (11m)'}
                </button>
                {snapshot.mode === 'practice' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectPracticeFocus('corner')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        snapshot.practiceFocus === 'corner'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white text-slate-800 border border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      Luyện Phạt Góc (Đánh Đầu / Sút Thẳng)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectPracticeFocus('curve_lab')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        snapshot.practiceFocus === 'curve_lab'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-slate-800 border border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      Luyện Sút Xoáy Kỹ Thuật (Gió &amp; Xoáy)
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* 2. Difficulty Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              2. Chọn độ khó
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTY_ORDER.map((diff) => {
                const info = DIFFICULTY_LABELS[diff];
                const active = snapshot.difficulty === diff;
                const activeStyles =
                  diff === 'extreme'
                    ? 'bg-purple-600 border-purple-700 text-white'
                    : diff === 'pro'
                    ? 'bg-rose-600 border-rose-700 text-white'
                    : diff === 'medium'
                    ? 'bg-amber-400 border-amber-500 text-slate-950'
                    : 'bg-emerald-600 border-emerald-700 text-white';

                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onSelectDifficulty(diff)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? activeStyles
                        : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-sm font-bold whitespace-nowrap">
                        {info.label}
                      </span>
                      <span
                        className={`font-mono-tabular text-[11px] font-bold ${
                          active
                            ? diff === 'medium'
                              ? 'text-slate-900'
                              : 'text-white/90'
                            : 'text-slate-600'
                        }`}
                      >
                        ×{info.scoreMult.toFixed(1)}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] mt-1 leading-snug ${
                        active
                          ? diff === 'medium'
                            ? 'text-slate-800'
                            : 'text-white/85'
                          : 'text-slate-600'
                      }`}
                    >
                      {DIFFICULTY_DESC[diff]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {isMatchMode ? (
            /* 3. Team Selection for 3D Match */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-2">
                  3. Đội Của Bạn (Chủ Nhà · {TEAM_ORDER.length} đội)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {TEAM_ORDER.map((teamId) => {
                    const t = TEAM_PROFILES[teamId];
                    const active = snapshot.homeTeamId === teamId;
                    const star = KICKER_PROFILES[t.starKickerId];
                    const gk = GK_PROFILES[t.gkId];

                    return (
                      <button
                        key={`home-${teamId}`}
                        type="button"
                        onClick={() => onSelectTeams(teamId, snapshot.awayTeamId)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-600 border-emerald-700 text-white'
                            : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-7 h-6 rounded font-display font-extrabold text-[11px] shrink-0 border border-slate-300"
                              style={{
                                backgroundColor: t.jerseyColor,
                                color:
                                  t.id === 'real_madrid' || t.id === 'england'
                                    ? '#0f172a'
                                    : '#ffffff',
                              }}
                            >
                              {t.shortCode}
                            </span>
                            <span className="text-xs sm:text-sm font-bold truncate">
                              {t.name}
                            </span>
                          </div>
                        </div>
                        <div className={`text-[10px] mt-1 truncate ${active ? 'text-emerald-100' : 'text-slate-600'}`}>
                          {star.shortName} (#{star.numberStr}) · GK {gk.shortName}
                        </div>
                        <div className={`mt-1 font-mono-tabular text-[10px] ${active ? 'text-white' : 'text-slate-700'}`}>
                          Công {t.attackRating} · Thủ {t.defenseRating}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 mb-2">
                  4. Đội Đối Thủ (Bot AI · {TEAM_ORDER.length} đội)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {TEAM_ORDER.map((teamId) => {
                    const t = TEAM_PROFILES[teamId];
                    const active = snapshot.awayTeamId === teamId;
                    const star = KICKER_PROFILES[t.starKickerId];
                    const gk = GK_PROFILES[t.gkId];
                    const sameAsHome = snapshot.homeTeamId === teamId;

                    return (
                      <button
                        key={`away-${teamId}`}
                        type="button"
                        onClick={() => onSelectTeams(snapshot.homeTeamId, teamId)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-rose-600 border-rose-700 text-white'
                            : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-7 h-6 rounded font-display font-extrabold text-[11px] shrink-0 border border-slate-300"
                              style={{
                                backgroundColor: sameAsHome
                                  ? t.altJerseyColor
                                  : t.jerseyColor,
                                color: sameAsHome
                                  ? t.id === 'portugal' ||
                                    t.id === 'liverpool' ||
                                    t.id === 'france' ||
                                    t.id === 'barcelona' ||
                                    t.id === 'juventus' ||
                                    t.id === 'vietnam'
                                    ? '#0f172a'
                                    : '#ffffff'
                                  : t.id === 'real_madrid' || t.id === 'england'
                                  ? '#0f172a'
                                  : '#ffffff',
                              }}
                            >
                              {t.shortCode}
                            </span>
                            <span className="text-xs sm:text-sm font-bold truncate">
                              {t.name}
                            </span>
                          </div>
                        </div>
                        <div className={`text-[10px] mt-1 truncate ${active ? 'text-rose-100' : 'text-slate-600'}`}>
                          {star.shortName} (#{star.numberStr}) · GK {gk.shortName}
                        </div>
                        <div className={`mt-1 font-mono-tabular text-[10px] ${active ? 'text-white' : 'text-slate-700'}`}>
                          Công {t.attackRating} · Thủ {t.defenseRating}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 3. Kicker Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  3. Chọn cầu thủ sút phạt ({KICKER_ORDER.length} danh thủ)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                  {KICKER_ORDER.map((id) => {
                    const k = KICKER_PROFILES[id];
                    const active = snapshot.kickerId === id;
                    const powerPct = Math.round(k.powerMult * 90);
                    const curvePct = Math.min(100, Math.round(k.curveMult * 75));

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectKicker(id)}
                        className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded font-display font-extrabold text-xs shrink-0 border border-slate-300"
                              style={{
                                backgroundColor: k.jerseyColor,
                                color:
                                  k.id === 'vinicius' || k.id === 'son'
                                    ? '#0f172a'
                                    : '#ffffff',
                              }}
                            >
                              {k.numberStr}
                            </span>
                            <span className="text-xs sm:text-sm font-bold truncate">
                              {k.shortName}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-medium shrink-0 ${
                              active ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {k.foot === 'left' ? 'Trái' : 'Phải'}
                          </span>
                        </div>

                        <div
                          className={`text-[10px] mt-1 truncate ${
                            active ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {k.specialty}
                        </div>

                        <div
                          className={`mt-1 flex items-center gap-2 font-mono-tabular text-[10px] ${
                            active ? 'text-sky-300' : 'text-slate-700'
                          }`}
                        >
                          <span>Lực {powerPct}</span>
                          <span>·</span>
                          <span>Xoáy {curvePct}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Goalkeeper (GK) Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  4. Chọn thủ môn (GK · {GK_ORDER.length} danh thủ){' '}
                  <span className="font-normal text-slate-500">
                    —{' '}
                    {snapshot.mode === 'vs_bot' ||
                    snapshot.mode === 'penalty' ||
                    snapshot.mode === 'gk_practice'
                      ? 'Thủ môn của bạn khi cản phá'
                      : 'Thủ môn trấn giữ khung thành'}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                  {GK_ORDER.map((id) => {
                    const gk = GK_PROFILES[id];
                    const active = snapshot.gkId === id;
                    const reachScore = Math.round(84 + gk.reachBonus * 120);
                    const reflexScore = Math.round(gk.diveSpeedMult * 85);

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectGoalkeeper(id)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md font-display font-extrabold text-sm text-white shrink-0"
                              style={{ backgroundColor: gk.jerseyColor }}
                            >
                              {gk.numberStr}
                            </span>
                            <span className="text-sm font-bold whitespace-nowrap">
                              {gk.shortName}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-bold ${
                              active ? 'text-slate-900' : 'text-amber-700'
                            }`}
                          >
                            GK
                          </span>
                        </div>

                        <div
                          className={`text-[11px] mt-1 ${
                            active ? 'text-slate-800' : 'text-slate-600'
                          }`}
                        >
                          {gk.specialty}
                        </div>

                        <div
                          className={`mt-1.5 flex items-center gap-2.5 font-mono-tabular text-[11px] ${
                            active ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          <span>Sải tay {reachScore}</span>
                          <span>·</span>
                          <span>Phản xạ {reflexScore}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Player Skin Selector (Applies to Stars, Kicker & GK) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              5.{' '}
              {isVi
                ? `Skin Cầu Thủ 3D (${SKIN_ORDER.length} bộ · Áo đấu · Kiểu tóc · Hào quang sân cỏ)`
                : `3D Player Skins (${SKIN_ORDER.length} Skins · Kit · Hair · Pitch Aura)`}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-1">
              {SKIN_ORDER.map((skinId) => {
                const skin = PLAYER_SKINS[skinId];
                const active = snapshot.playerSkinId === skinId;
                return (
                  <button
                    key={skinId}
                    type="button"
                    onClick={() => onSelectPlayerSkin(skinId)}
                    className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                        : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="relative inline-flex w-5 h-5 rounded-md border border-slate-300 overflow-hidden shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${skin.jerseyColor} 55%, ${skin.accentColor} 100%)`,
                        }}
                      >
                        <span
                          className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: skin.auraColor }}
                        />
                      </span>
                      <span className="text-xs font-bold truncate">
                        {isVi ? skin.nameVi : skin.nameEn}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 truncate ${active ? 'text-emerald-100' : 'text-slate-600'}`}>
                      {isVi ? skin.badgeVi : skin.badgeEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Running Aura Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              6.{' '}
              {isVi
                ? 'Hào Quang Khi Chạy & Bứt Tốc'
                : 'Running & Sprint Aura Effects'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {RUNNING_AURA_ORDER.map((auraId) => {
                const aura = RUNNING_AURAS[auraId];
                const active = snapshot.runningAuraId === auraId;
                return (
                  <button
                    key={auraId}
                    type="button"
                    onClick={() => onSelectRunningAura(auraId)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-600 border-sky-700 text-white shadow-sm'
                        : 'bg-sky-50/70 border-sky-200 text-slate-900 hover:border-sky-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-300"
                      style={{ backgroundColor: aura.hexColor }}
                    />
                    <span className="text-[11px] font-bold truncate">
                      {isVi ? aura.nameVi : aura.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="pt-3.5 border-t border-sky-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Shield size={14} className="text-emerald-600 shrink-0" />
            <span>
              {isMatchMode
                ? 'WASD / Mũi tên di chuyển · Space sút/cướp bóng · J chuyền · K treo bổng · Q đổi cầu thủ'
                : 'Sút Xoáy Ngang vòng hàng rào · Treo Bóng đồng đội #9 đánh đầu · Penalty 11m & bắt GK'}
            </span>
          </div>

          <button
            type="button"
            onClick={onStartGame}
            className={`flex items-center gap-2 px-6 py-3 font-extrabold text-sm rounded-xl shadow-md transition-colors cursor-pointer whitespace-nowrap ${
              isImpossibleMode
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Play size={16} fill="currentColor" />
            <span>
              {isMatchMode
                ? 'Vào Trận Đấu 3D'
                : isImpossibleMode
                ? isAdmin
                  ? 'Vào Sút 1 Tỷ (Admin Miễn Phí)'
                  : club.coins < 10
                  ? 'Vào Sút 1 Tỷ (Cần ≥ 10 Xu)'
                  : `Vào Sút 1 Tỷ (-${impossibleFee.toLocaleString()} Xu)`
                : 'Vào Trận Đấu'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
