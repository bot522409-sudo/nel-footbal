export const PITCH_HALF_W = 42;
export const PITCH_LENGTH = 105;
export const PITCH_HALF_L = 52.5;

export type MatchFormat = '5v5' | '11v11';

export type DribbleSkillType =
  | 'sprint_burst'
  | 'stepover'
  | 'roulette'
  | 'elastico'
  | 'rainbow_flick'
  | 'maradona_spin'
  | 'heel_chop'
  | 'ball_roll_dash';

export type GameMode =
  | 'match'
  | 'challenge'
  | 'impossible'
  | 'vs_bot'
  | 'penalty'
  | 'gk_practice'
  | 'practice'
  | 'online_duel';

export type Difficulty = 'easy' | 'medium' | 'pro' | 'extreme';

export type PracticeFocus = 'freekick' | 'penalty' | 'corner' | 'curve_lab';

export type TeamId =
  | 'real_madrid'
  | 'barcelona'
  | 'man_city'
  | 'liverpool'
  | 'bayern'
  | 'juventus'
  | 'portugal'
  | 'argentina'
  | 'brazil'
  | 'france'
  | 'england'
  | 'vietnam';

export type KickerId =
  | 'ronaldo'
  | 'messi'
  | 'neymar'
  | 'mbappe'
  | 'beckham'
  | 'de_bruyne'
  | 'roberto_carlos'
  | 'ronaldinho'
  | 'haaland'
  | 'vinicius'
  | 'bellingham'
  | 'yamal'
  | 'salah'
  | 'kane'
  | 'son'
  | 'juninho'
  | 'pirlo'
  | 'zidane'
  | 'valverde'
  | 'quang_hai';

export type GoalkeeperId =
  | 'courtois'
  | 'neuer'
  | 'alisson'
  | 'donnarumma'
  | 'martinez'
  | 'casillas'
  | 'buffon'
  | 'yashin'
  | 'oblak'
  | 'ter_stegen'
  | 'cech'
  | 'ederson';

export type TurnRole = 'kick' | 'gk';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm';

export type ShotSkillType =
  | 'normal'
  | 'curler'
  | 'trivela'
  | 'knuckle'
  | 'dip_topspin'
  | 'power_shot'
  | 'bicycle_volley'
  | 'rabona'
  | 'chip_panenka';

export type KitPattern =
  | 'striped'
  | 'royal_sash'
  | 'chevron'
  | 'galaxy'
  | 'flame'
  | 'cyber'
  | 'toty_prism'
  | 'carbon_gold'
  | 'halftone_pro'
  | 'aurora_wave'
  | 'dragon_scale'
  | 'thunder_bolt'
  | 'sakura_gold';

export type HairStyle =
  | 'quiff'
  | 'mohawk'
  | 'afro_braids'
  | 'buzz'
  | 'long_flow';

export type PlayerSkinId =
  | 'default'
  | 'golden_goat'
  | 'dragon_crimson'
  | 'cyber_neon'
  | 'royal_diamond'
  | 'samba_legend'
  | 'shadow_phantom'
  | 'emerald_ace'
  | 'sunfire_phoenix'
  | 'frost_emperor'
  | 'toty_celestial'
  | 'ballon_dor_chrome'
  | 'samurai_eclipse'
  | 'brazil_carnival'
  | 'inferno_beast'
  | 'icon_legacy'
  | 'celestial_aurora'
  | 'golden_dragon_emperor'
  | 'thunder_god'
  | 'sakura_shogun'
  | 'galactic_nebula'
  | 'jade_immortal'
  | 'obsidian_titan'
  | 'royal_pharaoh';

export const SKIN_ORDER: PlayerSkinId[] = [
  'default',
  'celestial_aurora',
  'golden_dragon_emperor',
  'thunder_god',
  'sakura_shogun',
  'toty_celestial',
  'ballon_dor_chrome',
  'jade_immortal',
  'obsidian_titan',
  'royal_pharaoh',
  'galactic_nebula',
  'golden_goat',
  'icon_legacy',
  'samurai_eclipse',
  'brazil_carnival',
  'inferno_beast',
  'dragon_crimson',
  'cyber_neon',
  'royal_diamond',
  'samba_legend',
  'shadow_phantom',
  'emerald_ace',
  'sunfire_phoenix',
  'frost_emperor',
];

export type RunningAuraId =
  | 'none'
  | 'emerald_wind'
  | 'golden_blaze'
  | 'cyber_lightning'
  | 'crimson_dragon'
  | 'cosmic_nova'
  | 'solar_eclipse'
  | 'aurora_borealis'
  | 'violet_storm'
  | 'plasma_phoenix'
  | 'rainbow_prism';

export interface RunningAuraProfile {
  id: RunningAuraId;
  nameVi: string;
  nameEn: string;
  primaryColor: number;
  secondaryColor: number;
  hexColor: string;
}

export const RUNNING_AURAS: Record<RunningAuraId, RunningAuraProfile> = {
  none: {
    id: 'none',
    nameVi: 'Tắt Hào Quang',
    nameEn: 'No Aura',
    primaryColor: 0x34d399,
    secondaryColor: 0xffffff,
    hexColor: '#64748b',
  },
  emerald_wind: {
    id: 'emerald_wind',
    nameVi: 'Phong Bão Lục Bảo',
    nameEn: 'Emerald Wind',
    primaryColor: 0x10b981,
    secondaryColor: 0x6ee7b7,
    hexColor: '#10b981',
  },
  golden_blaze: {
    id: 'golden_blaze',
    nameVi: 'Hào Quang Hoàng Kim',
    nameEn: 'Golden Blaze',
    primaryColor: 0xf59e0b,
    secondaryColor: 0xfef08a,
    hexColor: '#fbbf24',
  },
  cyber_lightning: {
    id: 'cyber_lightning',
    nameVi: 'Tia Chớp Cyber',
    nameEn: 'Cyber Lightning',
    primaryColor: 0x06b6d4,
    secondaryColor: 0xa5f3fc,
    hexColor: '#22d3ee',
  },
  crimson_dragon: {
    id: 'crimson_dragon',
    nameVi: 'Hỏa Long Cuồng Phong',
    nameEn: 'Crimson Dragon',
    primaryColor: 0xef4444,
    secondaryColor: 0xfb923c,
    hexColor: '#ef4444',
  },
  cosmic_nova: {
    id: 'cosmic_nova',
    nameVi: 'Tinh Tú Ngân Hà',
    nameEn: 'Cosmic Nova',
    primaryColor: 0xc026d3,
    secondaryColor: 0xf0abfc,
    hexColor: '#e879f9',
  },
  solar_eclipse: {
    id: 'solar_eclipse',
    nameVi: 'Nhật Thực Hoàng Kim',
    nameEn: 'Solar Eclipse',
    primaryColor: 0xd97706,
    secondaryColor: 0xfef08a,
    hexColor: '#f59e0b',
  },
  aurora_borealis: {
    id: 'aurora_borealis',
    nameVi: 'Cực Quang Bắc Cực',
    nameEn: 'Aurora Borealis',
    primaryColor: 0x0ea5e9,
    secondaryColor: 0x5eead4,
    hexColor: '#38bdf8',
  },
  violet_storm: {
    id: 'violet_storm',
    nameVi: 'Bão Sét Tử Quang',
    nameEn: 'Violet Storm',
    primaryColor: 0x7c3aed,
    secondaryColor: 0xe879f9,
    hexColor: '#a855f7',
  },
  plasma_phoenix: {
    id: 'plasma_phoenix',
    nameVi: 'Phượng Hoàng Lửa',
    nameEn: 'Plasma Phoenix',
    primaryColor: 0xea580c,
    secondaryColor: 0xfde047,
    hexColor: '#fb923c',
  },
  rainbow_prism: {
    id: 'rainbow_prism',
    nameVi: 'Hào Quang Cầu Vồng',
    nameEn: 'Rainbow Prism',
    primaryColor: 0xec4899,
    secondaryColor: 0x38bdf8,
    hexColor: '#f472b6',
  },
};

