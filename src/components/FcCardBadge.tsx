import { FcPlayerCard, Language } from '../game/fcData';

interface FcCardBadgeProps {
  card: FcPlayerCard;
  lang: Language;
  selected?: boolean;
  equippedLabel?: string | null;
  onClick?: () => void;
  compact?: boolean;
}

const RARITY_STYLES: Record<
  FcPlayerCard['rarity'],
  { bg: string; border: string; ovrText: string; badge: string; badgeClass?: string }
> = {
  supreme: {
    bg: 'bg-gradient-to-br from-[#7f1d1d] via-[#451a03] to-[#090d16]',
    border: 'border-rose-400',
    ovrText: 'text-amber-300',
    badge: 'TỐI THƯỢNG 200',
    badgeClass:
      'bg-gradient-to-r from-amber-300 to-rose-400 text-slate-950 border-amber-100',
  },
  divine: {
    bg: 'bg-gradient-to-br from-[#4a044e] via-[#1e1b4b] to-[#090d16]',
    border: 'border-fuchsia-400',
    ovrText: 'text-fuchsia-200',
    badge: 'CHÍ TÔN 150',
    badgeClass: 'bg-fuchsia-400 text-slate-950 border-fuchsia-200',
  },
  immortal: {
    bg: 'bg-gradient-to-br from-[#450a0a] via-[#1c1917] to-[#090d16]',
    border: 'border-orange-400',
    ovrText: 'text-orange-200',
    badge: 'BẤT TỬ',
    badgeClass: 'bg-orange-400 text-slate-950 border-orange-200',
  },
  goat: {
    bg: 'bg-gradient-to-br from-[#422006] via-[#1c1024] to-[#090d16]',
    border: 'border-amber-400',
    ovrText: 'text-amber-300',
    badge: 'G.O.A.T',
    badgeClass: 'bg-amber-400 text-slate-950 border-amber-200',
  },
  utoty: {
    bg: 'bg-gradient-to-br from-[#172554] via-[#0c4a6e] to-[#090f1e]',
    border: 'border-sky-400',
    ovrText: 'text-sky-200',
    badge: 'UTOTY',
    badgeClass: 'bg-sky-400 text-slate-950 border-sky-200',
  },
  prime_icon: {
    bg: 'bg-gradient-to-br from-[#4c0519] via-[#271024] to-[#0f172a]',
    border: 'border-rose-400',
    ovrText: 'text-rose-200',
    badge: 'PRIME ICON',
    badgeClass: 'bg-rose-400 text-slate-950 border-rose-200',
  },
  tots: {
    bg: 'bg-gradient-to-br from-[#042f2e] via-[#0f2942] to-[#091220]',
    border: 'border-teal-400',
    ovrText: 'text-teal-300',
    badge: 'TOTS',
    badgeClass: 'bg-teal-400 text-slate-950 border-teal-200',
  },
  icon: {
    bg: 'bg-gradient-to-br from-[#2a2315] via-[#1c1a24] to-[#0f172a]',
    border: 'border-amber-300/80',
    ovrText: 'text-amber-300',
    badge: 'ICON',
  },
  toty: {
    bg: 'bg-gradient-to-br from-[#0f2557] via-[#132f6b] to-[#091533]',
    border: 'border-sky-300/85',
    ovrText: 'text-amber-300',
    badge: 'TOTY',
  },
  gold: {
    bg: 'bg-gradient-to-br from-[#45340a] via-[#2b2209] to-[#131722]',
    border: 'border-amber-400/65',
    ovrText: 'text-amber-300',
    badge: 'GOLD',
  },
  silver: {
    bg: 'bg-gradient-to-br from-[#28313e] via-[#1b232e] to-[#0f172a]',
    border: 'border-slate-300/50',
    ovrText: 'text-slate-100',
    badge: 'SILVER',
  },
};

export function FcCardBadge({
  card,
  lang,
  selected = false,
  equippedLabel,
  onClick,
  compact = false,
}: FcCardBadgeProps) {
  const style = RARITY_STYLES[card.rarity];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative rounded-xl border-2 text-left transition-all ${style.bg} ${
        selected
          ? 'border-emerald-400 ring-2 ring-emerald-400/40'
          : style.border
      } ${onClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'} ${
        compact ? 'p-2.5' : 'p-3'
      } w-full`}
    >
      {/* Top OVR + Position + Jersey */}
      <div className="flex items-start justify-between gap-2">
        <div className="leading-none">
          <div
            className={`font-display font-extrabold ${
              compact ? 'text-2xl' : 'text-3xl'
            } ${style.ovrText}`}
          >
            {card.ovr}
          </div>
          <div className="text-[11px] font-bold text-slate-200 mt-0.5">
            {card.position}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {card.nation} · {card.club}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold tracking-wider ${
              style.badgeClass ?? 'bg-black/45 border-white/15 text-amber-200'
            }`}
          >
            {style.badge}
          </span>
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md font-display font-extrabold text-sm border border-white/25"
            style={{
              backgroundColor: card.jerseyColor,
              color: card.jerseyColor === '#f1f5f9' ? '#0f172a' : '#ffffff',
            }}
          >
            {card.numberStr}
          </span>
        </div>
      </div>

      {/* Player Name */}
      <div className="mt-2 pt-1.5 border-t border-white/15">
        <div className="font-display text-sm sm:text-base font-extrabold text-white truncate">
          {card.name}
        </div>
        {equippedLabel ? (
          <div className="text-[10px] font-bold text-emerald-300 mt-0.5">
            {equippedLabel}
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 mt-0.5">
            {lang === 'vi'
              ? card.foot === 'left'
                ? 'Chân thuận: Trái'
                : 'Chân thuận: Phải'
              : card.foot === 'left'
              ? 'Left Foot'
              : 'Right Foot'}
          </div>
        )}
      </div>

      {/* 6 FC Face Stats */}
      <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-0.5 font-mono-tabular text-[10px] text-slate-200">
        <div className="flex justify-between">
          <span className="text-slate-400">PAC</span>
          <strong>{card.stats.pac}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">SHO</span>
          <strong>{card.stats.sho}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">PAS</span>
          <strong>{card.stats.pas}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">DRI</span>
          <strong>{card.stats.dri}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">DEF</span>
          <strong>{card.stats.def}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">PHY</span>
          <strong>{card.stats.phy}</strong>
        </div>
      </div>
    </button>
  );
}
