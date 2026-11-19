import {
  ArrowLeftRight,
  ClipboardCheck,
  Coins,
  Globe,
  Languages,
  LogOut,
  MessageSquare,
  PackageOpen,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UserPlus,
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
  DIFFICULTY_LABELS,
  GameMode,
  GameSnapshot,
  TEAM_PROFILES,
} from '../game/types';
import { OnlineAccountProfile } from '../services/onlineClubService';
import { AuthModalInitialView } from './AuthGateModal';

interface TopHudProps {
  snapshot: GameSnapshot;
  club: FcClubState;
  lang: Language;
  account: OnlineAccountProfile | null;
  isAdmin: boolean;
  canToggleAdminMode?: boolean;
  adminModeEnabled: boolean;
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
  onSetMode: (mode: GameMode) => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onExit: () => void;
}

const MODE_TABS: Array<{ id: GameMode; labelVi: string; labelEn: string }> = [
  { id: 'match', labelVi: 'Trận 3D', labelEn: '3D Match' },
  { id: 'vs_bot', labelVi: 'Đấu Bot', labelEn: 'Vs Bot' },
  { id: 'penalty', labelVi: 'Penalty', labelEn: 'Penalty' },
  { id: 'challenge', labelVi: 'Thử Thách', labelEn: 'Challenge' },
  { id: 'impossible', labelVi: 'Sút 1 Tỷ', labelEn: '1B Shot' },
  { id: 'gk_practice', labelVi: 'Làm GK', labelEn: 'GK Drill' },
  { id: 'practice', labelVi: 'Tập Sút', labelEn: 'Practice' },
];