export const RUNNING_AURA_ORDER: RunningAuraId[] = [
  'emerald_wind',
  'golden_blaze',
  'cyber_lightning',
  'crimson_dragon',
  'cosmic_nova',
  'solar_eclipse',
  'aurora_borealis',
  'violet_storm',
  'plasma_phoenix',
  'rainbow_prism',
  'none',
];

export interface PlayerSkinProfile {
  id: PlayerSkinId;
  nameVi: string;
  nameEn: string;
  badgeVi: string;
  badgeEn: string;
  jerseyColor: string;
  accentColor: string;
  shortsColor: number;
  bootColor: number;
  gloveColor: number;
  kitPattern: KitPattern;
  hairStyle?: HairStyle;
  hairTint?: number;
  hasHeadband?: boolean;
  auraColor: string;
}

export const PLAYER_SKINS: Record<PlayerSkinId, PlayerSkinProfile> = {
  default: {
    id: 'default',
    nameVi: 'Nguyên Bản CLB',
    nameEn: 'Classic Club',
    badgeVi: 'Mặc định',
    badgeEn: 'Default',
    jerseyColor: '#1d4ed8',
    accentColor: '#ffffff',
    shortsColor: 0xf8fafc,
    bootColor: 0xfef08a,
    gloveColor: 0x38bdf8,
    kitPattern: 'striped',
    auraColor: '#34d399',
  },
  golden_goat: {
    id: 'golden_goat',
    nameVi: 'Hoàng Kim Quả Bóng Vàng',
    nameEn: 'Golden Ballon',
    badgeVi: 'Huyền Thoại',
    badgeEn: 'Legend',
    jerseyColor: '#b45309',
    accentColor: '#fef08a',
    shortsColor: 0x111827,
    bootColor: 0xfacc15,
    gloveColor: 0xfde047,
    kitPattern: 'royal_sash',
    hairStyle: 'quiff',
    auraColor: '#fbbf24',
  },
  dragon_crimson: {
    id: 'dragon_crimson',
    nameVi: 'Hỏa Long Rực Lửa',
    nameEn: 'Crimson Dragon',
    badgeVi: 'Rực Cháy',
    badgeEn: 'Blaze',
    jerseyColor: '#991b1b',
    accentColor: '#fb923c',
    shortsColor: 0x18181b,
    bootColor: 0xf97316,
    gloveColor: 0xef4444,
    kitPattern: 'flame',
    hairStyle: 'mohawk',
    hairTint: 0xef4444,
    hasHeadband: true,
    auraColor: '#f97316',
  },
  cyber_neon: {
    id: 'cyber_neon',
    nameVi: 'Cyber Neon Tương Lai',
    nameEn: 'Cyber Neon',
    badgeVi: 'Công Nghệ',
    badgeEn: 'Cyber',
    jerseyColor: '#0f172a',
    accentColor: '#22d3ee',
    shortsColor: 0x020617,
    bootColor: 0x06b6d4,
    gloveColor: 0x22d3ee,
    kitPattern: 'cyber',
    hairStyle: 'mohawk',
    hairTint: 0x38bdf8,
    auraColor: '#22d3ee',
  },
  royal_diamond: {
    id: 'royal_diamond',
    nameVi: 'Hoàng Gia Kim Cương',
    nameEn: 'Royal Diamond',
    badgeVi: 'Thượng Lưu',
    badgeEn: 'Royal',
    jerseyColor: '#f8fafc',
    accentColor: '#38bdf8',
    shortsColor: 0xf1f5f9,
    bootColor: 0x60a5fa,
    gloveColor: 0xe0f2fe,
    kitPattern: 'chevron',
    hairStyle: 'quiff',
    auraColor: '#60a5fa',
  },
  samba_legend: {
    id: 'samba_legend',
    nameVi: 'Vũ Điệu Samba',
    nameEn: 'Samba Flair',
    badgeVi: 'Nghệ Sĩ',
    badgeEn: 'Flair',
    jerseyColor: '#eab308',
    accentColor: '#16a34a',
    shortsColor: 0x1e3a8a,
    bootColor: 0x4ade80,
    gloveColor: 0x22c55e,
    kitPattern: 'chevron',
    hairStyle: 'long_flow',
    hasHeadband: true,
    auraColor: '#4ade80',
  },
  shadow_phantom: {
    id: 'shadow_phantom',
    nameVi: 'Bóng Ma Ngân Hà',
    nameEn: 'Galaxy Phantom',
    badgeVi: 'Tinh Tú',
    badgeEn: 'Galaxy',
    jerseyColor: '#312e81',
    accentColor: '#e879f9',
    shortsColor: 0x090d16,
    bootColor: 0xc084fc,
    gloveColor: 0xd946ef,
    kitPattern: 'galaxy',
    hairStyle: 'afro_braids',
    auraColor: '#d946ef',
  },
  emerald_ace: {
    id: 'emerald_ace',
    nameVi: 'Lục Bảo Siêu Sao',
    nameEn: 'Emerald Ace',
    badgeVi: 'Tinh Anh',
    badgeEn: 'Ace',
    jerseyColor: '#065f46',
    accentColor: '#34d399',
    shortsColor: 0x064e3b,
    bootColor: 0x10b981,
    gloveColor: 0x34d399,
    kitPattern: 'royal_sash',
    hairStyle: 'buzz',
    auraColor: '#10b981',
  },
  sunfire_phoenix: {
    id: 'sunfire_phoenix',
    nameVi: 'Phượng Hoàng Thái Dương',
    nameEn: 'Sunfire Phoenix',
    badgeVi: 'Thần Thoại',
    badgeEn: 'Mythic',
    jerseyColor: '#ea580c',
    accentColor: '#fde047',
    shortsColor: 0x7c2d12,
    bootColor: 0xfbbf24,
    gloveColor: 0xfb923c,
    kitPattern: 'flame',
    hairStyle: 'long_flow',
    hairTint: 0xf59e0b,
    hasHeadband: true,
    auraColor: '#fb923c',
  },
  frost_emperor: {
    id: 'frost_emperor',
    nameVi: 'Băng Đế Bạch Kim',
    nameEn: 'Frost Emperor',
    badgeVi: 'Bạch Kim',
    badgeEn: 'Platinum',
    jerseyColor: '#0369a1',
    accentColor: '#e0f2fe',
    shortsColor: 0x0c4a6e,
    bootColor: 0x7dd3fc,
    gloveColor: 0xbae6fd,
    kitPattern: 'galaxy',
    hairStyle: 'quiff',
    hairTint: 0xe2e8f0,
    auraColor: '#7dd3fc',
  },
  toty_celestial: {
    id: 'toty_celestial',
    nameVi: 'TOTY Thiên Hà FC',
    nameEn: 'TOTY Celestial FC',
    badgeVi: 'TOTY',
    badgeEn: 'TOTY',
    jerseyColor: '#0f172a',
    accentColor: '#38bdf8',
    shortsColor: 0x090d16,
    bootColor: 0xfacc15,
    gloveColor: 0x38bdf8,
    kitPattern: 'toty_prism',
    hairStyle: 'quiff',
    auraColor: '#38bdf8',
  },
  ballon_dor_chrome: {
    id: 'ballon_dor_chrome',
    nameVi: 'Quả Bóng Vàng Bạch Kim',
    nameEn: "Ballon d'Or Platinum",
    badgeVi: 'Siêu Phẩm',
    badgeEn: 'Prestige',
    jerseyColor: '#1c1917',
    accentColor: '#facc15',
    shortsColor: 0x0c0a09,
    bootColor: 0xfef08a,
    gloveColor: 0xfacc15,
    kitPattern: 'carbon_gold',
    hairStyle: 'quiff',
    auraColor: '#facc15',
  },
  samurai_eclipse: {
    id: 'samurai_eclipse',
    nameVi: 'Samurai Hắc Kim',
    nameEn: 'Eclipse Samurai',
    badgeVi: 'Chiến Binh',
    badgeEn: 'Warrior',
    jerseyColor: '#18181b',
    accentColor: '#f43f5e',
    shortsColor: 0x09090b,
    bootColor: 0xf43f5e,
    gloveColor: 0xfb7185,
    kitPattern: 'royal_sash',
    hairStyle: 'long_flow',
    hasHeadband: true,
    auraColor: '#f43f5e',
  },
  brazil_carnival: {
    id: 'brazil_carnival',
    nameVi: 'Carnival Selecao',
    nameEn: 'Carnival Selecao',
    badgeVi: 'Vũ Công',
    badgeEn: 'Joga Bonito',
    jerseyColor: '#facc15',
    accentColor: '#15803d',
    shortsColor: 0x1d4ed8,
    bootColor: 0x22c55e,
    gloveColor: 0x4ade80,
    kitPattern: 'halftone_pro',
    hairStyle: 'afro_braids',
    auraColor: '#22c55e',
  },
  inferno_beast: {
    id: 'inferno_beast',
    nameVi: 'Hắc Long Viêm Đế',
    nameEn: 'Inferno Dragon',
    badgeVi: 'Cuồng Nộ',
    badgeEn: 'Inferno',
    jerseyColor: '#450a0a',
    accentColor: '#fb923c',
    shortsColor: 0x1c0606,
    bootColor: 0xfb923c,
    gloveColor: 0xf97316,
    kitPattern: 'flame',
    hairStyle: 'mohawk',
    hairTint: 0xf97316,
    auraColor: '#fb923c',
  },
  icon_legacy: {
    id: 'icon_legacy',
    nameVi: 'Huyền Thoại Icon',
    nameEn: 'Prime Icon Legacy',
    badgeVi: 'ICON',
    badgeEn: 'ICON',
    jerseyColor: '#f8fafc',
    accentColor: '#eab308',
    shortsColor: 0xf1f5f9,
    bootColor: 0xfacc15,
    gloveColor: 0xfef08a,
    kitPattern: 'striped',
    hairStyle: 'quiff',
    auraColor: '#fde047',
  },
  celestial_aurora: {
    id: 'celestial_aurora',
    nameVi: 'Cực Quang Bắc Cực',
    nameEn: 'Celestial Aurora',
    badgeVi: 'Cực Quang',
    badgeEn: 'Aurora',
    jerseyColor: '#082f49',
    accentColor: '#2dd4bf',
    shortsColor: 0x042f2e,
    bootColor: 0x5eead4,
    gloveColor: 0x2dd4bf,
    kitPattern: 'aurora_wave',
    hairStyle: 'long_flow',
    hairTint: 0x99f6e4,
    auraColor: '#2dd4bf',
  },
  golden_dragon_emperor: {
    id: 'golden_dragon_emperor',
    nameVi: 'Hoàng Long Chí Tôn',
    nameEn: 'Imperial Dragon',
    badgeVi: 'Chí Tôn',
    badgeEn: 'Emperor',
    jerseyColor: '#7f1d1d',
    accentColor: '#fde047',
    shortsColor: 0x1c1917,
    bootColor: 0xfacc15,
    gloveColor: 0xfde047,
    kitPattern: 'dragon_scale',
    hairStyle: 'mohawk',
    hairTint: 0xfacc15,
    hasHeadband: true,
    auraColor: '#fde047',
  },
  thunder_god: {
    id: 'thunder_god',
    nameVi: 'Lôi Thần Tối Thượng',
    nameEn: 'Storm Sovereign',
    badgeVi: 'Lôi Thần',
    badgeEn: 'Thunder',
    jerseyColor: '#1e1b4b',
    accentColor: '#38bdf8',
    shortsColor: 0x0f172a,
    bootColor: 0x38bdf8,
    gloveColor: 0x7dd3fc,
    kitPattern: 'thunder_bolt',
    hairStyle: 'quiff',
    hairTint: 0xbae6fd,
    auraColor: '#38bdf8',
  },
  sakura_shogun: {
    id: 'sakura_shogun',
    nameVi: 'Anh Đào Kiếm Thánh',
    nameEn: 'Sakura Shogun',
    badgeVi: 'Hoa Anh Đào',
    badgeEn: 'Sakura',
    jerseyColor: '#fdf2f8',
    accentColor: '#f43f5e',
    shortsColor: 0x1f2937,
    bootColor: 0xfb7185,
    gloveColor: 0xfda4af,
    kitPattern: 'sakura_gold',
    hairStyle: 'long_flow',
    hasHeadband: true,
    auraColor: '#fb7185',
  },
  galactic_nebula: {
    id: 'galactic_nebula',
    nameVi: 'Tinh Vân Ngân Hà',
    nameEn: 'Galactic Nebula',
    badgeVi: 'Vũ Trụ',
    badgeEn: 'Cosmic',
    jerseyColor: '#1e1b4b',
    accentColor: '#f472b6',
    shortsColor: 0x090d16,
    bootColor: 0xe879f9,
    gloveColor: 0xf472b6,
    kitPattern: 'galaxy',
    hairStyle: 'afro_braids',
    hasHeadband: true,
    auraColor: '#f472b6',
  },
  jade_immortal: {
    id: 'jade_immortal',
    nameVi: 'Ngọc Bích Đế Vương',
    nameEn: 'Imperial Jade',
    badgeVi: 'Ngọc Bích',
    badgeEn: 'Jade',
    jerseyColor: '#064e3b',
    accentColor: '#fbbf24',
    shortsColor: 0x022c22,
    bootColor: 0x34d399,
    gloveColor: 0xfbbf24,
    kitPattern: 'toty_prism',
    hairStyle: 'quiff',
    hasHeadband: true,
    auraColor: '#34d399',
  },
  obsidian_titan: {
    id: 'obsidian_titan',
    nameVi: 'Hắc Kim Bất Bại',
    nameEn: 'Obsidian Titan',
    badgeVi: 'Bất Bại',
    badgeEn: 'Titan',
    jerseyColor: '#09090b',
    accentColor: '#fb7185',
    shortsColor: 0x09090b,
    bootColor: 0xf43f5e,
    gloveColor: 0xfb7185,
    kitPattern: 'carbon_gold',
    hairStyle: 'buzz',
    hasHeadband: true,
    auraColor: '#f43f5e',
  },
  royal_pharaoh: {
    id: 'royal_pharaoh',
    nameVi: 'Pharaoh Hoàng Gia',
    nameEn: 'Royal Pharaoh',
    badgeVi: 'Hoàng Tộc',
    badgeEn: 'Pharaoh',
    jerseyColor: '#172554',
    accentColor: '#facc15',
    shortsColor: 0x0f172a,
    bootColor: 0xfde047,
    gloveColor: 0xfacc15,
    kitPattern: 'royal_sash',
    hairStyle: 'quiff',
    hasHeadband: true,
    auraColor: '#facc15',
  },
};

