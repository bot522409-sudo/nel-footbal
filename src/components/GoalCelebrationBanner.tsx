import { Flame, Sparkles, Trophy } from 'lucide-react';
import { Language } from '../game/fcData';

export interface GoalCelebrationEvent {
  id: number;
  title: string;
  subtitle: string;
  isSuper: boolean;
  speedKmh?: number;
  coinsBonus: number;
}

interface GoalCelebrationBannerProps {
  event: GoalCelebrationEvent | null;
  lang: Language;
}

export function GoalCelebrationBanner({
  event,
  lang,
}: GoalCelebrationBannerProps) {
  if (!event) return null;

  return (
    <div
      key={event.id}
      className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-start pt-16 sm:pt-20 overflow-hidden"
    >
      {/* Brief stadium edge glow flash (compositor opacity only) */}
      <div
        className={`animate-goal-flash fixed inset-0 ${
          event.isSuper
            ? 'bg-gradient-to-b from-amber-400/40 via-transparent to-emerald-400/20'
            : 'bg-gradient-to-b from-emerald-400/35 via-transparent to-transparent'
        }`}
      />

      {/* Broadcast Goal Ribbon */}
      <div
        className={`animate-goal-banner relative max-w-[92vw] px-7 py-3.5 rounded-2xl border shadow-2xl text-center ${
          event.isSuper
            ? 'bg-[#09121f]/95 border-amber-400/80 shadow-amber-500/25'
            : 'bg-[#09121f]/95 border-emerald-400/75 shadow-emerald-500/20'
        }`}
      >
        <div
          className={`flex items-center justify-center gap-2 text-xs font-extrabold tracking-widest uppercase ${
            event.isSuper ? 'text-amber-300' : 'text-emerald-300'
          }`}
        >
          {event.isSuper ? <Flame size={15} /> : <Trophy size={15} />}
          <span>
            {event.isSuper
              ? lang === 'vi'
                ? 'SIÊU PHẨM ĐẲNG CẤP'
                : 'WORLD-CLASS SCREAMER'
              : lang === 'vi'
              ? 'BÀN THẮNG ĐẸP MẮT'
              : 'GOAL SCORED'}
          </span>
          {event.isSuper ? <Sparkles size={15} /> : null}
        </div>

        <h2
          className={`font-display text-4xl sm:text-5xl font-extrabold tracking-wider leading-none mt-1 ${
            event.isSuper ? 'text-amber-400' : 'text-emerald-400'
          }`}
        >
          {event.title}
        </h2>

        <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1.5">
          {event.subtitle}
        </p>

        <div className="mt-2 flex items-center justify-center gap-3 text-xs font-mono-tabular font-bold">
          {event.speedKmh ? (
            <span className="text-sky-300">{event.speedKmh} km/h</span>
          ) : null}
          {event.speedKmh && event.coinsBonus > 0 ? (
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
          ) : null}
          {event.coinsBonus > 0 ? (
            <span className="text-amber-300">+{event.coinsBonus} Xu</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
