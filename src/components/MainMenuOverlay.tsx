import {
  ArrowLeftRight,
  ClipboardCheck,
  CloudUpload,
  Coins,
  Flame,
  Globe,
  Hand,
  Languages,
  LogIn,
  LogOut,
  MessageSquare,
  PackageOpen,
  Play,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  computeSquadOvr,
  countClaimableMissions,
  FcClubState,
  Language,
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
  onOpenStore: (tab: 'packs' | 'squad' | 'missions' | 'market') => void;
  onOpenOnlineArena: (tab: 'duel' | 'leaderboard') => void;
  onOpenSocialPlaza: () => void;
  onOpenInbox: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: (view: AuthModalInitialView) => void;
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
  onToggleMute: () => void;
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'pro', 'extreme'];

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: 'Thủ môn chậm · Hàng rào thưa · AI nhẹ nhàng',
  medium: 'Cân bằng tiêu chuẩn · Gió & AI vừa phải',
  pro: 'Thủ môn phản xạ nhanh · Hàng rào dày · AI áp sát',
  extreme: 'Thủ môn siêu nhân · Hàng rào 7 người · AI tốc độ cao',
};

export function MainMenuOverlay({
  snapshot,
  club,
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
  onToggleMute,
}: MainMenuOverlayProps) {
  const isMatchMode = snapshot.mode === 'match';
  const isImpossibleMode = snapshot.mode === 'impossible';
  const impossibleFee = computeImpossibleEntryFee(club.coins, isAdmin);
  const squadOvr = computeSquadOvr(club.lineupIds);
  const claimableMissions = countClaimableMissions(club);
  const isVi = lang === 'vi';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070d17]/78 p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto bg-[#0B1320]/96 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold text-emerald-400">
              {lang === 'vi'
                ? 'Giải Đấu Bóng Đá 3D · Đá Phạt · Trận Đấu 5v5 · Mở Pack FC'
                : '3D Football · Free Kicks · 5v5 Match · FC Pack Club'}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide mt-0.5">
              {lang === 'vi' ? 'SÚT PHẠT 3D' : 'FREE KICK FC 3D'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              {lang === 'vi'
                ? 'Đấu kiếm Xu, mở 8 cấp Pack săn thẻ hiếm 130+ lên tới OVR 150, xếp đội hình & ra sân!'
                : 'Earn Coins, open 8 Pack tiers for rare 130+ up to 150 OVR legends, build your squad & play!'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono-tabular text-xs font-bold">
              <Coins size={15} />
              <span>{isAdmin ? '∞ Xu' : `${club.coins.toLocaleString()} Xu`}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono-tabular text-xs font-bold">
              <Shield size={15} />
              <span>OVR {squadOvr}</span>
            </div>

            <button
              type="button"
              onClick={onToggleLang}
              title={
                lang === 'vi'
                  ? 'Chuyển sang Tiếng Anh'
                  : 'Switch to Vietnamese'
              }
              className="flex items-center gap-1.5 h-10 px-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
            >
              <Languages size={15} />
              <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={snapshot.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="flex items-center justify-center w-10 h-10 bg-slate-900 border border-white/10 rounded-lg text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
            >
              {snapshot.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        {/* Online Account & Cross-Device Sync Bar */}
        {account ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/35">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <UserCheck size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                  @{account.username}{' '}
                  <span className="text-emerald-300 font-mono-tabular">
                    · {account.stats.elo} ELO
                  </span>
                </div>
                <div className="text-[11px] text-emerald-200/80 truncate">
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
                        ? 'Đang bật Chế độ Admin (Auto sút góc A + Auto GK bất bại + ∞ Xu). Nhấn để chuyển sang Chế độ Người Chơi (Xu giới hạn thực tế).'
                        : 'Đang ở Chế độ Người Chơi (đá công bằng, Xu giới hạn thực tế). Nhấn để bật lại Chế độ Admin.'
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer shrink-0 transition-colors ${
                      adminModeEnabled
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                        : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer shrink-0"
              >
                <LogOut size={13} />
                <span>{isVi ? 'Đăng xuất' : 'Log out'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-400/45">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                <CloudUpload size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-amber-200">
                  {hasUnsavedGuestProgress
                    ? isVi
                      ? 'Bạn đang chơi nick Khách chưa đăng nhập!'
                      : 'Playing without an account!'
                    : isVi
                    ? 'Đăng nhập để chơi Online & đồng bộ đa thiết bị'
                    : 'Sign in for Online Play & Cross-Device Sync'}
                </div>
                <div className="text-[11px] text-amber-100/85">
                  {isVi
                    ? 'Lưu Xu, thẻ OVR 150 & đội hình để đăng nhập trên mọi điện thoại/máy tính'
                    : 'Save Coins, 150 OVR cards & squad across all devices'}
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
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-200 font-bold text-xs cursor-pointer"
              >
                <span>{isVi ? '1. Tạo tài khoản' : '1. Sign Up'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-200 font-bold text-xs cursor-pointer"
              >
                <LogIn size={13} />
                <span>{isVi ? '2. Đăng nhập' : '2. Log In'}</span>
              </button>
            </div>
          </div>
        )}

        {/* FC Club, Inbox & Online Arena Quick Actions */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenOnlineArena('duel')}
            className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-gradient-to-r from-violet-500/25 to-emerald-500/15 border border-emerald-400/55 hover:border-emerald-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-400 text-slate-950 shrink-0">
                <Globe size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-emerald-200 truncate">
                  {isVi ? 'Đấu Online 1v1' : 'Online 1v1 PvP'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {isVi
                    ? `${onlineCount} online · Ghép trận & XH`
                    : `${onlineCount} online · Quick Match`}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-emerald-300 shrink-0">
              PvP →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('packs')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/5 border border-amber-400/45 hover:border-amber-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400 text-slate-950 shrink-0">
                <PackageOpen size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-amber-200 truncate">
                  {lang === 'vi' ? 'Cửa Hàng Pack' : 'Open FC Packs'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {lang === 'vi' ? 'Pack OVR 77–200' : 'Tiers · 77–200 OVR'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-amber-300 shrink-0">
              {isAdmin ? '∞ Xu' : club.coins.toLocaleString()} →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('market')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-violet-500/10 border border-violet-400/45 hover:border-violet-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-400 text-slate-950 shrink-0">
                <ArrowLeftRight size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-violet-200 truncate">
                  {lang === 'vi' ? 'Khu Trao Đổi' : 'Transfer Market'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
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
            <span className="font-mono-tabular text-xs font-bold text-violet-300 shrink-0">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('missions')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-sky-500/20 to-sky-400/5 border border-sky-400/45 hover:border-sky-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-400 text-slate-950 shrink-0">
                <ClipboardCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-sky-200 truncate">
                  {lang === 'vi' ? 'Nhiệm Vụ' : 'Missions'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {lang === 'vi'
                    ? 'Ghi 30 bàn · Góc A'
                    : 'Goals · Top Bins'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-sky-300 shrink-0">
              {claimableMissions > 0
                ? `${lang === 'vi' ? 'Nhận' : 'Claim'} ${claimableMissions} →`
                : '→'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStore('squad')}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-400/5 border border-emerald-400/45 hover:border-emerald-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500 text-slate-950 shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-emerald-200 truncate">
                  {lang === 'vi'
                    ? `Đội Hình (${club.ownedIds.length})`
                    : `Squad (${club.ownedIds.length})`}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {lang === 'vi'
                    ? 'Xếp đội hình 5v5'
                    : '5v5 starting lineup'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-emerald-300 shrink-0">
              OVR {squadOvr} →
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenInbox}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-sky-500/10 border border-cyan-400/45 hover:border-cyan-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-400 text-slate-950 shrink-0">
                <MessageSquare size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-cyan-200 truncate">
                  {lang === 'vi' ? 'Hộp Thư & Mic' : 'Inbox & Voice'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {lang === 'vi'
                    ? 'Chat thế giới · Bật Mic'
                    : 'Global Chat · Mic'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-cyan-300 shrink-0">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSocialPlaza}
            className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-amber-500/15 border border-pink-400/50 hover:border-pink-300 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-500 text-white shrink-0">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-pink-200 truncate">
                  {lang === 'vi'
                    ? 'Khu Chat & Giải Trí Online (Siêu Sao Resort)'
                    : 'Online Social Plaza & Resort (Disco · 5★ Hotel · Mini-Games)'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {lang === 'vi'
                    ? 'Chọn nhân vật danh thủ · Giao lưu chat · Nhảy sàn Disco · Vào Khách Sạn 5★ & Mini-Game'
                    : 'Pick famous footballers · Live chat · Disco floor · 5★ Hotel & Mini-Games'}
                </div>
              </div>
            </div>
            <span className="font-mono-tabular text-xs font-extrabold text-amber-300 shrink-0">
              {lang === 'vi' ? 'Vào Khu →' : 'Enter →'}
            </span>
          </button>
        </div>

        <div className="space-y-4 py-4">
          {/* 1. Game Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              1. Chế độ thi đấu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectMode('match')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  isMatchMode
                    ? 'bg-violet-500/20 border-violet-400 text-white'
                    : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="mt-0.5 text-violet-400 shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">
                    Trận Đấu 3D ({snapshot.matchFormat === '11v11' ? '11v11' : '5v5'})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Chọn 5v5 hoặc 11v11 sân cực đại 105m: rê bóng, bứt tốc, treo bổng &amp; dứt điểm!
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('vs_bot')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'vs_bot'
                    ? 'bg-sky-500/18 border-sky-400 text-white'
                    : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="mt-0.5 text-sky-400 shrink-0">
                  <Swords size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Thi Đấu Với Bot (1v1)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    5 lượt đấu luân phiên: Bạn sút phạt &amp; tự làm GK cản phá cú sút của Bot.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('penalty')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'penalty'
                    ? 'bg-rose-500/18 border-rose-400 text-white'
                    : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="mt-0.5 text-rose-400 shrink-0">
                  <Target size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Đá Penalty (11m)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Loạt sút luân lưu 5 quả 11m cân não: Bạn sút &amp; làm GK đối đầu Bot (có sút quyết định).
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('challenge')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'challenge'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white'
                    : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="mt-0.5 text-emerald-400 shrink-0">
                  <Trophy size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Thử Thách (5 Lượt)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Chinh phục 5 cự ly từ 18m đến 29m và lập kỷ lục điểm số.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('gk_practice')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'gk_practice'
                    ? 'bg-amber-400/15 border-amber-400 text-white'
                    : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="mt-0.5 text-amber-400 shrink-0">
                  <Hand size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Làm Thủ Môn (GK)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Trực tiếp điều khiển thủ môn bay người cản phá các siêu phẩm của Bot.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('practice')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  snapshot.mode === 'practice'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white'
                    : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="mt-0.5 text-emerald-300 shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold">Luyện Tập Sút Phạt &amp; Penalty</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tập không giới hạn Sút Phạt (18m–28m), xoáy ngang, đánh đầu &amp; Penalty 11m.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('impossible')}
                className={`sm:col-span-2 lg:col-span-3 flex items-start justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  isImpossibleMode
                    ? 'bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-amber-500/15 border-amber-400 text-white'
                    : 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-amber-400/35 text-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-amber-400 shrink-0">
                    <Flame size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-amber-300">
                        {isVi
                          ? 'Sút Không Thể Vào (Giải 1 Tỷ Xu)'
                          : 'Impossible Goal (1B Coin Jackpot)'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/25 border border-rose-400/45 text-[10px] font-extrabold text-rose-200">
                        {isAdmin
                          ? isVi
                            ? 'ADMIN MIỄN PHÍ'
                            : 'ADMIN FREE'
                          : isVi
                          ? 'PHÍ 10% SỐ XU / LƯỢT'
                          : '10% COINS FEE / SHOT'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      {isAdmin
                        ? isVi
                          ? `Quản trị viên tham gia Miễn Phí (∞ Xu) · Siêu thủ môn Yashin + hàng rào 7 người · Không thể đá vô!`
                          : `Admin enters Free (∞ Coins) · Boss GK Yashin + 7-man wall · Physically impossible to score!`
                        : isVi
                        ? `Tham gia tốn 10% số Xu hiện có (${
                            club.coins < 10
                              ? 'Cần tối thiểu 10 Xu'
                              : `${impossibleFee.toLocaleString()} Xu`
                          }) · Nếu sút vô thưởng ${IMPOSSIBLE_REWARD_COINS.toLocaleString()} Xu (Không thể đá vô!)`
                        : `Costs 10% of your Coins (${
                            club.coins < 10
                              ? 'Min 10 Coins'
                              : `${impossibleFee.toLocaleString()} Coins`
                          }) · Score to win ${IMPOSSIBLE_REWARD_COINS.toLocaleString()} Coins (Impossible!)`}
                    </div>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-extrabold text-amber-300 shrink-0 self-center">
                  {isAdmin
                    ? '0 Xu'
                    : club.coins < 10
                    ? '<10 Xu'
                    : `-${impossibleFee.toLocaleString()} Xu`}
                </span>
              </button>
            </div>

            {isMatchMode ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-violet-500/12 border border-violet-400/40">
                <span className="text-xs font-bold text-violet-200 mr-1">
                  {isVi ? 'Thể thức sân 105m:' : 'Pitch Format:'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectMatchFormat('5v5')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                    snapshot.matchFormat === '5v5'
                      ? 'bg-violet-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  5v5 (Nhanh &amp; Gọn)
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMatchFormat('11v11')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                    snapshot.matchFormat === '11v11'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  11v11 (Sân Chuẩn FIFA 105m)
                </button>
              </div>
            ) : null}

            {snapshot.mode === 'practice' || snapshot.mode === 'gk_practice' ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/85 border border-white/10">
                <span className="text-xs font-semibold text-slate-300 mr-1">
                  {snapshot.mode === 'gk_practice'
                    ? 'Nội dung tập bắt GK:'
                    : 'Nội dung tập sút:'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPracticeFocus('freekick')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    snapshot.practiceFocus === 'freekick'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
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
                      ? 'bg-rose-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {snapshot.mode === 'gk_practice'
                    ? 'Bắt Penalty (11m)'
                    : 'Luyện Penalty (11m)'}
                </button>
                {snapshot.mode === 'practice' ? (
                  <button
                    type="button"
                    onClick={() => onSelectPracticeFocus('corner')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      snapshot.practiceFocus === 'corner'
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    Luyện Phạt Góc (Đánh Đầu / Sút Thẳng)
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* 2. Difficulty Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              2. Chọn độ khó
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTY_ORDER.map((diff) => {
                const info = DIFFICULTY_LABELS[diff];
                const active = snapshot.difficulty === diff;
                const activeStyles =
                  diff === 'extreme'
                    ? 'bg-purple-500/20 border-purple-400 text-white'
                    : diff === 'pro'
                    ? 'bg-rose-500/18 border-rose-400 text-white'
                    : diff === 'medium'
                    ? 'bg-amber-400/15 border-amber-400 text-white'
                    : 'bg-emerald-500/15 border-emerald-400 text-white';

                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onSelectDifficulty(diff)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? activeStyles
                        : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-sm font-bold whitespace-nowrap">
                        {info.label}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-slate-300">
                        ×{info.scoreMult.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">
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
                <label className="block text-xs font-semibold text-emerald-300 mb-2">
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
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-slate-900/75 border-white/10 text-slate-200 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-7 h-6 rounded font-display font-extrabold text-[11px] shrink-0 border border-white/25"
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
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          {star.shortName} (#{star.numberStr}) · GK {gk.shortName}
                        </div>
                        <div className="mt-1 font-mono-tabular text-[10px] text-slate-300">
                          Công {t.attackRating} · Thủ {t.defenseRating}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-300 mb-2">
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
                            ? 'bg-rose-500/20 border-rose-400 text-white'
                            : 'bg-slate-900/75 border-white/10 text-slate-200 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-7 h-6 rounded font-display font-extrabold text-[11px] shrink-0 border border-white/25"
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
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          {star.shortName} (#{star.numberStr}) · GK {gk.shortName}
                        </div>
                        <div className="mt-1 font-mono-tabular text-[10px] text-slate-300">
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
                <label className="block text-xs font-semibold text-slate-300 mb-2">
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
                            ? 'bg-slate-100 text-slate-950 border-white'
                            : 'bg-slate-900/75 border-white/10 text-slate-200 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded font-display font-extrabold text-xs shrink-0 border border-white/15"
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
                              active ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {k.foot === 'left' ? 'Trái' : 'Phải'}
                          </span>
                        </div>

                        <div
                          className={`text-[10px] mt-1 truncate ${
                            active ? 'text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          {k.specialty}
                        </div>

                        <div
                          className={`mt-1 flex items-center gap-2 font-mono-tabular text-[10px] ${
                            active ? 'text-slate-800' : 'text-slate-300'
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
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  4. Chọn thủ môn (GK · {GK_ORDER.length} danh thủ){' '}
                  <span className="font-normal text-slate-400">
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
                            ? 'bg-amber-300 text-slate-950 border-amber-200'
                            : 'bg-slate-900/75 border-white/10 text-slate-200 hover:border-white/25'
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
                            className={`text-[11px] font-semibold ${
                              active ? 'text-slate-700' : 'text-amber-400'
                            }`}
                          >
                            GK
                          </span>
                        </div>

                        <div
                          className={`text-[11px] mt-1 ${
                            active ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {gk.specialty}
                        </div>

                        <div
                          className={`mt-1.5 flex items-center gap-2.5 font-mono-tabular text-[11px] ${
                            active ? 'text-slate-900' : 'text-slate-300'
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
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              5.{' '}
              {isVi
                ? 'Skin Cầu Thủ 3D (Áo đấu · Kiểu tóc · Hào quang sân cỏ)'
                : '3D Player Skins (Kit Pattern · Hairstyle · Pitch Aura)'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-slate-900/75 border-white/10 text-slate-200 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="relative inline-flex w-5 h-5 rounded-md border border-white/30 overflow-hidden shrink-0"
                        style={{ backgroundColor: skin.jerseyColor }}
                      >
                        <span
                          className="absolute bottom-0 right-0 w-2.5 h-2.5"
                          style={{ backgroundColor: skin.accentColor }}
                        />
                      </span>
                      <span className="text-xs font-bold truncate">
                        {isVi ? skin.nameVi : skin.nameEn}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {isVi ? skin.badgeVi : skin.badgeEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Running Aura Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
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
                        ? 'bg-amber-400/20 border-amber-300 text-white'
                        : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/40"
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
        <div className="pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield size={14} className="text-emerald-400 shrink-0" />
            <span>
              {isMatchMode
                ? 'WASD / Mũi tên di chuyển · Space sút/cướp bóng · J chuyền · K treo bổng · Q đổi cầu thủ'
                : 'Sút Xoáy Ngang vòng hàng rào · Treo Bóng đồng đội #9 đánh đầu · Penalty 11m & bắt GK'}
            </span>
          </div>

          <button
            type="button"
            onClick={onStartGame}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              isImpossibleMode
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
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
