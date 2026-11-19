import {
  Coins,
  LogOut,
  RotateCcw,
  Shield,
  Smile,
  Swords,
  Timer,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Language } from '../game/fcData';
import { GameSnapshot } from '../game/types';
import { OnlineRoomState } from '../services/onlineMatchClient';

interface OnlineDuelOverlayProps {
  lang: Language;
  room: OnlineRoomState;
  yourSlot: 'p1' | 'p2';
  snapshot: GameSnapshot;
  shotAlertDeadlineMs: number | null;
  waitingShotSync: boolean;
  lastTurnMessage: string | null;
  lastEmote: { from: string; emote: string } | null;
  matchCoinsEarned: number;
  matchReason: 'normal' | 'forfeit' | null;
  onSendEmote: (emote: string) => void;
  onRematch: () => void;
  onExitDuel: () => void;
}

const EMOTES = ['⚽ Siêu phẩm!', '🧤 Quá đỉnh!', '🔥 Căng quá!', '👏 Hay lắm!'];

export function OnlineDuelOverlay({
  lang,
  room,
  yourSlot,
  snapshot,
  shotAlertDeadlineMs,
  waitingShotSync,
  lastTurnMessage,
  lastEmote,
  matchCoinsEarned,
  matchReason,
  onSendEmote,
  onRematch,
  onExitDuel,
}: OnlineDuelOverlayProps) {
  const [nowMs, setNowMs] = useState(Date.now());
  const isVi = lang === 'vi';

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  const me = room.players.find((p) => p.slot === yourSlot) ?? room.players[0];
  const opp = room.players.find((p) => p.slot !== yourSlot);
  const myTurnToKick = room.shooterSlot === yourSlot;

  const deadline = shotAlertDeadlineMs ?? room.turnDeadlineMs;
  const secsLeft = Math.max(0, Math.ceil((deadline - nowMs) / 1000));

  if (room.status === 'finished') {
    const iWon = room.winnerSlot === yourSlot;
    const isDraw = room.winnerSlot === 'draw';

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-4">
        <div className="w-full max-w-md bg-[#0B1320] border border-white/15 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div
                className={`text-xs font-bold ${
                  iWon
                    ? 'text-emerald-400'
                    : isDraw
                    ? 'text-amber-300'
                    : 'text-rose-400'
                }`}
              >
                {matchReason === 'forfeit'
                  ? isVi
                    ? 'Đối thủ đã rời phòng · Thắng xử thắng'
                    : 'Opponent disconnected · Forfeit Win'
                  : isVi
                  ? `Kết quả Đấu Online 1v1 · Phòng ${room.code}`
                  : `Online 1v1 Result · Room ${room.code}`}
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white mt-0.5">
                {iWon
                  ? isVi
                    ? 'BẠN ĐÃ CHIẾN THẮNG!'
                    : 'VICTORY!'
                  : isDraw
                  ? isVi
                    ? 'HÒA KỊCH TÍNH!'
                    : 'DRAW!'
                  : isVi
                  ? 'ĐỐI THỦ CHIẾN THẮNG!'
                  : 'DEFEAT!'}
              </h2>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                iWon
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-sky-500/20 text-sky-300'
              }`}
            >
              {iWon ? <Trophy size={24} /> : <Swords size={24} />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 py-5 border-b border-white/10 text-center items-center">
            <div>
              <div className="text-xs font-bold text-emerald-300 truncate">
                @{me?.username || 'Bạn'}
              </div>
              <div className="text-[10px] text-slate-400">
                OVR {me?.squadOvr ?? 79}
              </div>
              <div className="font-mono-tabular text-3xl font-extrabold text-emerald-400 mt-1">
                {me?.score ?? 0}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-400">VS</div>
            <div>
              <div className="text-xs font-bold text-rose-300 truncate">
                @{opp?.username || 'Đối thủ'}
              </div>
              <div className="text-[10px] text-slate-400">
                OVR {opp?.squadOvr ?? 79}
              </div>
              <div className="font-mono-tabular text-3xl font-extrabold text-rose-400 mt-1">
                {opp?.score ?? 0}
              </div>
            </div>
          </div>

          <div
            className={`mt-4 flex items-center justify-between px-4 py-3 rounded-xl border ${
              matchCoinsEarned >= 0
                ? 'bg-amber-400/15 border-amber-400/45 text-amber-300'
                : 'bg-rose-500/15 border-rose-400/45 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <Coins size={16} />
              <span>
                {matchCoinsEarned >= 0
                  ? isVi
                    ? 'Tiền Thưởng Online'
                    : 'Online Reward'
                  : isVi
                  ? 'Phạt Thua Trận'
                  : 'Defeat Penalty'}
              </span>
            </div>
            <span className="font-mono-tabular text-base font-extrabold">
              {matchCoinsEarned >= 0
                ? `+${matchCoinsEarned.toLocaleString()} Xu`
                : `${matchCoinsEarned.toLocaleString()} Xu`}
            </span>
          </div>

          <div className="pt-5 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onExitDuel}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
            >
              <LogOut size={15} />
              <span>{isVi ? 'Về Sảnh Chính' : 'Main Menu'}</span>
            </button>
            <button
              type="button"
              onClick={onRematch}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-extrabold text-slate-950 cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>{isVi ? 'Tìm Trận Mới' : 'Find New Match'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Live Scoreboard Banner at Top Center */}
      <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-20 w-[min(560px,94vw)]">
        <div className="pointer-events-auto bg-[#0B1320]/94 border border-emerald-400/40 rounded-xl px-4 py-2.5 shadow-2xl">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-tabular font-bold">
                #{room.code}
              </span>
              <span className="font-bold text-white truncate">
                @{me?.username} ({me?.score ?? 0})
              </span>
              <span className="text-slate-400">-</span>
              <span className="font-bold text-rose-300 truncate">
                ({opp?.score ?? 0}) @{opp?.username || '...'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
              <span className="text-slate-300 font-bold">
                {isVi ? 'Lượt' : 'Turn'} {room.turn}/{room.maxTurns}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-extrabold">
                <Timer size={12} />
                {secsLeft}s
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="font-bold">
              {snapshot.phase === 'result' && lastTurnMessage ? (
                <span className="text-amber-300">{lastTurnMessage}</span>
              ) : room.turnPhase === 'gk_react' && !myTurnToKick ? (
                <span className="text-rose-300 animate-pulse">
                  {isVi
                    ? 'ĐỐI THỦ VỪA SÚT! Bấm nút Đổ Người Trái / Giữa / Phải NGAY!'
                    : 'OPPONENT SHOT! DIVE LEFT / CENTER / RIGHT NOW!'}
                </span>
              ) : myTurnToKick ? (
                waitingShotSync ? (
                  <span className="text-sky-300">
                    {isVi
                      ? 'Đã sút! Đang chờ đối thủ đổ người bắt bóng...'
                      : 'Shot locked! Waiting for opponent GK dive...'}
                  </span>
                ) : (
                  <span className="text-emerald-300">
                    {isVi
                      ? 'Lượt BẠN SÚT — Ngắm góc, chỉnh xoáy và bấm SÚT BÓNG!'
                      : 'YOUR KICK — Aim, curve & shoot!'}
                  </span>
                )
              ) : (
                <span className="text-amber-300">
                  {isVi
                    ? 'Lượt BẠN LÀM GK — Chọn sẵn hướng đổ người hoặc chờ đối thủ sút!'
                    : 'YOU ARE GK — Pick dive direction or wait for the shot!'}
                </span>
              )}
            </div>

            {/* Quick Emotes */}
            <div className="flex items-center gap-1">
              <Smile size={12} className="text-slate-400 mr-0.5" />
              {EMOTES.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => onSendEmote(em)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] text-slate-200 cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        {lastEmote ? (
          <div className="mt-2 mx-auto w-fit px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xl flex items-center gap-1.5">
            <Shield size={13} />
            <span>
              @{lastEmote.from}: {lastEmote.emote}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