export interface KickerProfile {
  id: KickerId;
  name: string;
  shortName: string;
  numberStr: string;
  foot: 'right' | 'left';
  specialty: string;
  jerseyColor: string;
  jerseyAccent: string;
  shortsColor: number;
  bootColor: number;
  hairColor: number;
  skinColor: number;
  hasBeard?: boolean;
  kitPattern?: KitPattern;
  hairStyle?: HairStyle;
  hasHeadband?: boolean;
  /** Multiplier for max shot speed (1.0 = baseline) */
  powerMult: number;
  /** Multiplier for Magnus curve/dip spin (1.0 = baseline) */
  curveMult: number;
  /** Extra GK reaction confusion delay in seconds */
  deceptionSec: number;
}

export const KICKER_PROFILES: Record<KickerId, KickerProfile> = {
  ronaldo: {
    id: 'ronaldo',
    name: 'Cristiano Ronaldo',
    shortName: 'Ronaldo',
    numberStr: '7',
    foot: 'right',
    specialty: 'Sút Uy Lực & Cắm Bóng',
    jerseyColor: '#b91c1c',
    jerseyAccent: '#111827',
    shortsColor: 0xf8fafc,
    bootColor: 0xfef08a,
    hairColor: 0x171412,
    skinColor: 0xd6966c,
    hairStyle: 'quiff',
    kitPattern: 'royal_sash',
    powerMult: 1.09,
    curveMult: 0.94,
    deceptionSec: 0.02,
  },
  messi: {
    id: 'messi',
    name: 'Lionel Messi',
    shortName: 'Messi',
    numberStr: '10',
    foot: 'left',
    specialty: 'Cứa Lòng Xoáy Đỉnh Cao',
    jerseyColor: '#0284c7',
    jerseyAccent: '#f8fafc',
    shortsColor: 0x0f172a,
    bootColor: 0xfbbf24,
    hairColor: 0x261d17,
    skinColor: 0xdfa682,
    hasBeard: true,
    hairStyle: 'quiff',
    kitPattern: 'striped',
    powerMult: 0.96,
    curveMult: 1.24,
    deceptionSec: 0.03,
  },
  neymar: {
    id: 'neymar',
    name: 'Neymar Jr.',
    shortName: 'Neymar',
    numberStr: '10',
    foot: 'right',
    specialty: 'Kỹ Thuật & Đánh Lừa Thủ Môn',
    jerseyColor: '#eab308',
    jerseyAccent: '#15803d',
    shortsColor: 0x1d4ed8,
    bootColor: 0xf97316,
    hairColor: 0xd4a34a,
    skinColor: 0xc98a5f,
    hairStyle: 'mohawk',
    hasHeadband: true,
    kitPattern: 'chevron',
    powerMult: 1.0,
    curveMult: 1.14,
    deceptionSec: 0.08,
  },
  mbappe: {
    id: 'mbappe',
    name: 'Kylian Mbappé',
    shortName: 'Mbappé',
    numberStr: '9',
    foot: 'right',
    specialty: 'Tia Chớp · Sút Căng Góc Xa',
    jerseyColor: '#1e3a8a',
    jerseyAccent: '#ef4444',
    shortsColor: 0x1e3a8a,
    bootColor: 0x38bdf8,
    hairColor: 0x141414,
    skinColor: 0x8d583b,
    hairStyle: 'buzz',
    kitPattern: 'cyber',
    powerMult: 1.11,
    curveMult: 0.96,
    deceptionSec: 0.05,
  },
  beckham: {
    id: 'beckham',
    name: 'David Beckham',
    shortName: 'Beckham',
    numberStr: '7',
    foot: 'right',
    specialty: 'Vua Sút Phạt · Siêu Xoáy Ngang',
    jerseyColor: '#dc2626',
    jerseyAccent: '#ffffff',
    shortsColor: 0xf8fafc,
    bootColor: 0xf8fafc,
    hairColor: 0xc29b61,
    skinColor: 0xe6b89c,
    powerMult: 0.99,
    curveMult: 1.32,
    deceptionSec: 0.04,
  },
  de_bruyne: {
    id: 'de_bruyne',
    name: 'Kevin De Bruyne',
    shortName: 'De Bruyne',
    numberStr: '17',
    foot: 'right',
    specialty: 'Treo Bóng Chuẩn & Cứa Lòng',
    jerseyColor: '#0ea5e9',
    jerseyAccent: '#ffffff',
    shortsColor: 0xf8fafc,
    bootColor: 0xf43f5e,
    hairColor: 0xd4a559,
    skinColor: 0xf0c7ae,
    powerMult: 1.04,
    curveMult: 1.18,
    deceptionSec: 0.04,
  },
  roberto_carlos: {
    id: 'roberto_carlos',
    name: 'Roberto Carlos',
    shortName: 'R. Carlos',
    numberStr: '6',
    foot: 'left',
    specialty: 'Đại Bác Chân Trái · Bóng Lắc',
    jerseyColor: '#ca8a04',
    jerseyAccent: '#16a34a',
    shortsColor: 0x1d4ed8,
    bootColor: 0x111827,
    hairColor: 0x171412,
    skinColor: 0x9c623e,
    hairStyle: 'buzz',
    kitPattern: 'flame',
    powerMult: 1.18,
    curveMult: 1.12,
    deceptionSec: 0.06,
  },
  ronaldinho: {
    id: 'ronaldinho',
    name: 'Ronaldinho',
    shortName: 'Ronaldinho',
    numberStr: '10',
    foot: 'right',
    specialty: 'Ảo Thuật Gia · Đánh Lừa GK',
    jerseyColor: '#1d4ed8',
    jerseyAccent: '#dc2626',
    shortsColor: 0x1e3a8a,
    bootColor: 0xfef08a,
    hairColor: 0x171412,
    skinColor: 0xa86b46,
    hairStyle: 'long_flow',
    hasHeadband: true,
    kitPattern: 'chevron',
    powerMult: 0.98,
    curveMult: 1.26,
    deceptionSec: 0.09,
  },
  haaland: {
    id: 'haaland',
    name: 'Erling Haaland',
    shortName: 'Haaland',
    numberStr: '9',
    foot: 'left',
    specialty: 'Đại Bác Chân Trái · Sức Mạnh Hủy Diệt',
    jerseyColor: '#0ea5e9',
    jerseyAccent: '#f8fafc',
    shortsColor: 0xf8fafc,
    bootColor: 0x38bdf8,
    hairColor: 0xe3c26b,
    skinColor: 0xf0c7ae,
    hairStyle: 'long_flow',
    hasHeadband: true,
    kitPattern: 'cyber',
    powerMult: 1.17,
    curveMult: 0.92,
    deceptionSec: 0.03,
  },
  vinicius: {
    id: 'vinicius',
    name: 'Vinícius Jr.',
    shortName: 'Vini Jr.',
    numberStr: '7',
    foot: 'right',
    specialty: 'Vũ Công Samba · Đánh Lừa Tinh Quái',
    jerseyColor: '#f1f5f9',
    jerseyAccent: '#eab308',
    shortsColor: 0xf8fafc,
    bootColor: 0xf97316,
    hairColor: 0x141414,
    skinColor: 0x8d583b,
    hairStyle: 'afro_braids',
    kitPattern: 'royal_sash',
    powerMult: 1.03,
    curveMult: 1.15,
    deceptionSec: 0.08,
  },
  bellingham: {
    id: 'bellingham',
    name: 'Jude Bellingham',
    shortName: 'Bellingham',
    numberStr: '5',
    foot: 'right',
    specialty: 'Nhạc Trưởng Hoàng Gia · Cứa Lòng Bén',
    jerseyColor: '#1e3a8a',
    jerseyAccent: '#fbbf24',
    shortsColor: 0xf8fafc,
    bootColor: 0xfef08a,
    hairColor: 0x171412,
    skinColor: 0xa86b46,
    hairStyle: 'buzz',
    kitPattern: 'chevron',
    powerMult: 1.06,
    curveMult: 1.14,
    deceptionSec: 0.05,
  },
  yamal: {
    id: 'yamal',
    name: 'Lamine Yamal',
    shortName: 'Yamal',
    numberStr: '19',
    foot: 'left',
    specialty: 'Thần Đồng Cứa Lòng · Xoáy Kèo Trái',
    jerseyColor: '#1d4ed8',
    jerseyAccent: '#b91c1c',
    shortsColor: 0x991b1b,
    bootColor: 0xec4899,
    hairColor: 0x141414,
    skinColor: 0xc98a5f,
    hairStyle: 'afro_braids',
    kitPattern: 'striped',
    powerMult: 0.97,
    curveMult: 1.27,
    deceptionSec: 0.07,
  },
  salah: {
    id: 'salah',
    name: 'Mohamed Salah',
    shortName: 'Salah',
    numberStr: '11',
    foot: 'left',
    specialty: 'Vua Ai Cập · Cứa Lòng Góc Chữ A',
    jerseyColor: '#b91c1c',
    jerseyAccent: '#fef08a',
    shortsColor: 0xb91c1c,
    bootColor: 0xfacc15,
    hairColor: 0x171412,
    skinColor: 0xa86b46,
    hasBeard: true,
    hairStyle: 'quiff',
    kitPattern: 'chevron',
    powerMult: 1.02,
    curveMult: 1.22,
    deceptionSec: 0.05,
  },
  kane: {
    id: 'kane',
    name: 'Harry Kane',
    shortName: 'H. Kane',
    numberStr: '9',
    foot: 'right',
    specialty: 'Sát Thủ Đóng Cọc · Sút Cực Chuẩn',
    jerseyColor: '#dc2626',
    jerseyAccent: '#f8fafc',
    shortsColor: 0xdc2626,
    bootColor: 0x22c55e,
    hairColor: 0xb88b4a,
    skinColor: 0xf0c7ae,
    hairStyle: 'quiff',
    kitPattern: 'royal_sash',
    powerMult: 1.12,
    curveMult: 1.04,
    deceptionSec: 0.03,
  },
  son: {
    id: 'son',
    name: 'Son Heung-min',
    shortName: 'Son H.M.',
    numberStr: '7',
    foot: 'right',
    specialty: 'Ngôi Sao Châu Á · Cứa Lòng Hai Chân',
    jerseyColor: '#f8fafc',
    jerseyAccent: '#1e3a8a',
    shortsColor: 0x1e3a8a,
    bootColor: 0xf43f5e,
    hairColor: 0x171412,
    skinColor: 0xe3b18d,
    hairStyle: 'quiff',
    kitPattern: 'chevron',
    powerMult: 1.08,
    curveMult: 1.15,
    deceptionSec: 0.04,
  },
  juninho: {
    id: 'juninho',
    name: 'Juninho Pernambucano',
    shortName: 'Juninho',
    numberStr: '8',
    foot: 'right',
    specialty: 'Vua Knuckleball · Bóng Lắc Không Tưởng',
    jerseyColor: '#1e3a8a',
    jerseyAccent: '#ef4444',
    shortsColor: 0xf8fafc,
    bootColor: 0xfef08a,
    hairColor: 0x261d17,
    skinColor: 0xd6966c,
    hairStyle: 'buzz',
    kitPattern: 'flame',
    powerMult: 1.08,
    curveMult: 1.31,
    deceptionSec: 0.08,
  },
  pirlo: {
    id: 'pirlo',
    name: 'Andrea Pirlo',
    shortName: 'Pirlo',
    numberStr: '21',
    foot: 'right',
    specialty: 'Kiến Trúc Sư · Lá Vàng Rơi Kinh Điển',
    jerseyColor: '#18181b',
    jerseyAccent: '#f8fafc',
    shortsColor: 0x18181b,
    bootColor: 0xf8fafc,
    hairColor: 0x221a15,
    skinColor: 0xe3b18d,
    hasBeard: true,
    hairStyle: 'long_flow',
    kitPattern: 'striped',
    powerMult: 0.96,
    curveMult: 1.33,
    deceptionSec: 0.06,
  },
  zidane: {
    id: 'zidane',
    name: 'Zinedine Zidane',
    shortName: 'Zidane',
    numberStr: '5',
    foot: 'right',
    specialty: 'Huyền Thoại Zizou · Đẳng Cấp Tuyệt Đối',
    jerseyColor: '#1d4ed8',
    jerseyAccent: '#f8fafc',
    shortsColor: 0xf8fafc,
    bootColor: 0xfbbf24,
    hairColor: 0x26201c,
    skinColor: 0xe3b18d,
    hairStyle: 'buzz',
    kitPattern: 'royal_sash',
    powerMult: 1.04,
    curveMult: 1.21,
    deceptionSec: 0.07,
  },
  valverde: {
    id: 'valverde',
    name: 'Federico Valverde',
    shortName: 'Valverde',
    numberStr: '8',
    foot: 'right',
    specialty: 'Nã Đại Bác Tầm Xa · Bóng Xé Gió',
    jerseyColor: '#0284c7',
    jerseyAccent: '#f8fafc',
    shortsColor: 0x0f172a,
    bootColor: 0x38bdf8,
    hairColor: 0x261d17,
    skinColor: 0xe3b18d,
    hairStyle: 'quiff',
    kitPattern: 'cyber',
    powerMult: 1.16,
    curveMult: 0.98,
    deceptionSec: 0.03,
  },
  quang_hai: {
    id: 'quang_hai',
    name: 'Nguyễn Quang Hải',
    shortName: 'Quang Hải',
    numberStr: '19',
    foot: 'left',
    specialty: 'Cầu Vồng Tuyết · Phù Thủy Chân Trái',
    jerseyColor: '#da251d',
    jerseyAccent: '#facc15',
    shortsColor: 0xda251d,
    bootColor: 0xfacc15,
    hairColor: 0x171412,
    skinColor: 0xe0aa86,
    hairStyle: 'quiff',
    kitPattern: 'chevron',
    powerMult: 0.97,
    curveMult: 1.3,
    deceptionSec: 0.07,
  },
};