export function TopHud({
  snapshot,
  club,
  lang,
  account,
  isAdmin,
  canToggleAdminMode = isAdmin,
  adminModeEnabled,
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
  onSetMode,
  onRestart,
  onToggleMute,
  onExit,
}: TopHudProps) {
  const squadOvr = computeSquadOvr(club.lineupIds);
  const claimableMissions = countClaimableMissions(club);
  const diffLabel = DIFFICULTY_LABELS[snapshot.difficulty].label;
  const diffColor =
    snapshot.difficulty === 'extreme'
      ? 'text-purple-400'
      : snapshot.difficulty === 'pro'
      ? 'text-rose-400'
      : snapshot.difficulty === 'medium'
      ? 'text-amber-400'
      : 'text-emerald-400';

  const homeTeam = TEAM_PROFILES[snapshot.homeTeamId];
  const awayTeam = TEAM_PROFILES[snapshot.awayTeamId];
  const matchMinute = Math.min(
    90,
    Math.floor(
      (snapshot.matchTimeSec / Math.max(1, snapshot.matchDurationSec)) * 90,
    ),
  );

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      {/* Zone 1: Single-line Brand Wordmark */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-[#0B1320]/90 border border-white/10 rounded-lg px-3.5 py-2">
        <span className="font-display text-xl sm:text-2xl font-extrabold tracking-wide text-white whitespace-nowrap shrink-0">
          {lang === 'vi' ? 'SÚT PHẠT 3D' : 'FREE KICK 3D'}
        </span>
        <span className="hidden lg:inline font-mono-tabular text-xs font-bold text-emerald-400">
          OVR {squadOvr}
        </span>
      </div>

      {/* Zone 2: Mode Segmented Tabs & Clean Tabular Match Stats */}
      <div className="pointer-events-auto hidden md:flex items-center gap-4 bg-[#0B1320]/90 border border-white/10 rounded-lg px-3 py-1.5">
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-md border border-white/5">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetMode(tab.id);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                snapshot.mode === tab.id
                  ? tab.id === 'match'
                    ? 'bg-violet-400 text-slate-950'
                    : tab.id === 'vs_bot'
                    ? 'bg-sky-400 text-slate-950'
                    : tab.id === 'penalty'
                    ? 'bg-rose-400 text-slate-950'
                    : tab.id === 'impossible'
                    ? 'bg-amber-400 text-slate-950 font-extrabold'
                    : tab.id === 'gk_practice'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                  : tab.id === 'impossible'
                  ? 'text-amber-300 hover:text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'vi' ? tab.labelVi : tab.labelEn}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10" aria-hidden="true" />

        {/* Unboxed Tabular Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-300 whitespace-nowrap shrink-0">
          {snapshot.mode === 'match' ? (
            <>
              <span className="font-mono-tabular font-bold text-sm text-white">
                <span className="text-emerald-300">{homeTeam.shortCode}</span>{' '}
                <strong className="text-emerald-400">
                  {snapshot.playerGoals}
                </strong>{' '}
                -{' '}
                <strong className="text-rose-400">{snapshot.botGoals}</strong>{' '}
                <span className="text-rose-300">{awayTeam.shortCode}</span>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono-tabular font-bold text-amber-300">
                {matchMinute}&apos;
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span
                className={`font-semibold ${
                  snapshot.matchPossession === 'home'
                    ? 'text-emerald-300'
                    : snapshot.matchPossession === 'away'
                    ? 'text-rose-300'
                    : 'text-slate-400'
                }`}
              >
                {snapshot.matchPossession === 'home'
                  ? 'Bạn cầm bóng'
                  : snapshot.matchPossession === 'away'
                  ? `${awayTeam.shortCode} cầm bóng`
                  : 'Tranh chấp'}
              </span>
            </>
          ) : snapshot.mode === 'vs_bot' || snapshot.mode === 'penalty' ? (
            <>
              <span className="font-mono-tabular font-bold text-sm text-white">
                Bạn{' '}
                <strong className="text-emerald-400">
                  {snapshot.playerGoals}
                </strong>{' '}
                -{' '}
                <strong className="text-rose-400">{snapshot.botGoals}</strong>{' '}
                Bot
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span
                className={`font-semibold ${
                  snapshot.turnRole === 'gk'
                    ? 'text-amber-300'
                    : 'text-sky-300'
                }`}
              >
                {snapshot.turnRole === 'gk' ? 'Bạn Làm GK' : 'Bạn Sút'}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>
                {snapshot.mode === 'penalty' && snapshot.round > 5 ? (
                  <strong className="text-rose-400">
                    Quyết định #{snapshot.round}
                  </strong>
                ) : (
                  <>
                    Lượt{' '}
                    <strong className="font-mono-tabular text-sm text-white">
                      {snapshot.round}/{snapshot.totalRounds}
                    </strong>
                  </>
                )}
              </span>
            </>
          ) : snapshot.mode === 'impossible' ? (
            <>
              <span className="font-bold text-amber-300">
                {lang === 'vi' ? 'Giải 1 Tỷ Xu' : '1B Coin Jackpot'}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-rose-400">
                {lang === 'vi' ? 'Không Thể Vào' : 'Impossible'}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono-tabular text-slate-200">
                {isAdmin
                  ? lang === 'vi'
                    ? 'Admin Miễn Phí'
                    : 'Admin Free'
                  : lang === 'vi'
                  ? 'Phí 10% / lượt'
                  : '10% Fee / shot'}
              </span>
            </>
          ) : snapshot.mode === 'gk_practice' ? (
            <>
              <span>
                Mức <strong className={diffColor}>{diffLabel}</strong>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>
                Cản phá{' '}
                <strong className="font-mono-tabular text-sm text-amber-400">
                  {snapshot.gkSaves}
                </strong>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>
                Điểm{' '}
                <strong className="font-mono-tabular text-sm text-emerald-400">
                  {snapshot.score}
                </strong>
              </span>
            </>
          ) : (
            <>
              <span>
                Mức <strong className={diffColor}>{diffLabel}</strong>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>
                Điểm{' '}
                <strong className="font-mono-tabular text-sm text-emerald-400">
                  {snapshot.score}
                </strong>
              </span>
              {snapshot.mode === 'challenge' ? (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Lượt{' '}
                    <strong className="font-mono-tabular text-sm text-white">
                      {snapshot.round}/{snapshot.totalRounds}
                    </strong>
                  </span>
                </>
              ) : null}
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span>
                Chuỗi{' '}
                <strong className="font-mono-tabular text-sm text-amber-400">
                  {snapshot.streak}
                </strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 3: Mobile Compact Score + Online, Missions, Packs, Account, Restart & Exit */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="flex md:hidden items-center gap-2 bg-[#0B1320]/90 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-200">
          {snapshot.mode === 'online_duel' ? (
            <span className="font-mono-tabular font-bold text-emerald-300 whitespace-nowrap">
              Online {snapshot.playerGoals}-{snapshot.botGoals}
            </span>
          ) : snapshot.mode === 'match' ? (
            <span className="font-mono-tabular font-bold text-white whitespace-nowrap">
              {homeTeam.shortCode} {snapshot.playerGoals}-{snapshot.botGoals}{' '}
              {awayTeam.shortCode} · {matchMinute}&apos;
            </span>
          ) : snapshot.mode === 'vs_bot' || snapshot.mode === 'penalty' ? (
            <span className="font-mono-tabular font-bold text-white whitespace-nowrap">
              Bạn {snapshot.playerGoals}-{snapshot.botGoals} Bot
            </span>
          ) : snapshot.mode === 'impossible' ? (
            <span className="font-mono-tabular font-bold text-amber-300 whitespace-nowrap">
              {lang === 'vi' ? 'Sút 1 Tỷ · Không thể vào' : '1B Shot · Impossible'}
            </span>
          ) : snapshot.mode === 'gk_practice' ? (
            <span className="font-mono-tabular font-bold text-amber-400 whitespace-nowrap">
              GK {snapshot.gkSaves} cứu thua
            </span>
          ) : (
            <span className="font-mono-tabular font-bold text-white whitespace-nowrap">
              {snapshot.score}đ
            </span>
          )}
        </div>

        {!account ? (
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenAuth('upgrade_guest');
            }}
            title={
              lang === 'vi'
                ? 'Tạo tài khoản với nick này để đăng nhập trên mọi thiết bị'
                : 'Create account with this profile to sync across devices'
            }
            className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus size={14} />
            <span className="hidden lg:inline">
              {lang === 'vi'
                ? 'Tạo tài khoản với nick này'
                : 'Save Nick to Account'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenOnlineArena('leaderboard');
            }}
            title={`@${account.username} · ELO ${account.stats.elo}`}
            className="hidden xl:flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>@{account.username}</span>
          </button>
        )}

        {snapshot.mode !== 'online_duel' ? (
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenOnlineArena('duel');
            }}
            title={lang === 'vi' ? 'Đấu Online 1v1 & Xếp Hạng' : 'Online 1v1 & Rank'}
            className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-bold bg-[#0B1320]/90 hover:border-emerald-300 border border-emerald-400/40 text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe size={14} />
            <span className="hidden sm:inline">
              {lang === 'vi' ? `Online (${onlineCount})` : `Online (${onlineCount})`}
            </span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenInbox();
          }}
          title={lang === 'vi' ? 'Hộp Thư Chat & Bật Mic Thoại' : 'Inbox Chat & Voice Mic'}
          className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-bold bg-[#0B1320]/90 hover:border-sky-300 border border-sky-400/40 text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MessageSquare size={14} />
          <span className="hidden lg:inline">
            {lang === 'vi' ? 'Hộp Thư' : 'Inbox'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenSocialPlaza();
          }}
          title={
            lang === 'vi'
              ? 'Khu Chat & Giải Trí Online (Disco, Khách Sạn 5★, Mini-Game)'
              : 'Online Social Plaza (Disco, 5★ Hotel, Mini-Games)'
          }
          className="flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-bold bg-[#0B1320]/90 hover:border-pink-300 border border-pink-400/45 text-pink-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles size={14} />
          <span className="hidden lg:inline">
            {lang === 'vi' ? 'Khu Giải Trí' : 'Plaza'}
          </span>
        </button>

        {canToggleAdminMode ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleAdminMode();
              }}
              title={
                adminModeEnabled
                  ? lang === 'vi'
                    ? 'Đang bật Chế độ Admin (Auto góc A + Auto GK + ∞ Xu). Bấm để chuyển sang Chế độ Người Chơi (Xu giới hạn)'
                    : 'Admin Mode ON (∞ Coins). Click to switch to Player Mode (finite Coins)'
                  : lang === 'vi'
                  ? 'Đang ở Chế độ Người Chơi (đá công bằng, dùng Xu giới hạn). Bấm để bật lại Chế độ Admin'
                  : 'Player Mode ON (fair play, finite Coins). Click to enable Admin Mode'
              }
              className={`flex items-center gap-1.5 h-10 px-2.5 border rounded-lg text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                adminModeEnabled
                  ? 'bg-emerald-400 hover:bg-emerald-300 border-emerald-200 text-slate-950'
                  : 'bg-sky-400 hover:bg-sky-300 border-sky-200 text-slate-950'
              }`}
            >
              <ShieldAlert size={14} />
              <span className="hidden sm:inline">
                {adminModeEnabled
                  ? lang === 'vi'
                    ? 'Chế độ: Admin'
                    : 'Mode: Admin'
                  : lang === 'vi'
                  ? 'Chế độ: Người Chơi'
                  : 'Mode: Player'}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenAdmin();
              }}
              title={lang === 'vi' ? 'Bảng Quản Trị Viên' : 'Admin Panel'}
              className="flex items-center gap-1.5 h-10 px-2.5 bg-amber-400 hover:bg-amber-300 border border-amber-200 rounded-lg text-xs font-extrabold text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldAlert size={14} />
              <span className="hidden sm:inline">
                {lang === 'vi' ? 'Quản Trị' : 'Admin'}
              </span>
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenStore('missions');
          }}
          title={
            lang === 'vi'
              ? 'Nhiệm Vụ Hằng Ngày & Tuần'
              : 'Daily & Weekly Missions'
          }
          className={`flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            claimableMissions > 0
              ? 'bg-sky-400 hover:bg-sky-300 border-sky-200 text-slate-950'
              : 'bg-[#0B1320]/90 hover:border-white/25 border-white/10 text-sky-300'
          }`}
        >
          <ClipboardCheck size={14} />
          <span className="hidden sm:inline">
            {lang === 'vi' ? 'Nhiệm Vụ' : 'Missions'}
          </span>
          {claimableMissions > 0 ? (
            <span className="font-mono-tabular">({claimableMissions})</span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenStore('market');
          }}
          title={
            lang === 'vi'
              ? 'Khu Trao Đổi & Rao Bán Cầu Thủ'
              : 'Player Transfer Market'
          }
          className={`flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            pendingMarketCoins > 0
              ? 'bg-violet-400 hover:bg-violet-300 border-violet-200 text-slate-950'
              : 'bg-[#0B1320]/90 hover:border-violet-300 border-violet-400/40 text-violet-300'
          }`}
        >
          <ArrowLeftRight size={14} />
          <span className="hidden lg:inline">
            {lang === 'vi' ? 'Trao Đổi' : 'Market'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenStore('packs');
          }}
          title={lang === 'vi' ? 'Mở Pack & Đội Hình FC' : 'Pack Store & Squad'}
          className="flex items-center gap-1.5 h-10 px-3 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 rounded-lg text-xs font-bold text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Coins size={14} />
          <span className="font-mono-tabular">
            {isAdmin ? '∞ Xu' : club.coins.toLocaleString()}
          </span>
          <PackageOpen size={14} className="hidden sm:inline" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleLang();
          }}
          title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          className="flex items-center gap-1 h-10 px-2.5 bg-[#0B1320]/90 border border-white/10 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
        >
          <Languages size={14} />
          <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={snapshot.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          title={snapshot.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className="flex items-center justify-center w-10 h-10 bg-[#0B1320]/90 border border-white/10 rounded-lg text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
        >
          {snapshot.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onRestart();
          }}
          aria-label={lang === 'vi' ? 'Đá lại từ đầu' : 'Restart'}
          title={lang === 'vi' ? 'Đá lại từ đầu' : 'Restart'}
          className="flex items-center gap-1.5 h-10 px-3 bg-[#0B1320]/90 border border-white/10 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw size={15} />
          <span className="hidden sm:inline">
            {lang === 'vi' ? 'Đá Lại' : 'Restart'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onExit();
          }}
          aria-label={lang === 'vi' ? 'Thoát ra sảnh chính' : 'Exit to Menu'}
          title={lang === 'vi' ? 'Thoát ra sảnh chính (Esc)' : 'Exit to Menu (Esc)'}
          className="flex items-center gap-1.5 h-10 px-3 bg-rose-950/85 hover:bg-rose-900 border border-rose-400/35 rounded-lg text-xs font-semibold text-rose-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut size={15} />
          <span>{lang === 'vi' ? 'Thoát' : 'Exit'}</span>
        </button>
      </div>
    </header>
  );
}
