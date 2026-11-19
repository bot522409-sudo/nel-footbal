import {
  Check,
  Copy,
  Crown,
  Globe,
  Loader2,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Search,
  Swords,
  Trophy,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { computeSquadOvr, FcClubState, Language } from '../game/fcData';
import {
  LeaderboardPlayerEntry,
  OnlineAccountProfile,
  OnlinePresenceCloudRecord,
  subscribeLeaderboard,
} from '../services/onlineClubService';
import {
  OnlinePlayerActivity,
  OnlinePlayerBadge,
  OnlinePresenceInfo,
  OnlineRoomState,
} from '../services/onlineMatchClient';

interface OnlineArenaModalProps {
  lang: Language;
  club: FcClubState;
  account: OnlineAccountProfile | null;
  currentPlayerId: string;
  displayUsername: string;
  wsConnected: boolean;
  presence: OnlinePresenceInfo;
  cloudPresencePlayers: OnlinePresenceCloudRecord[];
  inQueue: boolean;
  waitingRoom: OnlineRoomState | null;
  roomError: string | null;
  initialTab?: 'duel' | 'leaderboard';
  onQuickMatch: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onChallengePlayer: (targetPlayerId: string) => void;
  onOpenInboxDm: (playerId: string, username: string) => void;
  onRefreshPresence: () => void;
  onCancelWait: () => void;
  onOpenAuthUpgrade: () => void;
  onClose: () => void;
}

function activityBadge(
  activity: OnlinePlayerActivity | undefined,
  modeLabel: string | undefined,
  waitingRoomCode: string | null | undefined,
  isVi: boolean,
): { label: string; cls: string } {
  switch (activity) {
    case 'duel':
      return {
        label: isVi ? 'Đang Đấu 1v1' : 'In 1v1 Duel',
        cls: 'bg-rose-500/20 border-rose-400/45 text-rose-200',
      };
    case 'waiting':
      return {
        label: waitingRoomCode
          ? isVi
            ? `Chờ Phòng ${waitingRoomCode}`
            : `Room ${waitingRoomCode}`
          : isVi
          ? 'Đang Chờ Đấu'
          : 'Waiting Room',
        cls: 'bg-amber-400/20 border-amber-400/50 text-amber-200',
      };
    case 'queue':
      return {
        label: isVi ? 'Đang Tìm Trận' : 'In Queue',
        cls: 'bg-sky-500/20 border-sky-400/45 text-sky-200',
      };
    case 'playing':
      return {
        label: modeLabel || (isVi ? 'Đang Đá Sân' : 'On Pitch'),
        cls: 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200',
      };
    default:
      return {
        label: modeLabel || (isVi ? 'Ở Sảnh Chính' : 'In Lobby'),
        cls: 'bg-slate-800 border-white/15 text-slate-300',
      };
  }
}

export function OnlineArenaModal({
  lang,
  club,
  account,
  currentPlayerId,
  displayUsername,
  wsConnected,
  presence,
  cloudPresencePlayers,
  inQueue,
  waitingRoom,
  roomError,
  initialTab = 'duel',
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  onChallengePlayer,
  onOpenInboxDm,
  onRefreshPresence,
  onCancelWait,
  onOpenAuthUpgrade,
  onClose,
}: OnlineArenaModalProps) {
  const [tab, setTab] = useState<'duel' | 'leaderboard'>(initialTab);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayerEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [challengedIds, setChallengedIds] = useState<Record<string, boolean>>(
    {},
  );

  const isVi = lang === 'vi';
  const squadOvr = computeSquadOvr(club.lineupIds);

  useEffect(() => {
    setLbLoading(true);
    const unsub = subscribeLeaderboard((entries) => {
      setLeaderboard(entries);
      setLbLoading(false);
    });
    return () => unsub();
  }, []);

  // Merge live WebSocket players + Firestore online_presence so everyone currently in lobby or playing is visible
  const mergedOnlinePlayers = useMemo(() => {
    const map = new Map<
      string,
      OnlinePlayerBadge & { viaWs: boolean; viaCloud: boolean }
    >();

    for (const cp of cloudPresencePlayers) {
      map.set(cp.uid, {
        playerId: cp.uid,
        username: cp.username,
        squadOvr: cp.squadOvr,
        elo: cp.elo,
        kickerId: cp.kickerId as OnlinePlayerBadge['kickerId'],
        gkId: cp.gkId as OnlinePlayerBadge['gkId'],
        activity: cp.activity,
        modeLabel: cp.modeLabel,
        waitingRoomCode: cp.roomCode,
        viaWs: false,
        viaCloud: true,
      });
    }

    for (const wp of presence.playersPreview) {
      const prev = map.get(wp.playerId);
      map.set(wp.playerId, {
        ...prev,
        ...wp,
        viaWs: true,
        viaCloud: Boolean(prev?.viaCloud),
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.playerId === currentPlayerId) return -1;
      if (b.playerId === currentPlayerId) return 1;
      if (a.viaWs !== b.viaWs) return a.viaWs ? -1 : 1;
      return b.elo - a.elo;
    });
  }, [cloudPresencePlayers, presence.playersPreview, currentPlayerId]);

  const otherOnlineCount = Math.max(
    presence.onlineCount,
    mergedOnlinePlayers.length,
  );
  const openRooms = presence.openRooms ?? [];

  const handleCopyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleSendChallenge = (targetPlayerId: string) => {
    onChallengePlayer(targetPlayerId);
    setChallengedIds((prev) => ({ ...prev, [targetPlayerId]: true }));
    window.setTimeout(() => {
      setChallengedIds((prev) => ({ ...prev, [targetPlayerId]: false }));
    }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a14]/86 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0B1320] border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Globe size={14} />
              <span>
                {isVi
                  ? 'Đấu Trường Trực Tuyến · Thời Gian Thực'
                  : 'Real-Time Online Arena'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 font-mono-tabular">
                <Wifi size={11} />
                {wsConnected
                  ? `${otherOnlineCount} Online`
                  : isVi
                  ? 'Đang kết nối...'
                  : 'Connecting...'}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {isVi ? 'SẢNH GAME ONLINE 1v1' : 'ONLINE 1v1 ARENA'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-slate-200">
              @{displayUsername} ·{' '}
              <span className="text-emerald-300 font-mono-tabular">
                OVR {squadOvr}
              </span>
            </div>
            <button
              type="button"
              onClick={onRefreshPresence}
              title={isVi ? 'Làm mới danh sách Online' : 'Refresh Online List'}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-white/10 text-emerald-300 hover:text-white cursor-pointer"
            >
              <RefreshCw size={15} />
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

        {/* Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('duel')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              tab === 'duel'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Swords size={15} />
            <span>{isVi ? 'Đấu Online 1v1' : 'Online 1v1 Duel'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              tab === 'leaderboard'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={15} />
            <span>{isVi ? 'Bảng Xếp Hạng Online' : 'Global Leaderboard'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!account ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/40">
              <div className="text-xs text-amber-100">
                <strong className="text-amber-300">
                  {isVi
                    ? 'Bạn đang chơi bằng nick Khách!'
                    : 'Playing as Guest!'}
                </strong>{' '}
                {isVi
                  ? 'Tạo tài khoản với nick này để lưu ELO, Xu & lên Bảng Xếp Hạng toàn cầu.'
                  : 'Create an account with this profile to save ELO, Coins & climb the Leaderboard.'}
              </div>
              <button
                type="button"
                onClick={onOpenAuthUpgrade}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
              >
                {isVi
                  ? 'Tạo tài khoản với nick này'
                  : 'Create account with this profile'}
              </button>
            </div>
          ) : null}

          {tab === 'duel' ? (
            <>
              {/* Waiting in Queue or Waiting Room */}
              {inQueue || waitingRoom ? (
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-400/40 text-center space-y-4">
                  <Loader2
                    size={34}
                    className="mx-auto text-emerald-400 animate-spin"
                  />
                  {waitingRoom ? (
                    <>
                      <div>
                        <div className="text-xs font-bold text-emerald-300">
                          {isVi
                            ? 'PHÒNG ĐẤU ONLINE ĐÃ SẴN SÀNG'
                            : 'ONLINE ROOM CREATED'}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-slate-950 border border-white/15">
                          <span className="font-mono-tabular text-3xl font-extrabold tracking-widest text-amber-300">
                            {waitingRoom.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(waitingRoom.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                          >
                            {copiedCode ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                            <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        {isVi
                          ? 'Phòng của bạn đã hiện công khai trong danh sách "Phòng Đang Mở" cho mọi người chơi khác bấm vào đấu ngay!'
                          : 'Your room is now visible in Open Rooms so other players can join in 1 click!'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-extrabold text-white">
                        {isVi
                          ? 'Đang tìm đối thủ online...'
                          : 'Searching for online opponent...'}
                      </div>
                      <p className="text-xs text-slate-300">
                        {isVi
                          ? `Hiện có ${otherOnlineCount} người chơi online · ${presence.inQueueCount} người đang tìm trận.`
                          : `${otherOnlineCount} players online · ${presence.inQueueCount} in queue.`}
                      </p>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={onCancelWait}
                    className="px-5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/45 text-xs font-bold text-rose-200 cursor-pointer"
                  >
                    {isVi ? 'Hủy Chờ Trận' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Quick Match */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-slate-900 border border-emerald-400/45 flex flex-col justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                        <Search size={12} />
                        <span>{isVi ? 'GHÉP TRẬN TỰ ĐỘNG' : 'AUTO MATCHMAKING'}</span>
                      </div>
                      <h3 className="font-display text-2xl font-extrabold text-white mt-2">
                        {isVi ? 'Ghép Trận Nhanh 1v1' : 'Quick Match 1v1'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isVi
                          ? 'Đấu luân phiên 3 lượt sút phạt & Penalty trực tiếp với người chơi khác: bạn sút & trực tiếp làm thủ môn bắt cú sút của đối thủ!'
                          : 'Take 3 alternating Free Kick & Penalty turns against a live opponent: shoot & dive as Goalkeeper in real time!'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!wsConnected}
                      onClick={onQuickMatch}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isVi ? 'Tìm Đối Thủ Ngay' : 'Find Opponent Now'}
                    </button>
                  </div>

                  {/* Create or Join Friend Room */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/15 flex flex-col justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-300 text-[11px] font-bold">
                        <Users size={12} />
                        <span>{isVi ? 'ĐẤU VỚI BẠN BÈ' : 'PRIVATE FRIEND ROOM'}</span>
                      </div>
                      <h3 className="font-display text-2xl font-extrabold text-white mt-2">
                        {isVi ? 'Tạo / Vào Phòng Mã' : 'Create / Join Room'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">
                        {isVi
                          ? 'Tạo phòng đấu hoặc nhập mã 4 ký tự từ bạn bè.'
                          : 'Create a room or enter a friend’s 4-letter code.'}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        disabled={!wsConnected}
                        onClick={onCreateRoom}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <PlusCircle size={15} />
                        <span>{isVi ? 'Tạo Phòng Mới (Lấy Mã)' : 'Create Room'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) =>
                            setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                          }
                          placeholder={isVi ? 'Nhập mã (VD: FC7K)' : 'Room code'}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono-tabular font-bold uppercase text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          disabled={!wsConnected || joinCode.trim().length < 3}
                          onClick={() => onJoinRoom(joinCode)}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isVi ? 'Vào Phòng' : 'Join'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {roomError ? (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/45 text-xs font-semibold text-rose-200">
                  {roomError}
                </div>
              ) : null}

              {/* Open Public Rooms */}
              {openRooms.length > 0 ? (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-400/40 space-y-2.5">
                  <div className="text-xs font-extrabold text-sky-300">
                    {isVi
                      ? `Phòng Đấu Đang Mở Chờ Đối Thủ (${openRooms.length})`
                      : `Open Rooms Waiting for Opponent (${openRooms.length})`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {openRooms.map((r) => {
                      const isMyRoom = r.hostPlayerId === currentPlayerId;
                      return (
                        <div
                          key={r.roomId}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-white/15"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              @{r.hostUsername}{' '}
                              <span className="font-mono-tabular text-amber-300">
                                [{r.code}]
                              </span>
                            </div>
                            <div className="text-[11px] font-mono-tabular text-slate-400">
                              OVR {r.hostOvr} · {r.hostElo} ELO
                            </div>
                          </div>
                          {!isMyRoom ? (
                            <button
                              type="button"
                              disabled={!wsConnected}
                              onClick={() => onJoinRoom(r.code)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              {isVi ? 'Vào Đấu' : 'Join'}
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-sky-300 shrink-0">
                              {isVi ? 'Phòng của bạn' : 'Your Room'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Live Online Players List with Direct Challenge */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/12 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-emerald-300">
                      {isVi
                        ? `Tất Cả Người Chơi Đang Online (${mergedOnlinePlayers.length})`
                        : `All Players Currently Online (${mergedOnlinePlayers.length})`}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isVi
                        ? 'Hiển thị cả người chơi đang đá ở các chế độ khác hoặc ở Sảnh Chính — bấm "Thách Đấu" để mời đấu 1v1 ngay!'
                        : 'Shows everyone playing or in the lobby — click Challenge to send a live 1v1 invite!'}
                    </p>
                  </div>
                </div>

                {mergedOnlinePlayers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    {isVi
                      ? 'Đang quét người chơi đang trực tuyến...'
                      : 'Scanning live online players...'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {mergedOnlinePlayers.map((p) => {
                      const isMe = p.playerId === currentPlayerId;
                      const badge = activityBadge(
                        p.activity,
                        p.modeLabel,
                        p.waitingRoomCode,
                        isVi,
                      );
                      const wasSent = Boolean(challengedIds[p.playerId]);

                      return (
                        <div
                          key={p.playerId}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                            isMe
                              ? 'bg-emerald-500/12 border-emerald-400/45'
                              : 'bg-slate-950/90 border-white/10'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-xs font-extrabold text-white truncate">
                                @{p.username}
                                {isMe ? (isVi ? ' (Bạn)' : ' (You)') : ''}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                              OVR <span className="text-emerald-300">{p.squadOvr}</span> ·{' '}
                              {p.elo} ELO
                            </div>
                          </div>

                          {!isMe ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onOpenInboxDm(p.playerId, p.username)}
                                title={isVi ? 'Nhắn tin riêng' : 'Direct message'}
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-sky-300 cursor-pointer"
                              >
                                <MessageSquare size={13} />
                              </button>
                              {p.waitingRoomCode ? (
                                <button
                                  type="button"
                                  disabled={!wsConnected}
                                  onClick={() => onJoinRoom(p.waitingRoomCode!)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] cursor-pointer disabled:opacity-50"
                                >
                                  {isVi ? 'Vào Phòng' : 'Join Room'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!wsConnected || !p.viaWs || wasSent}
                                  onClick={() => handleSendChallenge(p.playerId)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] cursor-pointer disabled:opacity-50 ${
                                    wasSent
                                      ? 'bg-emerald-500/25 border border-emerald-400/45 text-emerald-200'
                                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                  }`}
                                >
                                  <Swords size={12} />
                                  <span>
                                    {wasSent
                                      ? isVi
                                        ? 'Đã Mời'
                                        : 'Invited'
                                      : isVi
                                      ? 'Thách Đấu'
                                      : 'Challenge'}
                                  </span>
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Match Rewards */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/10 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
                <div className="font-bold text-amber-300">
                  {isVi ? 'Thưởng Đấu Online 1v1:' : 'Online 1v1 Rewards:'}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    {isVi ? 'Thắng:' : 'Win:'}{' '}
                    <strong className="text-emerald-300">+500 Xu · +28 ELO</strong>
                  </span>
                  <span>
                    {isVi ? 'Mỗi bàn:' : 'Per goal:'}{' '}
                    <strong className="text-amber-300">+100 Xu</strong>
                  </span>
                  <span>
                    {isVi ? 'Thua:' : 'Defeat:'}{' '}
                    <strong className="text-rose-300">-200 Xu · -16 ELO</strong>
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Global Online Leaderboard */
            <div className="space-y-2">
              {lbLoading ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  {isVi
                    ? 'Đang tải Bảng Xếp Hạng Online...'
                    : 'Loading Global Leaderboard...'}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  {isVi
                    ? 'Chưa có người chơi trên bảng xếp hạng. Hãy tạo tài khoản để lên top #1!'
                    : 'No ranked players yet. Create an account to claim #1!'}
                </div>
              ) : (
                leaderboard.map((entry, idx) => {
                  const isMe = account?.uid === entry.uid;
                  return (
                    <div
                      key={entry.uid}
                      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
                        isMe
                          ? 'bg-emerald-500/15 border-emerald-400/50'
                          : 'bg-slate-900/80 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-tabular font-extrabold text-xs shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-orange-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {idx === 0 ? <Crown size={14} /> : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            @{entry.username}{' '}
                            {isMe ? (
                              <span className="text-[10px] text-emerald-300 font-extrabold">
                                ({isVi ? 'Bạn' : 'You'})
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {isVi ? 'Thẻ mạnh nhất:' : 'Top Card:'}{' '}
                            <span className="text-amber-300 font-semibold">
                              {entry.topCardName} ({entry.topCardOvr})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-5 font-mono-tabular text-xs shrink-0">
                        <div className="text-right">
                          <div className="text-emerald-300 font-extrabold">
                            OVR {entry.squadOvr}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {entry.onlineWins}W · {entry.onlineGoals}G
                          </div>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 text-amber-300 font-extrabold">
                          {entry.elo} ELO
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