export const KICKER_ORDER: KickerId[] = [
  'ronaldo',
  'messi',
  'neymar',
  'mbappe',
  'beckham',
  'de_bruyne',
  'roberto_carlos',
  'ronaldinho',
  'haaland',
  'vinicius',
  'bellingham',
  'yamal',
  'salah',
  'kane',
  'son',
  'juninho',
  'pirlo',
  'zidane',
  'valverde',
  'quang_hai',
];

export interface GoalkeeperProfile {
  id: GoalkeeperId;
  name: string;
  shortName: string;
  numberStr: string;
  specialty: string;
  jerseyColor: string;
  shortsColor: number;
  gloveColor: number;
  hairColor: number;
  skinColor: number;
  hasBeard?: boolean;
  kitPattern?: KitPattern;
  hairStyle?: HairStyle;
  scale: number;
  /** Extra glove reach radius in meters */
  reachBonus: number;
  /** Lateral dive speed multiplier */
  diveSpeedMult: number;
}

export const GK_PROFILES: Record<GoalkeeperId, GoalkeeperProfile> = {
  courtois: {
    id: 'courtois',
    name: 'Thibaut Courtois',
    shortName: 'Courtois',
    numberStr: '1',
    specialty: 'Sải Tay Dài · Bắt Góc Cao',
    jerseyColor: '#f59e0b',
    shortsColor: 0x0f172a,
    gloveColor: 0x38bdf8,
    hairColor: 0x2b211a,
    skinColor: 0xe3b18d,
    scale: 1.1,
    reachBonus: 0.1,
    diveSpeedMult: 0.98,
  },
  neuer: {
    id: 'neuer',
    name: 'Manuel Neuer',
    shortName: 'Neuer',
    numberStr: '1',
    specialty: 'Phản Xạ Nhanh · Đổ Người',
    jerseyColor: '#059669',
    shortsColor: 0x0f172a,
    gloveColor: 0xfef08a,
    hairColor: 0x8b673c,
    skinColor: 0xe7b692,
    scale: 1.05,
    reachBonus: 0.04,
    diveSpeedMult: 1.16,
  },
  alisson: {
    id: 'alisson',
    name: 'Alisson Becker',
    shortName: 'Alisson',
    numberStr: '1',
    specialty: 'Toàn Diện · Bắt Gọn Bóng',
    jerseyColor: '#7c3aed',
    shortsColor: 0x0f172a,
    gloveColor: 0xf97316,
    hairColor: 0x1e1611,
    skinColor: 0xd6966c,
    hasBeard: true,
    scale: 1.06,
    reachBonus: 0.07,
    diveSpeedMult: 1.07,
  },
  donnarumma: {
    id: 'donnarumma',
    name: 'Gianluigi Donnarumma',
    shortName: 'Donnarumma',
    numberStr: '99',
    specialty: 'Người Khổng Lồ Bắt 11m',
    jerseyColor: '#0284c7',
    shortsColor: 0x0f172a,
    gloveColor: 0xf43f5e,
    hairColor: 0x1e1611,
    skinColor: 0xe3b18d,
    hasBeard: true,
    scale: 1.11,
    reachBonus: 0.11,
    diveSpeedMult: 1.03,
  },
  martinez: {
    id: 'martinez',
    name: 'Emiliano Martínez',
    shortName: 'E. Martínez',
    numberStr: '23',
    specialty: 'Vua Cản Phá Penalty',
    jerseyColor: '#16a34a',
    shortsColor: 0x0f172a,
    gloveColor: 0xfacc15,
    hairColor: 0x261d17,
    skinColor: 0xd99b72,
    hasBeard: true,
    scale: 1.07,
    reachBonus: 0.08,
    diveSpeedMult: 1.14,
  },
  casillas: {
    id: 'casillas',
    name: 'Iker Casillas',
    shortName: 'Casillas',
    numberStr: '1',
    specialty: 'Thánh Iker · Phản Xạ Thần Tốc',
    jerseyColor: '#e11d48',
    shortsColor: 0x0f172a,
    gloveColor: 0xf8fafc,
    hairColor: 0x221a15,
    skinColor: 0xe0aa86,
    scale: 1.01,
    reachBonus: 0.05,
    diveSpeedMult: 1.2,
  },
  buffon: {
    id: 'buffon',
    name: 'Gianluigi Buffon',
    shortName: 'Buffon',
    numberStr: '1',
    specialty: 'Người Nhện Ý · Bắt Dính Mọi Góc',
    jerseyColor: '#1d4ed8',
    shortsColor: 0x0f172a,
    gloveColor: 0xfef08a,
    hairColor: 0x1e1611,
    skinColor: 0xe3b18d,
    hairStyle: 'long_flow',
    kitPattern: 'royal_sash',
    scale: 1.08,
    reachBonus: 0.09,
    diveSpeedMult: 1.13,
  },
  yashin: {
    id: 'yashin',
    name: 'Lev Yashin',
    shortName: 'Yashin',
    numberStr: '1',
    specialty: 'Nhện Đen Huyền Thoại · Bất Khả Xâm Phạm',
    jerseyColor: '#111827',
    shortsColor: 0x090d16,
    gloveColor: 0xf8fafc,
    hairColor: 0x1f1916,
    skinColor: 0xe7b692,
    hairStyle: 'buzz',
    kitPattern: 'galaxy',
    scale: 1.07,
    reachBonus: 0.11,
    diveSpeedMult: 1.17,
  },
  oblak: {
    id: 'oblak',
    name: 'Jan Oblak',
    shortName: 'Oblak',
    numberStr: '13',
    specialty: 'Bức Tường Thép · Đọc Vị Tuyệt Đỉnh',
    jerseyColor: '#0f766e',
    shortsColor: 0x0f172a,
    gloveColor: 0x4ade80,
    hairColor: 0x1e1611,
    skinColor: 0xe7b692,
    hasBeard: true,
    hairStyle: 'buzz',
    kitPattern: 'chevron',
    scale: 1.06,
    reachBonus: 0.09,
    diveSpeedMult: 1.11,
  },
  ter_stegen: {
    id: 'ter_stegen',
    name: 'Marc-André ter Stegen',
    shortName: 'Ter Stegen',
    numberStr: '1',
    specialty: 'Phản Xạ Cận Thành · Lao Ra Cực Nhanh',
    jerseyColor: '#ec4899',
    shortsColor: 0x0f172a,
    gloveColor: 0xf8fafc,
    hairColor: 0xc29b61,
    skinColor: 0xf0c7ae,
    hairStyle: 'quiff',
    kitPattern: 'cyber',
    scale: 1.04,
    reachBonus: 0.06,
    diveSpeedMult: 1.15,
  },
  cech: {
    id: 'cech',
    name: 'Petr Čech',
    shortName: 'P. Čech',
    numberStr: '1',
    specialty: 'Người Thép · Khắc Tinh Mọi Cú Sút',
    jerseyColor: '#ea580c',
    shortsColor: 0x18181b,
    gloveColor: 0x38bdf8,
    hairColor: 0x171412,
    skinColor: 0xe7b692,
    hairStyle: 'buzz',
    kitPattern: 'flame',
    scale: 1.1,
    reachBonus: 0.11,
    diveSpeedMult: 1.05,
  },
  ederson: {
    id: 'ederson',
    name: 'Ederson Moraes',
    shortName: 'Ederson',
    numberStr: '31',
    specialty: 'Thủ Thành Quét · Bắt Penalty Cực Khét',
    jerseyColor: '#84cc16',
    shortsColor: 0x0f172a,
    gloveColor: 0x22d3ee,
    hairColor: 0x171412,
    skinColor: 0xd6966c,
    hasBeard: true,
    hairStyle: 'buzz',
    kitPattern: 'cyber',
    scale: 1.05,
    reachBonus: 0.07,
    diveSpeedMult: 1.14,
  },
};

