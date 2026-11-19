import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Flame,
  Lock,
  Minus,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Language } from '../game/fcData';
import { auth } from '../services/firebaseClient';
import {
  ADMIN_EMAIL,
  adminAdjustPlayerCoins,
  adminKickPlayer,
  AdminPlayerSummary,
  fetchAllPlayersForAdmin,
  MAX_CLUB_COINS,
} from '../services/onlineClubService';
import { OnlinePlayerBadge } from '../services/onlineMatchClient';

interface VisitLogEntry {
  sessionId: string;
  playerId: string;
  username: string;
  accountType: 'guest' | 'account';
  modeLabel: string;
  startedAtMs: number;
  lastSeenAtMs: number;
  endedAtMs: number | null;
  durationSec: number;
  isOnline: boolean;
}

function formatExactDateTime(ms: number): string {
  try {
    const d = new Date(ms);
    const time = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const date = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${time} · ${date}`;
  } catch {
    return '';
  }
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${rem}s`;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
}

interface AdminPanelModalProps {
  lang: Language;
  currentAdminUid: string;
  onlinePlayers: OnlinePlayerBadge[];
  onAdminCoinsAdjusted: (targetUid: string, nextCoins: number) => void;
  onKickOnlinePlayer: (targetPlayerId: string, label: string, reason: string) => void;
  onEnterImpossible?: () => void;
  onClose: () => void;
}

const QUICK_DELTAS = [
  1000,
  10000,
  100000,
  1_000_000,
  60_000_000,
  1_000_000_000,
  -500,
  -5000,
  -50000,
];

export function AdminPanelModal({
  lang,
  currentAdminUid,
  onlinePlayers,
  onAdminCoinsAdjusted,
  onKickOnlinePlayer,
  onEnterImpossible,
  onClose,
}: AdminPanelModalProps) {
  const isVi = lang === 'vi';
  const [adminTab, setAdminTab] = useState<'players' | 'visits'>('players');
  const [players, setPlayers] = useState<AdminPlayerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [kickReason, setKickReason] = useState(
    'Bạn đã bị Quản Trị Viên kick khỏi trò chơi.',
  );
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Visit & Playtime Tracker state (Admin-only)
  const [visits, setVisits] = useState<VisitLogEntry[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [visitFilter, setVisitFilter] = useState<'all' | 'guest' | 'account'>(
    'all',
  );
  const [visitSearch, setVisitSearch] = useState('');

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAllPlayersForAdmin();
      setPlayers(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isVi
          ? 'Không thể tải danh sách người chơi.'
          : 'Failed to load player list.',
      );
    } finally {
      setLoading(false);
    }
  }, [isVi]);

  const loadVisits = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.email?.toLowerCase() !== ADMIN_EMAIL) {
      setVisitsError('Chỉ Quản Trị Viên bot522409@gmail.com mới được xem.');
      return;
    }
    setVisitsLoading(true);
    setVisitsError(null);
    try {
      const token = await fbUser.getIdToken();
      const resp = await fetch('/api/admin/visits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as { visits?: VisitLogEntry[] };
      setVisits(Array.isArray(data.visits) ? data.visits : []);
    } catch (err) {
      setVisitsError(
        err instanceof Error
          ? `Không thể tải nhật ký truy cập (${err.message}).`
          : 'Không thể tải nhật ký truy cập.',
      );
    } finally {
      setVisitsLoading(false);
    }
  }, []);

  const handleClearVisits = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.email?.toLowerCase() !== ADMIN_EMAIL) return;
    setVisitsLoading(true);
    setVisitsError(null);
    try {
      const token = await fbUser.getIdToken();
      const resp = await fetch('/api/admin/visits', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setVisits([]);
    } catch (err) {
      setVisitsError(
        err instanceof Error ? err.message : 'Xoá lịch sử truy cập thất bại.',
      );
    } finally {
      setVisitsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlayers();
    void loadVisits();
  }, [loadPlayers, loadVisits]);

  useEffect(() => {
    if (adminTab !== 'visits') return;
    const timer = window.setInterval(() => {
      void loadVisits();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [adminTab, loadVisits]);

  const filteredVisits = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    return visits.filter((v) => {
      if (visitFilter !== 'all' && v.accountType !== visitFilter) return false;
      if (!q) return true;
      return (
        v.username.toLowerCase().includes(q) ||
        v.playerId.toLowerCase().includes(q) ||
        v.modeLabel.toLowerCase().includes(q)
      );
    });
  }, [visits, visitFilter, visitSearch]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.uid.toLowerCase().includes(q),
    );
  }, [players, search]);

  const otherOnlinePlayers = useMemo(
    () => onlinePlayers.filter((op) => op.playerId !== currentAdminUid),
    [onlinePlayers, currentAdminUid],
  );

  const totalCirculation = useMemo(
    () =>
      players
        .filter((p) => p.uid !== currentAdminUid)
        .reduce((acc, p) => acc + p.coins, 0),
    [players, currentAdminUid],
  );

  const handleSetCoins = async (
    player: AdminPlayerSummary,
    targetCoins: number,
    actionLabel: string,
  ) => {
    const clamped = Math.max(0, Math.min(MAX_CLUB_COINS, Math.round(targetCoins)));
    setBusyUid(player.uid);
    setError(null);
    setStatusMessage(null);
    try {
      const saved = await adminAdjustPlayerCoins(player.uid, clamped);
      setPlayers((prev) =>
        prev.map((item) =>
          item.uid === player.uid ? { ...item, coins: saved } : item,
        ),
      );
      onAdminCoinsAdjusted(player.uid, saved);
      setStatusMessage(
        isVi
          ? `${actionLabel} thành công cho @${player.username}: còn ${saved.toLocaleString()} Xu.`
          : `Updated @${player.username} to ${saved.toLocaleString()} Coins.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isVi
          ? 'Cập nhật Xu thất bại.'
          : 'Failed to update coins.',
      );
    } finally {
      setBusyUid(null);
    }
  };

  const handleKickAccountPlayer = async (player: AdminPlayerSummary) => {
    const reason =
      kickReason.trim() || 'Bạn đã bị Quản Trị Viên kick khỏi hệ thống.';
    setBusyUid(player.uid);
    setError(null);
    setStatusMessage(null);
    try {
      await adminKickPlayer(player.uid, reason);
      onKickOnlinePlayer(player.uid, `@${player.username}`, reason);
      setStatusMessage(
        isVi
          ? `Đã kick người chơi @${player.username} khỏi hệ thống & phòng đấu.`
          : `Kicked player @${player.username} from session & online rooms.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isVi
          ? 'Kick người chơi thất bại.'
          : 'Failed to kick player.',
      );
    } finally {
      setBusyUid(null);
    }
  };

  const handleKickLiveOnline = async (op: OnlinePlayerBadge) => {
    const reason =
      kickReason.trim() || 'Bạn đã bị Quản Trị Viên kick khỏi phòng đấu.';
    setError(null);
    setStatusMessage(null);
    onKickOnlinePlayer(op.playerId, op.username, reason);
    const hasAccount = players.some((p) => p.uid === op.playerId);
    if (hasAccount) {
      setBusyUid(op.playerId);
      try {
        await adminKickPlayer(op.playerId, reason);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isVi
            ? 'Không thể ghi trạng thái kick lên Firestore.'
            : 'Failed writing Firestore kick signal.',
        );
      } finally {
        setBusyUid(null);
      }
    }
    setStatusMessage(
      isVi
        ? `Đã kick @${op.username} đang online khỏi trận/sảnh.`
        : `Kicked online player @${op.username}.`,
    );
  };

  const parseCustomAmount = (uid: string): number => {
    const raw = (customAmounts[uid] ?? '10000').replace(/[^0-9]/g, '');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a14]/88 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0B1320] border border-amber-400/35 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#0d1728]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300">
              <ShieldAlert size={14} />
              <span>
                {isVi
                  ? `BẢNG QUẢN TRỊ VIÊN · CHỈ ${ADMIN_EMAIL}`
                  : `ADMIN PANEL · ${ADMIN_EMAIL} ONLY`}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {isVi
                ? 'QUẢN LÝ NGƯỜI CHƠI, KICK & THƯỞNG / PHẠT XU'
                : 'PLAYER MANAGEMENT, KICK & COIN MODERATION'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEnterImpossible ? (
              <button
                type="button"
                onClick={onEnterImpossible}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                <Flame size={14} />
                <span>
                  {isVi
                    ? 'Sút Không Thể Vào (Miễn phí)'
                    : 'Impossible Goal (Free)'}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                adminTab === 'visits' ? void loadVisits() : void loadPlayers()
              }
              disabled={adminTab === 'visits' ? visitsLoading : loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  (adminTab === 'visits' ? visitsLoading : loading)
                    ? 'animate-spin'
                    : ''
                }
              />
              <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Admin Sub-tabs */}
        <div className="flex items-center gap-2 px-5 pt-2.5 border-b border-white/10 bg-[#0b1424]">
          <button
            type="button"
            onClick={() => setAdminTab('players')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              adminTab === 'players'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>
              {isVi
                ? `Quản Lý Xu & Kick (${players.length})`
                : `Coins & Kick (${players.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('visits');
              void loadVisits();
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              adminTab === 'visits'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>
              {isVi
                ? `Lượt Truy Cập & Thời Gian Chơi (${visits.length})`
                : `Visit & Playtime Logs (${visits.length})`}
            </span>
          </button>
        </div>

        {/* Body */}
        {adminTab === 'visits' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-xs text-emerald-100">
              <Eye size={16} className="text-emerald-300 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-emerald-200">
                  {isVi
                    ? `Theo Dõi Lượt Truy Cập Riêng Cho Admin (${ADMIN_EMAIL}):`
                    : `Private Admin Visit Tracker (${ADMIN_EMAIL}):`}
                </strong>{' '}
                {isVi
                  ? 'Ghi lại đầy đủ giờ : phút : giây truy cập, thời gian đã chơi và chế độ của mọi người chơi — bao gồm cả khách Chơi Trải Nghiệm không đăng nhập.'
                  : 'Tracks exact arrival time (HH:mm:ss), playtime duration, and mode for every visitor — including Guest trial sessions.'}
              </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                <div className="text-[11px] text-slate-400 font-bold">
                  {isVi ? 'Tổng Lượt Truy Cập' : 'Total Visits'}
                </div>
                <div className="font-mono-tabular text-xl font-extrabold text-white mt-0.5">
                  {visits.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                <div className="text-[11px] text-emerald-300 font-bold">
                  {isVi ? 'Đang Chơi Hiện Tại' : 'Active Now'}
                </div>
                <div className="font-mono-tabular text-xl font-extrabold text-emerald-300 mt-0.5">
                  {visits.filter((v) => v.isOnline).length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30">
                <div className="text-[11px] text-amber-300 font-bold">
                  {isVi ? 'Chơi Trải Nghiệm (Khách)' : 'Guest Trial'}
                </div>
                <div className="font-mono-tabular text-xl font-extrabold text-amber-300 mt-0.5">
                  {visits.filter((v) => v.accountType === 'guest').length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/30">
                <div className="text-[11px] text-sky-300 font-bold">
                  {isVi ? 'Có Tài Khoản' : 'Registered Accounts'}
                </div>
                <div className="font-mono-tabular text-xl font-extrabold text-sky-300 mt-0.5">
                  {visits.filter((v) => v.accountType === 'account').length}
                </div>
              </div>
            </div>

            {/* Filter & Clear Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ['all', isVi ? 'Tất cả' : 'All'],
                    ['guest', isVi ? 'Chơi Trải Nghiệm (Khách)' : 'Guest Trial'],
                    ['account', isVi ? 'Tài Khoản' : 'Accounts'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVisitFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                      visitFilter === key
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end min-w-[220px]">
                <div className="relative flex-1 max-w-xs">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={visitSearch}
                    onChange={(e) => setVisitSearch(e.target.value)}
                    placeholder={
                      isVi
                        ? 'Tìm tên, ID hoặc chế độ...'
                        : 'Search name, ID or mode...'
                    }
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={visitsLoading || visits.length === 0}
                  onClick={() => void handleClearVisits()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-45 shrink-0"
                >
                  <Trash2 size={13} />
                  <span>{isVi ? 'Xoá lịch sử' : 'Clear Logs'}</span>
                </button>
              </div>
            </div>

            {visitsError ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-400/45 text-xs font-semibold text-rose-200">
                <AlertTriangle size={15} className="shrink-0 text-rose-300" />
                <span>{visitsError}</span>
              </div>
            ) : null}

            {visitsLoading && visits.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {isVi
                  ? 'Đang tải danh sách lượt truy cập...'
                  : 'Loading visit logs...'}
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {isVi
                  ? 'Chưa ghi nhận lượt truy cập nào.'
                  : 'No visit sessions recorded yet.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVisits.map((v) => (
                  <div
                    key={v.sessionId}
                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                      v.isOnline
                        ? 'bg-emerald-500/10 border-emerald-400/35'
                        : 'bg-slate-900/75 border-white/10'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            v.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <span className="text-sm font-extrabold text-white">
                          @{v.username}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            v.accountType === 'guest'
                              ? 'bg-amber-400/20 border border-amber-400/45 text-amber-200'
                              : 'bg-sky-400/20 border border-sky-400/45 text-sky-200'
                          }`}
                        >
                          {v.accountType === 'guest'
                            ? isVi
                              ? 'Chơi Trải Nghiệm (Khách)'
                              : 'Guest Trial'
                            : isVi
                            ? 'Tài Khoản'
                            : 'Account'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-200">
                          {v.modeLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 font-mono-tabular">
                        <span>
                          {isVi ? 'Vào lúc:' : 'Arrived:'}{' '}
                          <strong className="text-slate-200">
                            {formatExactDateTime(v.startedAtMs)}
                          </strong>
                        </span>
                        {v.endedAtMs ? (
                          <span>
                            {isVi ? 'Rời lúc:' : 'Left:'}{' '}
                            <strong className="text-slate-300">
                              {formatExactDateTime(v.endedAtMs)}
                            </strong>
                          </span>
                        ) : null}
                        <span className="text-slate-500">ID: {v.playerId}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs font-mono-tabular font-extrabold text-amber-300">
                        {isVi ? 'Đã chơi:' : 'Played:'}{' '}
                        {formatDuration(v.durationSec)}
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                          v.isOnline
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {v.isOnline
                          ? isVi
                            ? 'Đang Chơi'
                            : 'Playing'
                          : isVi
                          ? 'Đã Thoát'
                          : 'Exited'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Security transparency note regarding passwords */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-400/35 text-xs text-sky-100">
            <Lock size={16} className="text-sky-300 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-sky-200">
                {isVi
                  ? 'Bảo mật mật khẩu Firebase Authentication:'
                  : 'Firebase Auth Password Protection:'}
              </strong>{' '}
              {isVi
                ? 'Mật khẩu của mọi tài khoản đều được Firebase mã hoá một chiều an toàn và không lưu dạng chữ thường trong cơ sở dữ liệu. Bạn có thể thưởng/phạt Xu hoặc bấm Kick để ngắt kết nối người chơi vi phạm ngay lập tức.'
                : 'All user passwords are encrypted one-way by Firebase Authentication. You can reward/fine Coins or Kick disruptive players immediately.'}
            </div>
          </div>

          {/* Kick Reason + Live Online Strip */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-400/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-200">
                <Radio size={14} className="text-emerald-400" />
                <span>
                  {isVi
                    ? `Đang Online trực tiếp (${otherOnlinePlayers.length} người khác — gồm cả nick Khách)`
                    : `Live Online (${otherOnlinePlayers.length} others — incl. Guests)`}
                </span>
              </div>
              <input
                type="text"
                value={kickReason}
                onChange={(e) => setKickReason(e.target.value)}
                placeholder={isVi ? 'Lý do kick người chơi...' : 'Kick reason...'}
                aria-label={isVi ? 'Lý do kick' : 'Kick reason'}
                className="flex-1 min-w-[200px] max-w-sm px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            {otherOnlinePlayers.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                {isVi
                  ? 'Hiện chưa có người chơi khác kết nối online.'
                  : 'No other players currently connected online.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {otherOnlinePlayers.map((op) => (
                  <div
                    key={op.playerId}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/15 text-xs"
                  >
                    <span className="font-bold text-white">@{op.username}</span>
                    <span className="font-mono-tabular text-[11px] text-emerald-300">
                      OVR {op.squadOvr}
                    </span>
                    <button
                      type="button"
                      disabled={busyUid === op.playerId}
                      onClick={() => void handleKickLiveOnline(op)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      <UserX size={12} />
                      <span>Kick</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-slate-200">
                <Users size={14} className="text-emerald-400" />
                <span>
                  {players.length}{' '}
                  {isVi ? 'tài khoản người chơi' : 'player accounts'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/35 text-xs font-bold text-amber-300 font-mono-tabular">
                <Coins size={14} />
                <span>
                  {isVi ? 'Tổng Xu người chơi:' : 'Player Coins:'}{' '}
                  {totalCirculation.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isVi ? 'Tìm theo tên hoặc UID...' : 'Search username or UID...'
                }
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {statusMessage ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/45 text-xs font-semibold text-emerald-200">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
              <span>{statusMessage}</span>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-400/45 text-xs font-semibold text-rose-200">
              <AlertTriangle size={15} className="shrink-0 text-rose-300" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Player List */}
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {isVi
                ? 'Đang tải danh sách tài khoản người chơi...'
                : 'Loading player accounts...'}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {isVi
                ? 'Không tìm thấy tài khoản người chơi nào.'
                : 'No matching player accounts found.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPlayers.map((p) => {
                const isSelf = p.uid === currentAdminUid;
                const isBusy = busyUid === p.uid;
                const customVal = customAmounts[p.uid] ?? '10000';
                const isOnlineNow = otherOnlinePlayers.some(
                  (op) => op.playerId === p.uid,
                );

                return (
                  <div
                    key={p.uid}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isSelf
                        ? 'bg-amber-500/10 border-amber-400/45'
                        : 'bg-slate-900/75 border-white/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-white">
                            @{p.username}
                          </span>
                          {isSelf ? (
                            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                              ADMIN
                            </span>
                          ) : isOnlineNow ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-[10px] font-extrabold">
                              ONLINE
                            </span>
                          ) : null}
                          <span className="text-[11px] font-mono-tabular text-emerald-300 font-bold">
                            OVR {p.squadOvr}
                          </span>
                          <span className="text-[11px] font-mono-tabular text-sky-300 font-bold">
                            ELO {p.elo}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-1">
                          <span className="font-mono-tabular">
                            UID: {p.uid}
                          </span>
                          <span>
                            {isVi ? 'Thẻ:' : 'Cards:'} {p.ownedCount}
                          </span>
                          <span>
                            {isVi ? 'Thắng:' : 'Wins:'} {p.onlineWins} ·{' '}
                            {isVi ? 'Bàn:' : 'Goals:'} {p.onlineGoals}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            <Lock size={11} className="text-sky-400" />
                            <span>
                              {isVi
                                ? 'MK: Đã mã hoá Firebase'
                                : 'PW: Encrypted'}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono-tabular text-sm font-extrabold">
                          <Coins size={15} />
                          <span>
                            {isSelf
                              ? isVi
                                ? '∞ Xu (Vô hạn)'
                                : '∞ Coins (Unlimited)'
                              : `${p.coins.toLocaleString()} Xu`}
                          </span>
                        </div>

                        {!isSelf ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleKickAccountPlayer(p)}
                            title={
                              isVi
                                ? 'Kick người chơi này khỏi phiên đấu & đăng xuất'
                                : 'Kick this player from game & sign them out'
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer disabled:opacity-50"
                          >
                            <UserX size={14} />
                            <span>{isVi ? 'Kick' : 'Kick'}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Reward / Fine Controls */}
                    {isSelf ? (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs font-semibold text-amber-200">
                        {isVi
                          ? 'Khi bật Chế độ Admin, bạn có ∞ Xu vô hạn (mở mọi Pack miễn phí). Khi chuyển sang Chế độ Người Chơi, tài khoản dùng số Xu giới hạn thực tế giống người chơi khác.'
                          : 'In Admin Mode, you have unlimited ∞ Coins (all Packs free). In Player Mode, you use real finite Coins.'}
                      </div>
                    ) : (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      {/* Quick presets */}
                      <div className="flex flex-wrap items-center gap-1">
                        {QUICK_DELTAS.map((delta) => {
                          const isPlus = delta > 0;
                          return (
                            <button
                              key={`${p.uid}-${delta}`}
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleSetCoins(
                                  p,
                                  p.coins + delta,
                                  isPlus
                                    ? `Thưởng +${delta.toLocaleString()} Xu`
                                    : `Phạt ${delta.toLocaleString()} Xu`,
                                )
                              }
                              className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono-tabular transition-colors cursor-pointer disabled:opacity-50 ${
                                isPlus
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-400/35'
                                  : 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-400/35'
                              }`}
                            >
                              {isPlus ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleSetCoins(p, 0, 'Phạt xoá về 0 Xu')
                          }
                          className="px-2 py-1 rounded-md text-[11px] font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-400/35 cursor-pointer disabled:opacity-50"
                        >
                          Về 0
                        </button>
                      </div>

                      {/* Custom amount + Reward / Fine / Set */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customVal}
                          onChange={(e) =>
                            setCustomAmounts((prev) => ({
                              ...prev,
                              [p.uid]: e.target.value,
                            }))
                          }
                          aria-label="Số Xu tuỳ chỉnh"
                          className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs font-mono-tabular text-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            const amt = parseCustomAmount(p.uid);
                            if (amt <= 0) return;
                            void handleSetCoins(
                              p,
                              p.coins + amt,
                              `Thưởng +${amt.toLocaleString()} Xu`,
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                        >
                          <Plus size={13} />
                          <span>{isVi ? 'Thưởng' : 'Reward'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            const amt = parseCustomAmount(p.uid);
                            if (amt <= 0) return;
                            void handleSetCoins(
                              p,
                              p.coins - amt,
                              `Phạt -${amt.toLocaleString()} Xu`,
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs cursor-pointer disabled:opacity-50"
                        >
                          <Minus size={13} />
                          <span>{isVi ? 'Phạt' : 'Fine'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            const raw = (customAmounts[p.uid] ?? '0').replace(/[^0-9]/g, '');
                            const exact = Number(raw);
                            if (!Number.isFinite(exact)) return;
                            void handleSetCoins(
                              p,
                              exact,
                              `Đặt số Xu = ${exact.toLocaleString()}`,
                            );
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isVi ? 'Đặt Xu' : 'Set'}
                        </button>
                      </div>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
