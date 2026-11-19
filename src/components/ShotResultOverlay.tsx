import {
  ArrowRight,
  Coins,
  LogOut,
  PackageOpen,
  Play,
  RotateCcw,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { Language } from '../game/fcData';
import {
  computeImpossibleEntryFee,
  GameSnapshot,
  IMPOSSIBLE_REWARD_COINS,
  ShotOutcomeType,
  TEAM_PROFILES,
} from '../game/types';

interface ShotResultOverlayProps {
  snapshot: GameSnapshot;
  lang: Language;
  lastCoinsEarned: number;
  isAdmin?: boolean;
  clubCoins?: number;
  onOpenPacks: () => void;
  onNextTurn: () => void;
  onTakeCornerKick?: (side: 'left' | 'right') => void;
  onReplay: () => void;
  onRestartMatch: () => void;
  onExit: () => void;
}

function outcomeLabel(type: ShotOutcomeType, isGkTurn: boolean): string {
  if (isGkTurn) {
    switch (type) {
      case 'saved':
        return 'Cản Phá';
      case 'goal':
      case 'goal_top_corner':
        return 'Thủng Lưới';
      case 'wall_blocked':
        return 'Hàng Rào';
      case 'woodwork':
        return 'Khung Gỗ';
      case 'missed':
        return 'Bot Hỏng';
    }
  }
  switch (type) {
    case 'goal_top_corner':
      return 'Góc Chết';
    case 'goal':
      return 'Vào';
    case 'saved':
      return 'Bị Bắt';
    case 'woodwork':
      return 'Khung Gỗ';
    case 'wall_blocked':
      return 'Hàng Rào';
    case 'missed':
      return 'Ra Ngoài';
  }
}

export function ShotResultOverlay({
  snapshot,
  lang,
  lastCoinsEarned,
  isAdmin = false,
  clubCoins = 0,
  onOpenPacks,
  onNextTurn,
  onTakeCornerKick,
  onReplay,
  onRestartMatch,
  onExit,
}: ShotResultOverlayProps) {
  if (snapshot.mode === 'online_duel') {
    return null;
  }

  if (snapshot.mode === 'match') {
    const homeTeam = TEAM_PROFILES[snapshot.homeTeamId];
    const awayTeam = TEAM_PROFILES[snapshot.awayTeamId];

    if (snapshot.phase === 'match_over') {
      const homeWon = snapshot.playerGoals > snapshot.botGoals;
      const isDraw = snapshot.playerGoals === snapshot.botGoals;

      return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg bg-[#0B1320] border border-white/15 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <p
                  className={`text-xs font-semibold ${
                    homeWon
                      ? 'text-emerald-400'
                      : isDraw
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {lang === 'vi'
                    ? `Kết thúc 90 phút thi đấu · Trận Đấu 3D (${snapshot.matchFormat === '11v11' ? '11v11' : '5v5'})`
                    : `Full Time 90:00 · 3D Match (${snapshot.matchFormat === '11v11' ? '11v11' : '5v5'})`}
                </p>
                <h2 className="font-display text-3xl font-extrabold text-white tracking-wide mt-0.5">
                  {homeWon
                    ? `${homeTeam.name.toUpperCase()} ${lang === 'vi' ? 'CHIẾN THẮNG!' : 'WINS!'}`
                    : isDraw
                    ? lang === 'vi'
                      ? 'TRẬN ĐẤU HÒA KỊCH TÍNH!'
                      : 'DRAMATIC DRAW!'
                    : `${awayTeam.name.toUpperCase()} ${lang === 'vi' ? 'GIÀNH CHIẾN THẮNG!' : 'WINS!'}`}
                </h2>
              </div>
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                  homeWon
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-violet-500/15 text-violet-400'
                }`}
              >
                <Users size={24} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-5 border-b border-white/10 text-center items-center">
              <div>
                <div className="text-xs font-semibold text-emerald-300">
                  {homeTeam.name}
                </div>
                <div className="font-mono-tabular text-3xl font-extrabold text-emerald-400 mt-1">
                  {snapshot.playerGoals}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">
                  {lang === 'vi' ? "Tỉ Số 90'" : "Score 90'"}
                </div>
                <div className="font-mono-tabular text-sm font-bold text-slate-300 mt-1">
                  {lang === 'vi' ? 'Sút' : 'Shots'}: {snapshot.matchShotsHome} -{' '}
                  {snapshot.matchShotsAway}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-rose-300">
                  {awayTeam.name}
                </div>
                <div className="font-mono-tabular text-3xl font-extrabold text-rose-400 mt-1">
                  {snapshot.botGoals}
                </div>
              </div>
            </div>

            {lastCoinsEarned !== 0 ? (
              <div
                className={`mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                  lastCoinsEarned > 0
                    ? 'bg-amber-400/15 border-amber-400/45'
                    : 'bg-rose-500/15 border-rose-400/50'
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-bold text-sm ${
                    lastCoinsEarned > 0 ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  <Coins size={18} />
                  <span>
                    {lastCoinsEarned > 0
                      ? lang === 'vi'
                        ? 'Tiền Thưởng Trận Đấu'
                        : 'Match Coin Reward'
                      : lang === 'vi'
                      ? 'Phạt Thua Trận'
                      : 'Match Loss Penalty'}
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-lg font-extrabold ${
                    lastCoinsEarned > 0 ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {lastCoinsEarned > 0
                    ? `+${lastCoinsEarned.toLocaleString()} Xu`
                    : `${lastCoinsEarned.toLocaleString()} Xu`}
                </span>
              </div>
            ) : null}

            <div className="pt-5 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={onExit}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut size={16} />
                <span>{lang === 'vi' ? 'Thoát' : 'Exit'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenPacks}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <PackageOpen size={16} />
                <span>{lang === 'vi' ? 'Mua Pack' : 'Buy Packs'}</span>
              </button>

              <button
                type="button"
                onClick={onRestartMatch}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw size={16} />
                <span>{lang === 'vi' ? 'Đá Lại' : 'Rematch'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (snapshot.matchEventText) {
      const isGoalBanner = snapshot.phase === 'match_goal';
      if (isGoalBanner && snapshot.matchEventText.includes('+100 XU')) {
        return null;
      }
      return (
        <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20">
          <div
            className={`px-5 py-2.5 rounded-xl border shadow-2xl font-display tracking-wide text-center ${
              isGoalBanner
                ? 'bg-[#0B1320]/95 border-rose-400/60 text-rose-300 text-2xl font-extrabold'
                : 'bg-[#0B1320]/90 border-white/15 text-white text-sm font-bold'
            }`}
          >
            {snapshot.matchEventText}
          </div>
        </div>
      );
    }

    return null;
  }

  if (snapshot.phase === 'replay') {
    return (
      <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-[#0B1320]/90 border border-amber-400/40 rounded-lg px-4 py-2 text-xs font-semibold text-amber-300 tracking-wide">
          PHÁT LẠI SLOW-MOTION (0.38x)
        </div>
      </div>
    );
  }

  if (snapshot.phase === 'match_over') {
    const isVsBot = snapshot.mode === 'vs_bot';
    const isPenalty = snapshot.mode === 'penalty';
    const isShootout = isVsBot || isPenalty;
    const playerWon = snapshot.playerGoals > snapshot.botGoals;
    const isDraw = snapshot.playerGoals === snapshot.botGoals;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="w-full max-w-lg bg-[#0B1320] border border-white/15 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <p
                className={`text-xs font-semibold ${
                  isShootout
                    ? playerWon
                      ? 'text-emerald-400'
                      : isDraw
                      ? 'text-amber-400'
                      : 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {isPenalty
                  ? `Kết quả loạt sút luân lưu Penalty 11m (${snapshot.totalRounds} lượt)`
                  : isVsBot
                  ? 'Kết quả thi đấu 5 lượt luân phiên với Bot'
                  : 'Hoàn thành 5 lượt sút phạt'}
              </p>
              <h2 className="font-display text-3xl font-extrabold text-white tracking-wide mt-0.5">
                {isPenalty
                  ? playerWon
                    ? 'CHIẾN THẮNG LOẠT PENALTY!'
                    : 'BOT THẮNG LOẠT PENALTY!'
                  : isVsBot
                  ? playerWon
                    ? 'BẠN ĐÃ CHIẾN THẮNG!'
                    : isDraw
                    ? 'TRẬN ĐẤU HÒA KỊCH TÍNH!'
                    : 'BOT GIÀNH CHIẾN THẮNG!'
                  : 'TỔNG KẾT TRẬN ĐẤU'}
              </h2>
            </div>
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                isShootout
                  ? playerWon
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-sky-500/15 text-sky-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {isShootout ? <Swords size={24} /> : <Trophy size={24} />}
            </div>
          </div>

          {isShootout ? (
            <div className="grid grid-cols-3 gap-4 py-4 border-b border-white/10 text-center">
              <div>
                <div className="text-xs text-slate-400">Tỉ Số Chung Cuộc</div>
                <div className="font-mono-tabular text-2xl font-bold text-white mt-0.5">
                  <span className="text-emerald-400">
                    {snapshot.playerGoals}
                  </span>{' '}
                  -{' '}
                  <span className="text-rose-400">{snapshot.botGoals}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">GK Cứu Thua</div>
                <div className="font-mono-tabular text-2xl font-bold text-amber-400 mt-0.5">
                  {snapshot.gkSaves}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Tổng Điểm</div>
                <div className="font-mono-tabular text-2xl font-bold text-sky-400 mt-0.5">
                  {snapshot.score}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 py-4 border-b border-white/10 text-center">
              <div>
                <div className="text-xs text-slate-400">Tổng Điểm</div>
                <div className="font-mono-tabular text-2xl font-bold text-emerald-400 mt-0.5">
                  {snapshot.score}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Bàn Thắng</div>
                <div className="font-mono-tabular text-2xl font-bold text-white mt-0.5">
                  {snapshot.goalsScored}/{snapshot.totalRounds}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Kỷ Lục</div>
                <div className="font-mono-tabular text-2xl font-bold text-amber-400 mt-0.5">
                  {snapshot.bestScore}
                </div>
              </div>
            </div>
          )}

          <div className="py-4 space-y-2 max-h-56 overflow-y-auto">
            {snapshot.history.map((item, idx) => {
              const isGkTurn = item.role === 'gk';
              const isPositive = isGkTurn
                ? item.outcome !== 'goal' && item.outcome !== 'goal_top_corner'
                : item.outcome === 'goal' || item.outcome === 'goal_top_corner';

              return (
                <div
                  key={`${item.round}-${item.role}-${idx}`}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-900/70 border border-white/5"
                >
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="font-mono-tabular text-slate-400">
                      #{item.round}
                    </span>
                    {isShootout ? (
                      <span
                        className={`text-[11px] font-semibold ${
                          isGkTurn ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {isGkTurn ? 'GK' : 'Sút'}
                      </span>
                    ) : null}
                    <span className="font-medium">
                      {item.scenarioLabel}
                      {item.isHeader ? ' (Đánh đầu)' : ''}
                      {item.isRebound ? ' (Đá bồi)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular text-slate-400">
                      {item.speedKmh} km/h
                    </span>
                    <span
                      className={`font-semibold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {outcomeLabel(item.outcome, isGkTurn)}
                    </span>
                    <span className="font-mono-tabular font-bold text-white w-12 text-right">
                      +{item.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 space-y-3">
            {lastCoinsEarned !== 0 ? (
              <div
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border ${
                  lastCoinsEarned > 0
                    ? 'bg-amber-400/15 border-amber-400/45'
                    : 'bg-rose-500/15 border-rose-400/50'
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-bold text-xs ${
                    lastCoinsEarned > 0 ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  <Coins size={16} />
                  <span>
                    {lastCoinsEarned > 0
                      ? lang === 'vi'
                        ? 'Tiền Thưởng Trận Đấu'
                        : 'Match Reward'
                      : lang === 'vi'
                      ? 'Phạt Thua Trận'
                      : 'Defeat Penalty'}
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-sm font-extrabold ${
                    lastCoinsEarned > 0 ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {lastCoinsEarned > 0
                    ? `+${lastCoinsEarned.toLocaleString()} Xu`
                    : `${lastCoinsEarned.toLocaleString()} Xu`}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={onExit}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut size={16} />
                <span>{lang === 'vi' ? 'Thoát' : 'Exit'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenPacks}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <PackageOpen size={16} />
                <span>{lang === 'vi' ? 'Mua Pack' : 'Buy Packs'}</span>
              </button>

              <button
                type="button"
                onClick={onRestartMatch}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw size={16} />
                <span>
                  {lang === 'vi' ? 'Đá Lại' : 'Play Again'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (snapshot.phase !== 'result' || !snapshot.lastOutcome) return null;

  const out = snapshot.lastOutcome;
  const isGkTurn = snapshot.turnRole === 'gk';
  const isPositive = isGkTurn
    ? out.type !== 'goal' && out.type !== 'goal_top_corner'
    : out.type === 'goal' || out.type === 'goal_top_corner';
  const shotCoins = isPositive
    ? snapshot.mode === 'impossible'
      ? IMPOSSIBLE_REWARD_COINS
      : 100
    : 0;
  const isTopHighlight =
    (!isGkTurn && out.type === 'goal_top_corner') ||
    (isGkTurn && out.type === 'saved');

  const nextImpossibleFee = computeImpossibleEntryFee(clubCoins, isAdmin);

  let nextButtonLabel = 'Sút Quả Mới (Space)';
  if (snapshot.mode === 'impossible') {
    nextButtonLabel = isAdmin
      ? 'Sút Lại (Miễn Phí Admin)'
      : clubCoins >= 10
      ? `Thử Lại (-10% · ${nextImpossibleFee.toLocaleString()} Xu)`
      : 'Không Đủ Xu (< 10 Xu)';
  } else if (snapshot.mode === 'penalty') {
    if (snapshot.vsBotHalf === 'player_kick') {
      nextButtonLabel = 'Đến Lượt Bot Đá 11m (Làm GK)';
    } else if (
      snapshot.round >= snapshot.totalRounds &&
      snapshot.playerGoals === snapshot.botGoals
    ) {
      nextButtonLabel = 'Lượt Sút Quyết Định';
    } else if (snapshot.round >= snapshot.totalRounds) {
      nextButtonLabel = 'Xem Kết Quả Penalty';
    } else {
      nextButtonLabel = `Lượt ${snapshot.round + 1}: Bạn Đá 11m`;
    }
  } else if (snapshot.mode === 'vs_bot') {
    if (snapshot.vsBotHalf === 'player_kick') {
      nextButtonLabel = 'Đến Lượt Bot Sút (Làm GK)';
    } else if (snapshot.round >= snapshot.totalRounds) {
      nextButtonLabel = 'Xem Kết Quả Trận Đấu';
    } else {
      nextButtonLabel = `Lượt ${snapshot.round + 1}: Bạn Sút`;
    }
  } else if (snapshot.mode === 'gk_practice') {
    nextButtonLabel = 'Cú Sút Tiếp Theo (Space)';
  } else if (snapshot.mode === 'challenge') {
    nextButtonLabel =
      snapshot.round >= snapshot.totalRounds
        ? 'Xem Kết Quả'
        : 'Lượt Tiếp Theo (Space)';
  }

  return (
    <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20 w-[min(480px,92vw)]">
      <div
        className={`pointer-events-auto bg-[#0B1320]/94 border rounded-xl px-5 py-4 shadow-2xl ${
          isTopHighlight
            ? 'border-amber-400/60'
            : isPositive
            ? 'border-emerald-400/50'
            : 'border-rose-400/35'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {snapshot.mode === 'impossible' ? (
              <div className="text-[11px] font-mono-tabular font-bold text-amber-300 mb-1">
                Phí mỗi lượt: {isAdmin ? '0 Xu (Admin)' : '10% số Xu'} · Thưởng nếu vô:{' '}
                {IMPOSSIBLE_REWARD_COINS.toLocaleString()} Xu
              </div>
            ) : snapshot.mode === 'vs_bot' || snapshot.mode === 'penalty' ? (
              <div className="text-[11px] font-mono-tabular font-semibold text-sky-300 mb-1">
                {snapshot.mode === 'penalty' ? 'Tỉ số Penalty: ' : 'Tỉ số: '}
                Bạn {snapshot.playerGoals} - {snapshot.botGoals} Bot · Lượt{' '}
                {snapshot.round}/{snapshot.totalRounds}
              </div>
            ) : null}
            <h2
              className={`font-display text-3xl font-extrabold tracking-wide leading-none ${
                isTopHighlight
                  ? 'text-amber-400'
                  : isPositive
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {out.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {out.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {out.points > 0 ? (
              <div className="text-right">
                <div className="text-[11px] text-slate-400">
                  {lang === 'vi' ? 'Điểm' : 'Pts'}
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-emerald-400 leading-none">
                  +{out.points}
                </div>
              </div>
            ) : null}
            {shotCoins > 0 ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-extrabold font-mono-tabular bg-emerald-500/15 border-emerald-400/45 text-emerald-300">
                <Coins size={13} />
                <span>+{shotCoins} Xu</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono-tabular">
            <span>Tốc độ {out.speedKmh} km/h</span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>Độ xoáy {out.spinRpm} rpm</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {out.cornerAwarded && onTakeCornerKick ? (
              <button
                type="button"
                onClick={() => onTakeCornerKick(out.cornerAwarded!)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 rounded-lg text-xs font-extrabold text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>
                  {lang === 'vi' ? 'Đá Phạt Góc Ngay' : 'Take Corner Kick'}
                </span>
                <ArrowRight size={14} />
              </button>
            ) : null}

            {snapshot.hasReplay ? (
              <button
                type="button"
                onClick={onReplay}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-xs font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play size={13} />
                <span>Xem Lại</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onNextTurn}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-xs font-bold text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{nextButtonLabel}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