export const GK_ORDER: GoalkeeperId[] = [
  'courtois',
  'neuer',
  'alisson',
  'donnarumma',
  'martinez',
  'casillas',
  'buffon',
  'yashin',
  'oblak',
  'ter_stegen',
  'cech',
  'ederson',
];

export const DIFFICULTY_LABELS: Record<
  Difficulty,
  { label: string; scoreMult: number; chargeSpeed: number; windMult: number }
> = {
  easy: { label: 'Dễ', scoreMult: 1.0, chargeSpeed: 0.85, windMult: 0.4 },
  medium: {
    label: 'Trung Bình',
    scoreMult: 1.2,
    chargeSpeed: 1.15,
    windMult: 1.0,
  },
  pro: { label: 'Khó', scoreMult: 1.5, chargeSpeed: 1.48, windMult: 1.45 },
  extreme: {
    label: 'Siêu Khó',
    scoreMult: 2.0,
    chargeSpeed: 1.9,
    windMult: 1.9,
  },
};

export interface TeamProfile {
  id: TeamId;
  name: string;
  shortCode: string;
  league: string;
  jerseyColor: string;
  altJerseyColor: string;
  shortsColor: number;
  altShortsColor: number;
  gkJerseyColor: string;
  starKickerId: KickerId;
  gkId: GoalkeeperId;
  squadNumbers: [string, string, string, string];
  attackRating: number;
  defenseRating: number;
}

export const TEAM_PROFILES: Record<TeamId, TeamProfile> = {
  real_madrid: {
    id: 'real_madrid',
    name: 'Real Madrid',
    shortCode: 'RMA',
    league: 'CLB · Tây Ban Nha',
    jerseyColor: '#f1f5f9',
    altJerseyColor: '#1e1b4b',
    shortsColor: 0xf8fafc,
    altShortsColor: 0x1e1b4b,
    gkJerseyColor: '#f59e0b',
    starKickerId: 'mbappe',
    gkId: 'courtois',
    squadNumbers: ['4', '8', '5', '9'],
    attackRating: 94,
    defenseRating: 90,
  },
  barcelona: {
    id: 'barcelona',
    name: 'FC Barcelona',
    shortCode: 'BAR',
    league: 'CLB · Tây Ban Nha',
    jerseyColor: '#1d4ed8',
    altJerseyColor: '#facc15',
    shortsColor: 0x991b1b,
    altShortsColor: 0x1e293b,
    gkJerseyColor: '#10b981',
    starKickerId: 'ronaldinho',
    gkId: 'casillas',
    squadNumbers: ['3', '6', '8', '10'],
    attackRating: 93,
    defenseRating: 87,
  },
  man_city: {
    id: 'man_city',
    name: 'Manchester City',
    shortCode: 'MCI',
    league: 'CLB · Ngoại Hạng Anh',
    jerseyColor: '#38bdf8',
    altJerseyColor: '#7f1d1d',
    shortsColor: 0xf8fafc,
    altShortsColor: 0x0f172a,
    gkJerseyColor: '#eab308',
    starKickerId: 'de_bruyne',
    gkId: 'donnarumma',
    squadNumbers: ['3', '16', '17', '9'],
    attackRating: 92,
    defenseRating: 91,
  },
  portugal: {
    id: 'portugal',
    name: 'Bồ Đào Nha',
    shortCode: 'POR',
    league: 'ĐTQG · Châu Âu',
    jerseyColor: '#b91c1c',
    altJerseyColor: '#f8fafc',
    shortsColor: 0x14532d,
    altShortsColor: 0x0f172a,
    gkJerseyColor: '#0284c7',
    starKickerId: 'ronaldo',
    gkId: 'neuer',
    squadNumbers: ['3', '8', '10', '7'],
    attackRating: 92,
    defenseRating: 89,
  },
  argentina: {
    id: 'argentina',
    name: 'Argentina',
    shortCode: 'ARG',
    league: 'ĐTQG · Nam Mỹ',
    jerseyColor: '#0284c7',
    altJerseyColor: '#312e81',
    shortsColor: 0x0f172a,
    altShortsColor: 0x0f172a,
    gkJerseyColor: '#16a34a',
    starKickerId: 'messi',
    gkId: 'martinez',
    squadNumbers: ['17', '7', '11', '10'],
    attackRating: 94,
    defenseRating: 91,
  },
  brazil: {
    id: 'brazil',
    name: 'Brazil',
    shortCode: 'BRA',
    league: 'ĐTQG · Nam Mỹ',
    jerseyColor: '#eab308',
    altJerseyColor: '#1d4ed8',
    shortsColor: 0x1d4ed8,
    altShortsColor: 0xf8fafc,
    gkJerseyColor: '#7c3aed',
    starKickerId: 'neymar',
    gkId: 'alisson',
    squadNumbers: ['6', '8', '7', '10'],
    attackRating: 93,
    defenseRating: 88,
  },
  liverpool: {
    id: 'liverpool',
    name: 'Liverpool FC',
    shortCode: 'LIV',
    league: 'CLB · Ngoại Hạng Anh',
    jerseyColor: '#b91c1c',
    altJerseyColor: '#f8fafc',
    shortsColor: 0xb91c1c,
    altShortsColor: 0x0f172a,
    gkJerseyColor: '#7c3aed',
    starKickerId: 'salah',
    gkId: 'alisson',
    squadNumbers: ['4', '8', '7', '11'],
    attackRating: 93,
    defenseRating: 90,
  },
  bayern: {
    id: 'bayern',
    name: 'Bayern Munich',
    shortCode: 'BAY',
    league: 'CLB · Đức',
    jerseyColor: '#dc2626',
    altJerseyColor: '#0f172a',
    shortsColor: 0xdc2626,
    altShortsColor: 0xf8fafc,
    gkJerseyColor: '#059669',
    starKickerId: 'kane',
    gkId: 'neuer',
    squadNumbers: ['2', '6', '42', '9'],
    attackRating: 92,
    defenseRating: 89,
  },
  juventus: {
    id: 'juventus',
    name: 'Juventus FC',
    shortCode: 'JUV',
    league: 'CLB · Ý',
    jerseyColor: '#18181b',
    altJerseyColor: '#facc15',
    shortsColor: 0x18181b,
    altShortsColor: 0x0f172a,
    gkJerseyColor: '#1d4ed8',
    starKickerId: 'pirlo',
    gkId: 'buffon',
    squadNumbers: ['3', '21', '10', '9'],
    attackRating: 90,
    defenseRating: 92,
  },
  france: {
    id: 'france',
    name: 'ĐT Pháp',
    shortCode: 'FRA',
    league: 'ĐTQG · Châu Âu',
    jerseyColor: '#1e3a8a',
    altJerseyColor: '#f8fafc',
    shortsColor: 0x1e3a8a,
    altShortsColor: 0x1e3a8a,
    gkJerseyColor: '#111827',
    starKickerId: 'mbappe',
    gkId: 'yashin',
    squadNumbers: ['4', '5', '7', '10'],
    attackRating: 95,
    defenseRating: 90,
  },
  england: {
    id: 'england',
    name: 'ĐT Anh',
    shortCode: 'ENG',
    league: 'ĐTQG · Châu Âu',
    jerseyColor: '#f8fafc',
    altJerseyColor: '#dc2626',
    shortsColor: 0x1e3a8a,
    altShortsColor: 0xf8fafc,
    gkJerseyColor: '#ea580c',
    starKickerId: 'bellingham',
    gkId: 'cech',
    squadNumbers: ['5', '4', '7', '9'],
    attackRating: 91,
    defenseRating: 89,
  },
  vietnam: {
    id: 'vietnam',
    name: 'Việt Nam',
    shortCode: 'VIE',
    league: 'ĐTQG · Đông Nam Á',
    jerseyColor: '#da251d',
    altJerseyColor: '#facc15',
    shortsColor: 0xda251d,
    altShortsColor: 0xda251d,
    gkJerseyColor: '#0f766e',
    starKickerId: 'quang_hai',
    gkId: 'casillas',
    squadNumbers: ['3', '14', '19', '22'],
    attackRating: 88,
    defenseRating: 86,
  },
};

export const TEAM_ORDER: TeamId[] = [
  'real_madrid',
  'barcelona',
  'man_city',
  'liverpool',
  'bayern',
  'juventus',
  'portugal',
  'argentina',
  'brazil',
  'france',
  'england',
  'vietnam',
];

export type CameraPreset = 'kicker' | 'broadcast' | 'behind_goal';

export type GamePhase =
  | 'aiming'
  | 'charging'
  | 'runup'
  | 'flight'
  | 'result'
  | 'replay'
  | 'playing'
  | 'match_goal'
  | 'match_over';

export type ShotOutcomeType =
  | 'goal_top_corner'
  | 'goal'
  | 'saved'
  | 'woodwork'
  | 'wall_blocked'
  | 'missed';

export interface SpinInput {
  /** Horizontal curl: -1 (xoáy phải sang trái / inswinger) to +1 (xoáy trái sang phải) */
  curve: number;
  /** Vertical spin: -1 (bổng / backspin) to +1 (cắm xuống / topspin) */
  dip: number;
}

export interface AimTarget {
  /** Target X in goal/box plane (meters, goal posts at +/-3.66) */
  x: number;
  /** Target Y in goal/box plane (meters, crossbar at 2.44) */
  y: number;
  /** Optional target Z (defaults to goal line 0; positive values target penalty box for corner crosses) */
  z?: number;
}

export interface WindState {
  /** Lateral wind m/s (negative = left, positive = right) */
  x: number;
  /** Head/tail wind m/s */
  z: number;
}

export interface KickScenario {
  id: string;
  label: string;
  ballPos: { x: number; z: number };
  wallCount: number;
  wind: WindState;
  difficulty: Difficulty;
}

export interface ShotOutcome {
  type: ShotOutcomeType;
  title: string;
  subtitle: string;
  points: number;
  speedKmh: number;
  spinRpm: number;
  hitWoodwork: boolean;
  isHeader?: boolean;
  isRebound?: boolean;
  cornerAwarded?: 'left' | 'right' | null;
  curveBendMeters?: number;
}

export interface MatchRoundRecord {
  round: number;
  scenarioLabel: string;
  role: TurnRole;
  outcome: ShotOutcomeType;
  points: number;
  speedKmh: number;
  isHeader?: boolean;
  isRebound?: boolean;
}

export interface GameSnapshot {
  mode: GameMode;
  matchFormat: MatchFormat;
  practiceFocus: PracticeFocus;
  phase: GamePhase;
  turnRole: TurnRole;
  vsBotHalf: 'player_kick' | 'bot_kick';
  difficulty: Difficulty;
  kickerId: KickerId;
  gkId: GoalkeeperId;
  activeBotKickerId: KickerId;
  playerSkinId: PlayerSkinId;
  runningAuraId: RunningAuraId;
  cameraPreset: CameraPreset;
  cameraOrbitMode: boolean;
  cameraHasCustomOrbit: boolean;
  weather: WeatherType;
  shotSkill: ShotSkillType;
  activeDribbleSkill: DribbleSkillType | null;
  scenario: KickScenario;
  round: number;
  totalRounds: number;
  score: number;
  bestScore: number;
  streak: number;
  goalsScored: number;
  playerGoals: number;
  botGoals: number;
  gkSaves: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  matchTimeSec: number;
  matchDurationSec: number;
  matchPossession: 'home' | 'away' | 'loose';
  matchEventText: string | null;
  matchShotsHome: number;
  matchShotsAway: number;
  matchGoalSeq: number;
  matchGoalTier: 'normal' | 'super' | null;
  matchGoalScorerName: string | null;
  matchGoalTeam: 'home' | 'away' | null;
  power: number; // 0..1
  spin: SpinInput;
  aim: AimTarget;
  previewBendMeters: number;
  customWindActive: boolean;
  lastOutcome: ShotOutcome | null;
  history: MatchRoundRecord[];
  muted: boolean;
  hasReplay: boolean;
}

export const CHALLENGE_SCENARIOS: KickScenario[] = [
  {
    id: 'round-1',
    label: '18m Trung Lộ',
    ballPos: { x: -1.5, z: 18.5 },
    wallCount: 3,
    wind: { x: 0.4, z: 0 },
    difficulty: 'easy',
  },
  {
    id: 'round-2',
    label: '21m Góc Trái',
    ballPos: { x: -5.8, z: 20.5 },
    wallCount: 4,
    wind: { x: -1.1, z: 0.2 },
    difficulty: 'medium',
  },
  {
    id: 'round-3',
    label: '23m Góc Phải',
    ballPos: { x: 6.4, z: 22.0 },
    wallCount: 4,
    wind: { x: 1.4, z: -0.3 },
    difficulty: 'medium',
  },
  {
    id: 'round-4',
    label: '26m Cự Ly Xa',
    ballPos: { x: -4.2, z: 25.8 },
    wallCount: 5,
    wind: { x: -2.1, z: 0.5 },
    difficulty: 'pro',
  },
  {
    id: 'round-5',
    label: '29m Siêu Phẩm',
    ballPos: { x: 7.2, z: 28.2 },
    wallCount: 5,
    wind: { x: 2.4, z: -0.6 },
    difficulty: 'pro',
  },
];

export const IMPOSSIBLE_REWARD_COINS = 1_000_000_000;

export function computeImpossibleEntryFee(
  coins: number,
  isAdmin: boolean,
): number {
  if (isAdmin) return 0;
  if (!Number.isFinite(coins) || coins < 10) return 0;
  return Math.max(1, Math.round(coins * 0.1));
}

export const IMPOSSIBLE_SCENARIO: KickScenario = {
  id: 'impossible-1b',
  label: 'Sút Phạt 1 Tỷ Xu (Boss Yashin)',
  ballPos: { x: -3.2, z: 26.5 },
  wallCount: 7,
  wind: { x: 2.2, z: -0.6 },
  difficulty: 'extreme',
};

export const PENALTY_SCENARIO: KickScenario = {
  id: 'penalty-11m',
  label: '11m Penalty',
  ballPos: { x: 0, z: 11.0 },
  wallCount: 0,
  wind: { x: 0, z: 0 },
  difficulty: 'medium',
};

export const PRACTICE_SPOTS: KickScenario[] = [
  {
    id: 'spot-penalty',
    label: '11m Phạt Đền',
    ballPos: { x: 0, z: 11.0 },
    wallCount: 0,
    wind: { x: 0, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'spot-18m',
    label: '18m Trực Diện',
    ballPos: { x: 0, z: 18.2 },
    wallCount: 3,
    wind: { x: 0.5, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'spot-22-left',
    label: '22m Cánh Trái',
    ballPos: { x: -6.2, z: 21.2 },
    wallCount: 4,
    wind: { x: -1.2, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'spot-22-right',
    label: '22m Cánh Phải',
    ballPos: { x: 6.2, z: 21.2 },
    wallCount: 4,
    wind: { x: 1.2, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'spot-28-far',
    label: '28m Đại Bác',
    ballPos: { x: -3.5, z: 27.8 },
    wallCount: 5,
    wind: { x: -1.8, z: 0 },
    difficulty: 'pro',
  },
  {
    id: 'spot-corner-left',
    label: 'Phạt Góc Trái',
    ballPos: { x: -41.2, z: 0.7 },
    wallCount: 0,
    wind: { x: 0.8, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'spot-corner-right',
    label: 'Phạt Góc Phải',
    ballPos: { x: 41.2, z: 0.7 },
    wallCount: 0,
    wind: { x: -0.8, z: 0 },
    difficulty: 'medium',
  },
];

export const CORNER_SCENARIOS: KickScenario[] = [
  {
    id: 'spot-corner-left',
    label: 'Phạt Góc Trái',
    ballPos: { x: -41.2, z: 0.7 },
    wallCount: 0,
    wind: { x: 0.8, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'spot-corner-right',
    label: 'Phạt Góc Phải',
    ballPos: { x: 41.2, z: 0.7 },
    wallCount: 0,
    wind: { x: -0.8, z: 0 },
    difficulty: 'medium',
  },
];

export const CURVE_LAB_SPOTS: KickScenario[] = [
  {
    id: 'curve-22-center',
    label: '22m Vòng Rào 4 Người',
    ballPos: { x: 0, z: 22.0 },
    wallCount: 4,
    wind: { x: 1.8, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'curve-24-left',
    label: '24m Cánh Trái (Cứa Lòng)',
    ballPos: { x: -6.4, z: 23.8 },
    wallCount: 4,
    wind: { x: -2.2, z: -0.6 },
    difficulty: 'pro',
  },
  {
    id: 'curve-24-right',
    label: '24m Cánh Phải (Trivela)',
    ballPos: { x: 6.4, z: 23.8 },
    wallCount: 4,
    wind: { x: 2.2, z: 0.6 },
    difficulty: 'pro',
  },
  {
    id: 'curve-29-carlos',
    label: '29m Siêu Xoáy Roberto Carlos',
    ballPos: { x: 4.5, z: 28.8 },
    wallCount: 5,
    wind: { x: -3.2, z: -1.0 },
    difficulty: 'extreme',
  },
];

