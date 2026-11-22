import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bath,
  BedDouble,
  Coffee,
  Disc3,
  DoorOpen,
  Gamepad2,
  Home,
  Hotel,
  MapPin,
  Music,
  Paintbrush,
  Send,
  Smile,
  Sofa,
  Sparkles,
  Trophy,
  Tv,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import {
  KICKER_ORDER,
  KICKER_PROFILES,
  KickerId,
  PLAYER_SKINS,
  PlayerSkinId,
  RUNNING_AURA_ORDER,
  RUNNING_AURAS,
  RunningAuraId,
  SKIN_ORDER,
} from '../game/types';
import {
  onlineMatchClient,
  PlazaAvatarPose,
  PlazaChatMessage,
  PlazaUserState,
  PlazaZoneId,
} from '../services/onlineMatchClient';

interface SocialPlazaModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  username: string;
  initialKickerId: KickerId;
  initialSkinId: PlayerSkinId;
  initialAuraId: RunningAuraId;
}

const WORLD_W = 1000;
const WORLD_H = 620;
const SUITE_STORAGE_KEY = 'sut_phat_3d_hotel_suite_v1';

type SuiteThemeId = 'royal_gold' | 'cyber_neon' | 'tropical_resort';
type SuiteFurnitureKey =
  | 'bed'
  | 'tv_lounge'
  | 'jacuzzi'
  | 'minibar'
  | 'trophy_case'
  | 'disco_corner'
  | 'palm_trees';

interface HotelSuiteConfig {
  theme: SuiteThemeId;
  furniture: Record<SuiteFurnitureKey, boolean>;
}

const DEFAULT_SUITE_CONFIG: HotelSuiteConfig = {
  theme: 'royal_gold',
  furniture: {
    bed: true,
    tv_lounge: true,
    jacuzzi: true,
    minibar: true,
    trophy_case: true,
    disco_corner: true,
    palm_trees: true,
  },
};

function loadSuiteConfig(): HotelSuiteConfig {
  try {
    const raw = localStorage.getItem(SUITE_STORAGE_KEY);
    if (!raw) return DEFAULT_SUITE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<HotelSuiteConfig>;
    const theme: SuiteThemeId =
      parsed.theme === 'cyber_neon' || parsed.theme === 'tropical_resort'
        ? parsed.theme
        : 'royal_gold';
    return {
      theme,
      furniture: {
        ...DEFAULT_SUITE_CONFIG.furniture,
        ...(parsed.furniture ?? {}),
      },
    };
  } catch {
    return DEFAULT_SUITE_CONFIG;
  }
}

const SUITE_THEMES: Record<
  SuiteThemeId,
  {
    name: string;
    wallBg: string;
    floorBg: string;
    floorTile: string;
    rugColor: string;
    accent: string;
  }
> = {
  royal_gold: {
    name: 'Hoàng Gia Vàng 5★',
    wallBg: '#1c1410',
    floorBg: '#2b1e16',
    floorTile: 'rgba(251, 191, 36, 0.08)',
    rugColor: '#7f1d1d',
    accent: '#fbbf24',
  },
  cyber_neon: {
    name: 'Cyber Neon VIP',
    wallBg: '#0c0b24',
    floorBg: '#131236',
    floorTile: 'rgba(56, 189, 248, 0.1)',
    rugColor: '#4c1d95',
    accent: '#38bdf8',
  },
  tropical_resort: {
    name: 'Biển Nhiệt Đới',
    wallBg: '#0a1f24',
    floorBg: '#162f33',
    floorTile: 'rgba(52, 211, 153, 0.09)',
    rugColor: '#0f766e',
    accent: '#34d399',
  },
};

const SUITE_FURNITURE_LABELS: Record<
  SuiteFurnitureKey,
  { label: string; icon: string }
> = {
  bed: { label: 'Giường King Size', icon: '🛏️' },
  tv_lounge: { label: 'Sofa & TV 4K 85"', icon: '📺' },
  jacuzzi: { label: 'Bồn Tắm Jacuzzi', icon: '🛁' },
  minibar: { label: 'Quầy Mini-Bar & Pizza', icon: '🍕' },
  trophy_case: { label: 'Tủ Cúp Danh Vọng', icon: '🏆' },
  disco_corner: { label: 'Góc Loa Đèn Party', icon: '🪩' },
  palm_trees: { label: 'Cây Cảnh & Ban Công', icon: '🌴' },
};

const ZONE_META: Record<
  PlazaZoneId,
  { label: string; spawnX: number; spawnY: number; color: string; desc: string }
> = {
  plaza: {
    label: 'Quảng Trường',
    spawnX: 500,
    spawnY: 325,
    color: '#10b981',
    desc: 'Đài phun nước Ngôi Sao & Đại lộ Danh Vọng',
  },
  disco: {
    label: 'Sàn Nhảy Disco',
    spawnX: 195,
    spawnY: 205,
    color: '#ec4899',
    desc: 'Sàn đèn Neon, DJ Booth & Quả cầu Disco',
  },
  hotel: {
    label: 'Cổng Khách Sạn 5★',
    spawnX: 795,
    spawnY: 235,
    color: '#f59e0b',
    desc: 'Lối vào Khách Sạn Play Together 5★',
  },
  hotel_lobby: {
    label: 'Sảnh Lễ Tân KS',
    spawnX: 500,
    spawnY: 455,
    color: '#f59e0b',
    desc: 'Sảnh Đón Tiếp VIP, Thang Máy Lên Suite & Hồ Bơi',
  },
  hotel_suite: {
    label: 'Phòng Suite Của Tôi',
    spawnX: 500,
    spawnY: 390,
    color: '#fbbf24',
    desc: 'Phòng Riêng Kiểu Play Together: Giường King, Jacuzzi, TV & Mini-Bar',
  },
  hotel_rooftop: {
    label: 'Hồ Bơi Sân Thượng',
    spawnX: 500,
    spawnY: 440,
    color: '#38bdf8',
    desc: 'Hồ Bơi Vô Cực Trên Tầng Thượng & Sky Bar',
  },
  arcade: {
    label: 'Khu Mini-Game',
    spawnX: 500,
    spawnY: 505,
    color: '#38bdf8',
    desc: 'Tâng Bóng, Xúc Xắc & Penalty Arcade',
  },
};

function isHotelInteriorZone(zone: PlazaZoneId): boolean {
  return (
    zone === 'hotel_lobby' ||
    zone === 'hotel_suite' ||
    zone === 'hotel_rooftop'
  );
}

interface HotelStation {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  targetX: number;
  targetY: number;
  pose: PlazaAvatarPose;
  emote?: string;
  energyDelta: number;
  moodDelta: number;
  activityText: string;
  nextZone?: PlazaZoneId;
  furnitureKey?: SuiteFurnitureKey;
}

function getStationsForInterior(
  zone: PlazaZoneId,
  suiteConfig: HotelSuiteConfig,
): HotelStation[] {
  if (zone === 'hotel_lobby') {
    return [
      {
        id: 'lobby_reception',
        label: 'Nhận Chìa Khóa Suite',
        x: 340,
        y: 88,
        w: 320,
        h: 95,
        targetX: 500,
        targetY: 225,
        pose: 'stand',
        emote: 'Check-in VIP 🔑',
        energyDelta: 4,
        moodDelta: 8,
        activityText: 'vừa nhận chìa khóa Vàng tại Sảnh Lễ Tân Khách Sạn 5★! 🔑🏨',
      },
      {
        id: 'lobby_elevator_suite',
        label: 'Lên Phòng Suite 888',
        x: 780,
        y: 86,
        w: 170,
        h: 120,
        targetX: 865,
        targetY: 210,
        pose: 'stand',
        energyDelta: 0,
        moodDelta: 5,
        activityText: 'vừa bấm thang máy lên Phòng Suite VIP 888! 🛗✨',
        nextZone: 'hotel_suite',
      },
      {
        id: 'lobby_elevator_pool',
        label: 'Lên Hồ Bơi Sân Thượng',
        x: 50,
        y: 86,
        w: 170,
        h: 120,
        targetX: 135,
        targetY: 210,
        pose: 'stand',
        energyDelta: 0,
        moodDelta: 5,
        activityText: 'vừa lên Hồ Bơi Vô Cực trên Sân Thượng Khách Sạn! 🏊✨',
        nextZone: 'hotel_rooftop',
      },
      {
        id: 'lobby_lounge_left',
        label: 'Ghế Chờ VIP',
        x: 85,
        y: 330,
        w: 190,
        h: 115,
        targetX: 180,
        targetY: 385,
        pose: 'sit',
        emote: 'Nghỉ Sảnh ☕',
        energyDelta: 8,
        moodDelta: 10,
        activityText: 'đang ngồi thư giãn tại Sảnh Lounge Khách Sạn 5★ ☕🛋️',
      },
      {
        id: 'lobby_exit',
        label: 'Ra Quảng Trường',
        x: 410,
        y: 530,
        w: 180,
        h: 72,
        targetX: 500,
        targetY: 515,
        pose: 'stand',
        energyDelta: 0,
        moodDelta: 0,
        activityText: 'bước từ Khách Sạn ra Quảng Trường Resort 🌳',
        nextZone: 'plaza',
      },
    ];
  }

  if (zone === 'hotel_suite') {
    const stations: HotelStation[] = [
      {
        id: 'suite_exit_lobby',
        label: 'Xuống Sảnh Lễ Tân',
        x: 430,
        y: 542,
        w: 140,
        h: 64,
        targetX: 500,
        targetY: 515,
        pose: 'stand',
        energyDelta: 0,
        moodDelta: 0,
        activityText: 'đi thang máy xuống Sảnh Lễ Tân Khách Sạn 🛗',
        nextZone: 'hotel_lobby',
      },
    ];
    if (suiteConfig.furniture.bed) {
      stations.push({
        id: 'suite_bed',
        label: 'Ngủ Giường King Size',
        x: 68,
        y: 92,
        w: 220,
        h: 165,
        targetX: 178,
        targetY: 168,
        pose: 'sleep',
        emote: 'Ngủ Ngon 💤',
        energyDelta: 35,
        moodDelta: 14,
        activityText: 'đang nằm ngủ thư giãn trên Giường King Phòng Suite 🛏️💤',
        furnitureKey: 'bed',
      });
    }
    if (suiteConfig.furniture.tv_lounge) {
      stations.push({
        id: 'suite_sofa_tv',
        label: 'Ngồi Sofa Xem Bóng Đá 4K',
        x: 345,
        y: 120,
        w: 295,
        h: 175,
        targetX: 492,
        targetY: 245,
        pose: 'sit',
        emote: 'Xem C1 📺',
        energyDelta: 12,
        moodDelta: 20,
        activityText: 'đang ngồi Sofa VIP xem siêu kinh điển trên TV 85 inch 🛋️📺',
        furnitureKey: 'tv_lounge',
      });
    }
    if (suiteConfig.furniture.jacuzzi) {
      stations.push({
        id: 'suite_jacuzzi',
        label: 'Tắm Bồn Jacuzzi Sủi Bọt',
        x: 710,
        y: 96,
        w: 225,
        h: 170,
        targetX: 822,
        targetY: 176,
        pose: 'bath',
        emote: 'Tắm Jacuzzi 🫧',
        energyDelta: 26,
        moodDelta: 28,
        activityText: 'đang ngâm mình trong Bồn Tắm Jacuzzi sủi bọt sang chảnh 🛁🫧',
        furnitureKey: 'jacuzzi',
      });
    }
    if (suiteConfig.furniture.minibar) {
      stations.push({
        id: 'suite_minibar',
        label: 'Ăn Tiệc Mini-Bar VIP',
        x: 715,
        y: 350,
        w: 220,
        h: 155,
        targetX: 810,
        targetY: 425,
        pose: 'sit',
        emote: 'Cạn Ly 🥂🍕',
        energyDelta: 22,
        moodDelta: 24,
        activityText: 'đang thưởng thức Pizza & Champagne tại Mini-Bar Phòng Suite 🍕🥂',
        furnitureKey: 'minibar',
      });
    }
    if (suiteConfig.furniture.disco_corner) {
      stations.push({
        id: 'suite_disco',
        label: 'Nhảy Party Trong Phòng',
        x: 72,
        y: 355,
        w: 205,
        h: 150,
        targetX: 172,
        targetY: 430,
        pose: 'dance',
        emote: 'Quẩy Suite 🪩',
        energyDelta: -4,
        moodDelta: 30,
        activityText: 'đang bật đèn Disco quẩy tưng bừng ngay trong Phòng Suite! 🪩💃',
        furnitureKey: 'disco_corner',
      });
    }
    return stations;
  }

  if (zone === 'hotel_rooftop') {
    return [
      {
        id: 'pool_swim',
        label: 'Bơi Hồ Bơi Vô Cực',
        x: 195,
        y: 120,
        w: 610,
        h: 225,
        targetX: 500,
        targetY: 235,
        pose: 'swim',
        emote: 'Bơi Vô Cực 🏊',
        energyDelta: 15,
        moodDelta: 30,
        activityText: 'đang bơi lội cực chill ở Hồ Bơi Vô Cực tầng thượng! 🏊✨',
      },
      {
        id: 'pool_lounger_left',
        label: 'Ghế Tắm Nắng VIP',
        x: 68,
        y: 392,
        w: 190,
        h: 120,
        targetX: 162,
        targetY: 446,
        pose: 'sleep',
        emote: 'Tắm Nắng 😎',
        energyDelta: 25,
        moodDelta: 20,
        activityText: 'đang nằm ghế tắm nắng ngắm view thành phố 5★ 😎🌴',
      },
      {
        id: 'pool_skybar',
        label: 'Quầy Sky Bar Sân Thượng',
        x: 732,
        y: 382,
        w: 205,
        h: 135,
        targetX: 810,
        targetY: 452,
        pose: 'sit',
        emote: 'Cocktail SkyBar 🍹',
        energyDelta: 16,
        moodDelta: 24,
        activityText: 'đang nhâm nhi Cocktail tại Sky Bar Sân Thượng Khách Sạn 🍹🌃',
      },
      {
        id: 'pool_to_suite',
        label: 'Về Phòng Suite 888',
        x: 410,
        y: 530,
        w: 180,
        h: 72,
        targetX: 500,
        targetY: 515,
        pose: 'stand',
        energyDelta: 0,
        moodDelta: 0,
        activityText: 'về lại Phòng Suite VIP 888 🏠',
        nextZone: 'hotel_suite',
      },
    ];
  }

  return [];
}

const QUICK_EMOTES = [
  { id: 'Nhảy Disco 💃', label: 'Nhảy Disco', icon: '💃' },
  { id: 'Moonwalk 🕺', label: 'Moonwalk', icon: '🕺' },
  { id: 'Siuuu! 🔥', label: 'Siuuu!', icon: '🔥' },
  { id: 'Nghỉ Suite 🛌', label: 'Nghỉ Khách Sạn', icon: '🏨' },
  { id: 'Cạn Ly VIP 🥂', label: 'Cạn Ly 🥂', icon: '🥂' },
  { id: 'Vẫy Tay 👋', label: 'Chào Fan', icon: '👋' },
];

function detectOutdoorZoneAt(x: number, y: number): PlazaZoneId {
  if (x < 385 && y < 380) return 'disco';
  if (x > 615 && y < 395) return 'hotel';
  if (y > 415 && x >= 270 && x <= 730) return 'arcade';
  return 'plaza';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexFromNumber(num: number): string {
  return `#${num.toString(16).padStart(6, '0')}`;
}

export const SocialPlazaModal: React.FC<SocialPlazaModalProps> = ({
  open,
  onClose,
  playerId,
  username,
  initialKickerId,
  initialSkinId,
  initialAuraId,
}) => {
  const [selectedKicker, setSelectedKicker] = useState<KickerId>(initialKickerId);
  const [selectedSkin, setSelectedSkin] = useState<PlayerSkinId>(initialSkinId);
  const [selectedAura, setSelectedAura] = useState<RunningAuraId>(initialAuraId);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(true);

  const [plazaUsers, setPlazaUsers] = useState<PlazaUserState[]>([]);
  const [chatMessages, setChatMessages] = useState<PlazaChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [discoMusicOn, setDiscoMusicOn] = useState(false);
  const [activeZone, setActiveZone] = useState<PlazaZoneId>('plaza');
  const [localPose, setLocalPose] = useState<PlazaAvatarPose>('stand');
  const [energy, setEnergy] = useState(82);
  const [mood, setMood] = useState(86);

  // Play Together Hotel Suite Decoration state
  const [suiteConfig, setSuiteConfig] = useState<HotelSuiteConfig>(() =>
    loadSuiteConfig(),
  );
  const [decorateOpen, setDecorateOpen] = useState(false);

  // Mini-games drawer state
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [activeGameTab, setActiveGameTab] = useState<
    'juggle' | 'dice' | 'penalty'
  >('juggle');

  // Mini-Game 1: Tâng Bóng Siêu Sao
  const [juggleBallY, setJuggleBallY] = useState(25);
  const [juggleScore, setJuggleScore] = useState(0);
  const [juggleBest, setJuggleBest] = useState(0);
  const [juggleActive, setJuggleActive] = useState(false);
  const [juggleFeedback, setJuggleFeedback] = useState(
    'Nhấn "Tâng Ngay!" khi bóng rơi vào vùng xanh lá!',
  );
  const juggleVelRef = useRef(0);
  const jugglePosRef = useRef(25);
  const juggleScoreRef = useRef(0);

  // Mini-Game 2: Xúc Xắc Ngôi Sao
  const [diceValues, setDiceValues] = useState<[number, number]>([6, 6]);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceStatus, setDiceStatus] = useState(
    'Tung xúc xắc cùng hội siêu sao VIP!',
  );

  // Mini-Game 3: Sút Penalty Arcade
  const [penStreak, setPenStreak] = useState(0);
  const [penResult, setPenResult] = useState<string>(
    'Chọn góc sút Trái / Giữa / Phải để thắng Thủ Môn Bot!',
  );
  const [penGkSide, setPenGkSide] = useState<'left' | 'center' | 'right'>(
    'center',
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Refs synced inside requestAnimationFrame
  const localPosRef = useRef({ x: 500, y: 325 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeZoneRef = useRef<PlazaZoneId>('plaza');
  const localPoseRef = useRef<PlazaAvatarPose>('stand');
  const pendingStationRef = useRef<HotelStation | null>(null);
  const suiteConfigRef = useRef<HotelSuiteConfig>(suiteConfig);
  const keysRef = useRef<Record<string, boolean>>({});
  const lastNetMoveRef = useRef(0);
  const usersRef = useRef<PlazaUserState[]>([]);
  const smoothUsersRef = useRef<
    Record<string, { x: number; y: number; vx: number; vy: number }>
  >({});

  activeZoneRef.current = activeZone;
  localPoseRef.current = localPose;
  suiteConfigRef.current = suiteConfig;

  useEffect(() => {
    usersRef.current = plazaUsers;
  }, [plazaUsers]);

  useEffect(() => {
    try {
      localStorage.setItem(SUITE_STORAGE_KEY, JSON.stringify(suiteConfig));
    } catch {
      // ignore storage errors
    }
  }, [suiteConfig]);

  // Sync defaults when opening
  useEffect(() => {
    if (!open) return;
    setSelectedKicker(initialKickerId);
    setSelectedSkin(initialSkinId);
    setSelectedAura(initialAuraId);
    setCharacterPickerOpen(true);
    setDecorateOpen(false);
  }, [open, initialKickerId, initialSkinId, initialAuraId]);

  // WebSocket event listener while Plaza is open
  useEffect(() => {
    if (!open) return;

    const unsub = onlineMatchClient.onEvent((ev) => {
      if (ev.type === 'plaza:state') {
        setPlazaUsers(ev.users);
      } else if (ev.type === 'plaza:history') {
        setChatMessages(ev.messages);
      } else if (ev.type === 'plaza:chat_message') {
        setChatMessages((prev) => {
          if (prev.some((m) => m.messageId === ev.message.messageId)) {
            return prev;
          }
          return [...prev.slice(-79), ev.message];
        });
      }
    });

    const startZone = isHotelInteriorZone(activeZoneRef.current)
      ? activeZoneRef.current
      : detectOutdoorZoneAt(localPosRef.current.x, localPosRef.current.y);
    onlineMatchClient.joinPlaza({
      kickerId: initialKickerId,
      skinId: initialSkinId,
      auraId: initialAuraId,
      zone: startZone,
      x: localPosRef.current.x,
      y: localPosRef.current.y,
    });

    return () => {
      unsub();
      onlineMatchClient.leavePlaza();
      soundEngine.stopDiscoBeat();
      setDiscoMusicOn(false);
    };
  }, [open, initialKickerId, initialSkinId, initialAuraId]);

  // Scroll chat on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // WASD / Arrow movement keyboard handling
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysRef.current = {};
    };
  }, [open]);

  // Mini-game Juggle loop
  useEffect(() => {
    if (!open || !arcadeOpen || !juggleActive) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      juggleVelRef.current += 148 * dt;
      jugglePosRef.current += juggleVelRef.current * dt;
      if (jugglePosRef.current >= 100) {
        jugglePosRef.current = 100;
        setJuggleBallY(100);
        setJuggleActive(false);
        const finalScore = juggleScoreRef.current;
        setJuggleFeedback(
          finalScore >= 5
            ? `Rơi bóng! Chuỗi ${finalScore} lần tâng bóng cực mượt!`
            : 'Rơi bóng mất rồi! Nhấn Tâng Ngay để thử lại.',
        );
        if (finalScore >= 5) {
          onlineMatchClient.sendPlazaActivity(
            `vừa đạt chuỗi ${finalScore} lần tâng bóng ở Khu Mini-Game! ⚽🔥`,
            'arcade',
          );
        }
        return;
      }
      setJuggleBallY(jugglePosRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [open, arcadeOpen, juggleActive]);

  const applyStationAction = (st: HotelStation) => {
    if (st.nextZone) {
      const zMeta = ZONE_META[st.nextZone];
      localPosRef.current = { x: zMeta.spawnX, y: zMeta.spawnY };
      targetPosRef.current = null;
      pendingStationRef.current = null;
      activeZoneRef.current = st.nextZone;
      localPoseRef.current = 'stand';
      setActiveZone(st.nextZone);
      setLocalPose('stand');
      if (st.nextZone !== 'hotel_suite') {
        setDecorateOpen(false);
      }
      onlineMatchClient.moveInPlaza(
        zMeta.spawnX,
        zMeta.spawnY,
        st.nextZone,
        'stand',
      );
      onlineMatchClient.sendPlazaActivity(st.activityText, st.nextZone);
      return;
    }

    localPoseRef.current = st.pose;
    setLocalPose(st.pose);
    if (st.energyDelta !== 0) {
      setEnergy((e) => Math.max(0, Math.min(100, e + st.energyDelta)));
    }
    if (st.moodDelta !== 0) {
      setMood((m) => Math.max(0, Math.min(100, m + st.moodDelta)));
    }
    if (st.emote) {
      onlineMatchClient.sendPlazaEmote(st.emote);
    }
    onlineMatchClient.moveInPlaza(
      Math.round(localPosRef.current.x),
      Math.round(localPosRef.current.y),
      activeZoneRef.current,
      st.pose,
    );
    onlineMatchClient.sendPlazaActivity(st.activityText, activeZoneRef.current);
    soundEngine.unlock();
    if (st.pose === 'dance' && !discoMusicOn) {
      soundEngine.startDiscoBeat();
      setDiscoMusicOn(true);
    }
  };

  const applyStationActionRef = useRef(applyStationAction);
  applyStationActionRef.current = applyStationAction;

  // Main 60fps Resort + Play Together Hotel Interior Canvas Loop
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const roomZone = activeZoneRef.current;
      const inInterior = isHotelInteriorZone(roomZone);

      // 1. Update local player motion from WASD or Click-to-move
      const k = keysRef.current;
      let kx = 0;
      let ky = 0;
      if (k['KeyA'] || k['ArrowLeft']) kx -= 1;
      if (k['KeyD'] || k['ArrowRight']) kx += 1;
      if (k['KeyW'] || k['ArrowUp']) ky -= 1;
      if (k['KeyS'] || k['ArrowDown']) ky += 1;

      let moved = false;
      if (!characterPickerOpen && (kx !== 0 || ky !== 0)) {
        targetPosRef.current = null;
        pendingStationRef.current = null;
        if (localPoseRef.current !== 'stand') {
          localPoseRef.current = 'stand';
          setLocalPose('stand');
        }
        const len = Math.hypot(kx, ky);
        localPosRef.current.x = Math.max(
          34,
          Math.min(
            WORLD_W - 34,
            localPosRef.current.x + (kx / len) * 215 * dt,
          ),
        );
        localPosRef.current.y = Math.max(
          42,
          Math.min(
            WORLD_H - 34,
            localPosRef.current.y + (ky / len) * 215 * dt,
          ),
        );
        moved = true;
      } else if (targetPosRef.current) {
        const dx = targetPosRef.current.x - localPosRef.current.x;
        const dy = targetPosRef.current.y - localPosRef.current.y;
        const d = Math.hypot(dx, dy);
        if (d < 5) {
          targetPosRef.current = null;
          if (pendingStationRef.current) {
            const st = pendingStationRef.current;
            pendingStationRef.current = null;
            applyStationActionRef.current(st);
          }
        } else {
          const step = Math.min(d, 235 * dt);
          localPosRef.current.x += (dx / d) * step;
          localPosRef.current.y += (dy / d) * step;
          moved = true;
        }
      }

      const currentZone = inInterior
        ? roomZone
        : detectOutdoorZoneAt(localPosRef.current.x, localPosRef.current.y);
      if (!inInterior) {
        setActiveZone((prev) => (prev === currentZone ? prev : currentZone));
      }

      if (moved && now - lastNetMoveRef.current > 85) {
        lastNetMoveRef.current = now;
        onlineMatchClient.moveInPlaza(
          Math.round(localPosRef.current.x),
          Math.round(localPosRef.current.y),
          currentZone,
          localPoseRef.current,
        );
      }

      // 2. Render Scene (Outdoor Plaza OR Play Together Hotel Interior)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const t = now * 0.001;
        ctx.clearRect(0, 0, WORLD_W, WORLD_H);

        if (currentZone === 'hotel_lobby') {
          // ---- PLAY TOGETHER HOTEL FLOOR 1: SẢNH LỄ TÂN 5★ ----
          const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H);
          bg.addColorStop(0, '#221712');
          bg.addColorStop(1, '#120d0a');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);

          // Checkered Marble Tiles
          for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 20; col++) {
              ctx.fillStyle =
                (row + col) % 2 === 0
                  ? 'rgba(251, 191, 36, 0.07)'
                  : 'rgba(255, 255, 255, 0.03)';
              ctx.fillRect(col * 50, 75 + row * 46, 50, 46);
            }
          }

          // Top Wall & Golden Chandelier Glow
          ctx.fillStyle = '#2d1c14';
          ctx.fillRect(0, 0, WORLD_W, 78);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.strokeRect(20, 14, WORLD_W - 40, WORLD_H - 28);

          // Grand Red Carpet leading from Exit Door to Reception
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(435, 175, 130, 390);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.strokeRect(435, 175, 130, 390);

          // Reception Desk (Center Top)
          drawRoundedRect(ctx, 340, 88, 320, 85, 14);
          ctx.fillStyle = '#451a03';
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔑 QUẦY LỄ TÂN CHECK-IN VIP 5★', 500, 128);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '11px sans-serif';
          ctx.fillText('Bấm vào đây để nhận Chìa Khóa Suite 888', 500, 150);

          // Left Glass Elevator -> Rooftop Pool
          drawRoundedRect(ctx, 50, 86, 170, 118, 16);
          ctx.fillStyle = '#0c2a3e';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#bae6fd';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('🛗 THANG MÁY', 135, 128);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('Lên Hồ Bơi Sân Thượng', 135, 152);
          ctx.fillText('▲ Tầng Thượng', 135, 174);

          // Right Glass Elevator -> Suite 888
          drawRoundedRect(ctx, 780, 86, 170, 118, 16);
          ctx.fillStyle = '#2d1c0c';
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('🛗 THANG MÁY VIP', 865, 128);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('Về Phòng Suite 888', 865, 152);
          ctx.fillText('▲ Tầng VIP', 865, 174);

          // Lounge Sofas (Left & Right)
          drawRoundedRect(ctx, 85, 330, 190, 110, 16);
          ctx.fillStyle = '#4c1d95';
          ctx.fill();
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#f3e8ff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('☕ GHẾ CHỜ LOUNGE VIP', 180, 390);

          // Golden Indoor Fountain (Right)
          ctx.beginPath();
          ctx.arc(820, 385, 58, 0, Math.PI * 2);
          ctx.fillStyle = '#0369a1';
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(820, 385, 18 + ((t * 20) % 34), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('⛲ ĐÀI PHUN VÀNG', 820, 462);

          // Exit Door Bottom
          drawRoundedRect(ctx, 410, 535, 180, 62, 12);
          ctx.fillStyle = '#064e3b';
          ctx.fill();
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#a7f3d0';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('🚪 RA QUẢNG TRƯỜNG', 500, 571);

          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(
            '🏨 SẢNH LỄ TÂN KHÁCH SẠN 5★ PLAY TOGETHER',
            500,
            48,
          );
        } else if (currentZone === 'hotel_suite') {
          // ---- PLAY TOGETHER PERSONAL VIP SUITE 888 ----
          const sc = suiteConfigRef.current;
          const theme = SUITE_THEMES[sc.theme];

          ctx.fillStyle = theme.floorBg;
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);

          // Parquet / Resort Interior Floor Grid
          ctx.strokeStyle = theme.floorTile;
          ctx.lineWidth = 1.5;
          for (let gx = 40; gx < WORLD_W - 40; gx += 48) {
            ctx.beginPath();
            ctx.moveTo(gx, 78);
            ctx.lineTo(gx, WORLD_H - 20);
            ctx.stroke();
          }
          for (let gy = 78; gy < WORLD_H - 20; gy += 48) {
            ctx.beginPath();
            ctx.moveTo(24, gy);
            ctx.lineTo(WORLD_W - 24, gy);
            ctx.stroke();
          }

          // Top Wall & Panoramic Night City Skyline Balcony Window
          ctx.fillStyle = theme.wallBg;
          ctx.fillRect(0, 0, WORLD_W, 82);
          drawRoundedRect(ctx, 315, 12, 370, 58, 12);
          const nightSky = ctx.createLinearGradient(315, 12, 315, 70);
          nightSky.addColorStop(0, '#020617');
          nightSky.addColorStop(1, '#1e1b4b');
          ctx.fillStyle = nightSky;
          ctx.fill();
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2;
          ctx.stroke();
          // City window lights
          for (let b = 0; b < 11; b++) {
            const bx = 330 + b * 31;
            const bh = 18 + ((b * 13) % 24);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bx, 68 - bh, 22, bh);
            ctx.fillStyle = b % 2 === 0 ? '#fde047' : '#38bdf8';
            ctx.fillRect(bx + 5, 68 - bh + 5, 4, 4);
            ctx.fillRect(bx + 13, 68 - bh + 11, 4, 4);
          }
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `🏠 PHÒNG SUITE VIP 888 · ${username.toUpperCase()}`,
            500,
            30,
          );

          // Outer room border
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(20, 14, WORLD_W - 40, WORLD_H - 28);

          // Luxury Center Carpet
          drawRoundedRect(ctx, 290, 295, 420, 195, 22);
          ctx.fillStyle = theme.rugColor;
          ctx.globalAlpha = 0.55;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2;
          ctx.stroke();

          // 1. King Bed (Top Left)
          if (sc.furniture.bed) {
            drawRoundedRect(ctx, 68, 92, 220, 165, 18);
            ctx.fillStyle = '#3b2418';
            ctx.fill();
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
            // Mattress & Blankets
            drawRoundedRect(ctx, 86, 108, 184, 122, 12);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();
            drawRoundedRect(ctx, 86, 152, 184, 78, 10);
            ctx.fillStyle = '#be123c';
            ctx.fill();
            // Pillows
            drawRoundedRect(ctx, 98, 114, 74, 30, 8);
            ctx.fillStyle = '#fef3c7';
            ctx.fill();
            drawRoundedRect(ctx, 184, 114, 74, 30, 8);
            ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('🛏️ GIƯỜNG KING (Bấm để ngủ)', 178, 248);
          }

          // 2. Living Sofa + 85" 4K Football TV (Top Center)
          if (sc.furniture.tv_lounge) {
            // 85" Animated Match TV
            drawRoundedRect(ctx, 375, 96, 235, 58, 10);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            drawRoundedRect(ctx, 384, 103, 217, 44, 6);
            ctx.fillStyle = '#15803d';
            ctx.fill();
            const ballTvX = 492 + Math.sin(t * 2.5) * 78;
            ctx.beginPath();
            ctx.arc(ballTvX, 125, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('⚽ LIVE 4K CHAMPIONS TV', 492, 118);

            // Plush L-Sofa
            drawRoundedRect(ctx, 365, 200, 255, 80, 18);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('🛋️ SOFA XEM TV (Bấm để ngồi)', 492, 245);
          }

          // 3. VIP Bubbling Jacuzzi (Top Right)
          if (sc.furniture.jacuzzi) {
            drawRoundedRect(ctx, 710, 96, 225, 170, 22);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = '#7dd3fc';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            drawRoundedRect(ctx, 728, 114, 189, 122, 28);
            const jGrad = ctx.createRadialGradient(
              822,
              175,
              12,
              822,
              175,
              110,
            );
            jGrad.addColorStop(0, '#38bdf8');
            jGrad.addColorStop(1, '#0284c7');
            ctx.fillStyle = jGrad;
            ctx.fill();
            // Animated Jacuzzi Foam Bubbles
            for (let b = 0; b < 7; b++) {
              const bx = 755 + b * 22 + Math.sin(t * 3 + b) * 6;
              const by = 148 + ((b * 19 + Math.floor(t * 14)) % 56);
              ctx.beginPath();
              ctx.arc(bx, by, 5 + (b % 3) * 2, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,255,255,0.65)';
              ctx.fill();
            }
            ctx.fillStyle = '#bae6fd';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('🛁 BỒN JACUZZI (Bấm để tắm)', 822, 254);
          }

          // 4. Mini-Bar & Party Food Table (Bottom Right)
          if (sc.furniture.minibar) {
            drawRoundedRect(ctx, 715, 350, 220, 155, 18);
            ctx.fillStyle = '#2b1810';
            ctx.fill();
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = '24px sans-serif';
            ctx.fillText('🍕 🥂 🍔 🍰', 825, 422);
            ctx.fillStyle = '#fed7aa';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('🍹 MINI-BAR VIP (Bấm ăn tiệc)', 825, 476);
          }

          // 5. Disco Party Corner (Bottom Left)
          if (sc.furniture.disco_corner) {
            drawRoundedRect(ctx, 72, 355, 205, 150, 18);
            ctx.fillStyle = '#1e1038';
            ctx.fill();
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2;
            ctx.stroke();
            const pulseAlpha = 0.25 + 0.3 * Math.abs(Math.sin(t * 5));
            ctx.fillStyle = `rgba(236, 72, 153, ${pulseAlpha})`;
            ctx.beginPath();
            ctx.arc(174, 420, 44, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f9a8d4';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('🪩 GÓC PARTY DISCO', 174, 476);
          }

          // 6. Trophy Case & Palm Trees (Decorations)
          if (sc.furniture.trophy_case) {
            drawRoundedRect(ctx, 325, 425, 105, 76, 12);
            ctx.fillStyle = '#1f2937';
            ctx.fill();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.font = '22px sans-serif';
            ctx.fillText('🏆⚽🥇', 377, 466);
            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('TỦ CÚP VIP', 377, 490);
          }

          if (sc.furniture.palm_trees) {
            ctx.font = '28px sans-serif';
            ctx.fillText('🌴', 52, 118);
            ctx.fillText('🌴', 948, 118);
            ctx.fillText('🪴', 52, 560);
            ctx.fillText('🪴', 948, 560);
          }

          // Exit Door back to Lobby
          drawRoundedRect(ctx, 430, 542, 140, 56, 12);
          ctx.fillStyle = '#451a03';
          ctx.fill();
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('🛗 VỀ SẢNH KS', 500, 575);
        } else if (currentZone === 'hotel_rooftop') {
          // ---- PLAY TOGETHER ROOFTOP INFINITY POOL & SKY BAR ----
          const skyGrad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
          skyGrad.addColorStop(0, '#091534');
          skyGrad.addColorStop(0.45, '#132448');
          skyGrad.addColorStop(1, '#1e293b');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);

          // Rooftop Wooden Deck
          drawRoundedRect(ctx, 28, 74, WORLD_W - 56, WORLD_H - 96, 22);
          ctx.fillStyle = '#3f2e21';
          ctx.fill();
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // City Skyline Stars along top rail
          for (let s = 0; s < 24; s++) {
            const sx = 50 + s * 40;
            const sy = 26 + ((s * 17) % 34);
            ctx.fillStyle =
              Math.sin(t * 2 + s) > 0 ? '#fde047' : 'rgba(255,255,255,0.6)';
            ctx.fillRect(sx, sy, 3, 3);
          }
          ctx.fillStyle = '#bae6fd';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            '🏊 HỒ BƠI VÔ CỰC SÂN THƯỢNG & SKY BAR 5★',
            500,
            50,
          );

          // Huge Infinity Pool
          drawRoundedRect(ctx, 195, 118, 610, 228, 24);
          const poolGrad = ctx.createLinearGradient(195, 118, 805, 346);
          poolGrad.addColorStop(0, '#0284c7');
          poolGrad.addColorStop(0.5, '#0ea5e9');
          poolGrad.addColorStop(1, '#0d9488');
          ctx.fillStyle = poolGrad;
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255,255,255,0.32)';
          ctx.lineWidth = 2;
          for (let w = 0; w < 6; w++) {
            const wy = 152 + w * 32;
            ctx.beginPath();
            ctx.moveTo(222 + Math.sin(t * 2 + w) * 14, wy);
            ctx.quadraticCurveTo(
              500,
              wy + Math.cos(t * 3 + w) * 8,
              778 + Math.sin(t * 2 + w) * 14,
              wy,
            );
            ctx.stroke();
          }
          ctx.fillStyle = '#f0f9ff';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('💦 BẤM VÀO HỒ ĐỂ BƠI CÙNG MỌI NGƯỜI', 500, 326);

          // Sun Loungers Left
          drawRoundedRect(ctx, 68, 392, 190, 120, 16);
          ctx.fillStyle = '#7c2d12';
          ctx.fill();
          ctx.strokeStyle = '#fdba74';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffedd5';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('😎 GHẾ TẮM NẮNG VIP', 163, 456);

          // Sky Bar Right
          drawRoundedRect(ctx, 732, 382, 205, 135, 16);
          ctx.fillStyle = '#311042';
          ctx.fill();
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = '24px sans-serif';
          ctx.fillText('🍹 🍸 🎶', 835, 438);
          ctx.fillStyle = '#f5d0fe';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('🍸 SKY BAR SÂN THƯỢNG', 835, 486);

          // Elevator back to Suite
          drawRoundedRect(ctx, 410, 535, 180, 62, 12);
          ctx.fillStyle = '#2d1c0c';
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('🏠 VỀ PHÒNG SUITE 888', 500, 571);
        } else {
          // ---- OUTDOOR RESORT MAP (PLAZA + DISCO + HOTEL ENTRANCE + ARCADE) ----
          const bgGrad = ctx.createLinearGradient(0, 0, WORLD_W, WORLD_H);
          bgGrad.addColorStop(0, '#09111f');
          bgGrad.addColorStop(0.5, '#0c182a');
          bgGrad.addColorStop(1, '#08131d');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);

          // Connecting golden resort boulevards
          ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
          ctx.fillRect(190, 260, 620, 62);
          ctx.fillRect(462, 160, 76, 360);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.16)';
          ctx.lineWidth = 2;
          ctx.strokeRect(190, 260, 620, 62);

          // ZONE 1: SÀN NHẢY DISCO CLUB
          drawRoundedRect(ctx, 20, 18, 355, 350, 22);
          ctx.fillStyle = '#140b29';
          ctx.fill();
          ctx.strokeStyle =
            currentZone === 'disco' ? '#ec4899' : 'rgba(236,72,153,0.4)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          const beat = Math.floor(t * 2.4);
          const discoPalette = [
            '#ec4899',
            '#8b5cf6',
            '#06b6d4',
            '#f59e0b',
            '#10b981',
          ];
          for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 6; col++) {
              const tileX = 52 + col * 48;
              const tileY = 108 + row * 44;
              const colorIdx = (row + col + beat) % discoPalette.length;
              const pulse =
                0.25 + 0.32 * Math.abs(Math.sin(t * 5 + row * 0.8 + col));
              ctx.fillStyle = discoPalette[colorIdx];
              ctx.globalAlpha = pulse;
              drawRoundedRect(ctx, tileX, tileY, 44, 40, 6);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;

          const ballCx = 196;
          const ballCy = 66;
          ctx.save();
          for (let r = 0; r < 6; r++) {
            const ang = t * 1.1 + (r * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(ballCx, ballCy);
            ctx.lineTo(
              ballCx + Math.cos(ang) * 155,
              ballCy + Math.abs(Math.sin(ang)) * 185,
            );
            ctx.lineTo(
              ballCx + Math.cos(ang + 0.18) * 155,
              ballCy + Math.abs(Math.sin(ang + 0.18)) * 185,
            );
            ctx.closePath();
            ctx.fillStyle =
              r % 2 === 0
                ? 'rgba(236,72,153,0.12)'
                : 'rgba(56,189,248,0.11)';
            ctx.fill();
          }
          ctx.restore();
          const discoGrad = ctx.createRadialGradient(
            ballCx - 5,
            ballCy - 5,
            2,
            ballCx,
            ballCy,
            19,
          );
          discoGrad.addColorStop(0, '#ffffff');
          discoGrad.addColorStop(0.55, '#cbd5e1');
          discoGrad.addColorStop(1, '#475569');
          ctx.fillStyle = discoGrad;
          ctx.beginPath();
          ctx.arc(ballCx, ballCy, 18, 0, Math.PI * 2);
          ctx.fill();

          drawRoundedRect(ctx, 130, 34, 132, 22, 8);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#f9a8d4';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('💃 SÀN NHẢY DISCO VIP', 34, 38);

          // ZONE 2: KHÁCH SẠN PLAY TOGETHER 5★ (Outdoor Portal Building)
          drawRoundedRect(ctx, 625, 18, 355, 365, 22);
          ctx.fillStyle = '#1b1612';
          ctx.fill();
          ctx.strokeStyle =
            currentZone === 'hotel' ? '#fbbf24' : 'rgba(245,158,11,0.45)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          drawRoundedRect(ctx, 646, 58, 314, 304, 16);
          ctx.fillStyle = '#291e16';
          ctx.fill();
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
          ctx.stroke();

          // Red Carpet + Golden Double Doors
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(774, 180, 58, 178);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.strokeRect(774, 180, 58, 178);

          drawRoundedRect(ctx, 738, 86, 130, 86, 12);
          ctx.fillStyle = '#78350f';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚪 VÀO KHÁCH SẠN', 803, 124);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('Lobby · Suite · Hồ Bơi', 803, 148);

          ctx.fillStyle = '#fcd34d';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('🏨 KHÁCH SẠN 5★ PLAY TOGETHER', 642, 42);

          // ZONE 3: QUẢNG TRƯỜNG DANH VỌNG
          ctx.beginPath();
          ctx.arc(500, 240, 102, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx.fill();
          ctx.strokeStyle =
            currentZone === 'plaza' ? '#10b981' : 'rgba(16,185,129,0.38)';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(500, 215, 42, 0, Math.PI * 2);
          ctx.fillStyle = '#0369a1';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.stroke();
          const rippleR = 14 + ((t * 22) % 24);
          ctx.beginPath();
          ctx.arc(500, 215, rippleR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(224,242,254,0.65)';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#6ee7b7';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⭐ QUẢNG TRƯỜNG DANH VỌNG', 500, 126);

          // ZONE 4: KHU MINI-GAME SIÊU SAO
          drawRoundedRect(ctx, 275, 422, 450, 180, 22);
          ctx.fillStyle = '#0b192e';
          ctx.fill();
          ctx.strokeStyle =
            currentZone === 'arcade' ? '#38bdf8' : 'rgba(56,189,248,0.4)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          const stations = [
            { x: 350, title: '⚽ Tâng Bóng', color: '#10b981' },
            { x: 500, title: '🎲 Xúc Xắc VIP', color: '#f59e0b' },
            { x: 650, title: '🥅 Penalty Mini', color: '#ec4899' },
          ];
          stations.forEach((st) => {
            drawRoundedRect(ctx, st.x - 58, 464, 116, 56, 12);
            ctx.fillStyle = '#111827';
            ctx.fill();
            ctx.strokeStyle = st.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(st.title, st.x, 496);
          });
          ctx.fillStyle = '#7dd3fc';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎮 KHU MINI-GAME GIẢI TRÍ', 500, 448);
        }

        // 3. Click destination marker
        if (targetPosRef.current) {
          ctx.beginPath();
          ctx.arc(
            targetPosRef.current.x,
            targetPosRef.current.y,
            10 + Math.sin(t * 8) * 3,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 4. Filter & Render Connected Players in the CURRENT Room View
        const nowMs = Date.now();
        const visibleUsers = usersRef.current.filter((u) => {
          if (u.playerId === playerId) return true;
          if (inInterior) return u.zone === currentZone;
          return !isHotelInteriorZone(u.zone);
        });

        const renderList = visibleUsers.map((u) => {
          const isMe = u.playerId === playerId;
          const targetX = isMe ? localPosRef.current.x : u.x;
          const targetY = isMe ? localPosRef.current.y : u.y;
          const prev = smoothUsersRef.current[u.playerId] ?? {
            x: targetX,
            y: targetY,
            vx: 0,
            vy: 0,
          };
          const nextX = isMe
            ? targetX
            : prev.x + (targetX - prev.x) * Math.min(1, dt * 10);
          const nextY = isMe
            ? targetY
            : prev.y + (targetY - prev.y) * Math.min(1, dt * 10);
          const speed =
            Math.hypot(nextX - prev.x, nextY - prev.y) / Math.max(0.001, dt);
          smoothUsersRef.current[u.playerId] = {
            x: nextX,
            y: nextY,
            vx: nextX - prev.x,
            vy: nextY - prev.y,
          };
          return {
            ...u,
            pose: isMe ? localPoseRef.current : u.pose ?? 'stand',
            renderX: nextX,
            renderY: nextY,
            speed,
            isMe,
          };
        });

        if (!renderList.some((u) => u.isMe)) {
          renderList.push({
            playerId,
            username,
            kickerId: selectedKicker,
            skinId: selectedSkin,
            auraId: selectedAura,
            zone: currentZone,
            x: localPosRef.current.x,
            y: localPosRef.current.y,
            pose: localPoseRef.current,
            emote: null,
            emoteUntilMs: 0,
            bubbleText: null,
            bubbleUntilMs: 0,
            joinedAtMs: nowMs,
            renderX: localPosRef.current.x,
            renderY: localPosRef.current.y,
            speed: moved ? 180 : 0,
            isMe: true,
          });
        }

        renderList.sort((a, b) => a.renderY - b.renderY);

        renderList.forEach((u) => {
          const kicker =
            KICKER_PROFILES[(u.kickerId as KickerId) || 'ronaldo'] ??
            KICKER_PROFILES.ronaldo;
          const skin =
            PLAYER_SKINS[(u.skinId as PlayerSkinId) || 'default'] ??
            PLAYER_SKINS.default;
          const aura =
            RUNNING_AURAS[(u.auraId as RunningAuraId) || 'emerald_wind'] ??
            RUNNING_AURAS.emerald_wind;
          const jerseyColor =
            u.skinId && u.skinId !== 'default'
              ? skin.jerseyColor
              : kicker.jerseyColor;
          const accentColor =
            u.skinId && u.skinId !== 'default'
              ? skin.accentColor
              : kicker.jerseyAccent;
          const skinTone = hexFromNumber(kicker.skinColor);
          const hairTone = hexFromNumber(kicker.hairColor);

          const pose = u.pose ?? 'stand';
          const isDancing =
            pose === 'dance' ||
            (u.emoteUntilMs > nowMs &&
              (u.emote?.includes('Disco') || u.emote?.includes('Moonwalk'))) ||
            u.zone === 'disco';

          const bob =
            pose === 'sleep' || pose === 'sit' || pose === 'bath'
              ? 0
              : pose === 'swim'
              ? Math.sin(t * 4.5 + u.renderX * 0.05) * 2.5
              : isDancing
              ? Math.abs(Math.sin(t * 7.5 + u.renderX * 0.05)) * 5
              : u.speed > 18
              ? Math.abs(Math.sin(t * 11)) * 4
              : Math.sin(t * 2.5) * 1.2;
          const sway = isDancing
            ? Math.sin(t * 6.5 + u.renderY * 0.05) * 4
            : 0;

          const px = u.renderX + sway;
          const py = u.renderY - bob;

          if (aura.id !== 'none' && pose !== 'sleep') {
            ctx.beginPath();
            ctx.ellipse(
              u.renderX,
              u.renderY + 14,
              21,
              9,
              0,
              0,
              Math.PI * 2,
            );
            ctx.strokeStyle = aura.hexColor;
            ctx.lineWidth = u.isMe ? 2.5 : 1.8;
            ctx.globalAlpha = 0.72;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          if (pose === 'bath' || pose === 'swim') {
            // Water ripples + foam ring
            ctx.beginPath();
            ctx.ellipse(px, py + 4, 22 + Math.sin(t * 4) * 3, 9, 0, 0, Math.PI * 2);
            ctx.strokeStyle =
              pose === 'bath'
                ? 'rgba(255,255,255,0.85)'
                : 'rgba(186,230,253,0.85)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Submerged chest-up torso + head
            drawRoundedRect(ctx, px - 10, py - 10, 20, 14, 6);
            ctx.fillStyle = skinTone;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py - 18, 9.5, 0, Math.PI * 2);
            ctx.fillStyle = skinTone;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py - 21, 9.2, Math.PI, Math.PI * 2);
            ctx.fillStyle = hairTone;
            ctx.fill();

            if (pose === 'bath') {
              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.beginPath();
              ctx.arc(px - 14, py - 2 + Math.sin(t * 3) * 3, 4, 0, Math.PI * 2);
              ctx.arc(px + 15, py - 4 + Math.cos(t * 3.2) * 3, 3.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (pose === 'sleep') {
            // Sleeping horizontally tucked on pillow + floating Zzz
            ctx.save();
            ctx.translate(px, py - 2);
            ctx.rotate(-Math.PI / 2);

            drawRoundedRect(ctx, -10, -14, 20, 22, 6);
            ctx.fillStyle = jerseyColor;
            ctx.fill();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, -22, 9, 0, Math.PI * 2);
            ctx.fillStyle = skinTone;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -25, 8.8, Math.PI, Math.PI * 2);
            ctx.fillStyle = hairTone;
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            const zOff = (t * 16) % 16;
            ctx.fillText('Z', px + 18, py - 18 - zOff);
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('z', px + 26, py - 26 - zOff * 0.7);
          } else {
            // Stand / Sit / Dance
            ctx.beginPath();
            ctx.ellipse(u.renderX, u.renderY + 14, 14, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.48)';
            ctx.fill();

            const legSwing =
              pose === 'sit'
                ? 0
                : u.speed > 18
                ? Math.sin(t * 14) * 5
                : isDancing
                ? Math.sin(t * 7) * 4
                : 0;
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (pose === 'sit') {
              ctx.moveTo(px - 5, py + 4);
              ctx.lineTo(px - 10, py + 11);
              ctx.moveTo(px + 5, py + 4);
              ctx.lineTo(px + 10, py + 11);
            } else {
              ctx.moveTo(px - 5, py + 2);
              ctx.lineTo(px - 6 - legSwing * 0.4, py + 13);
              ctx.moveTo(px + 5, py + 2);
              ctx.lineTo(px + 6 + legSwing * 0.4, py + 13);
            }
            ctx.stroke();

            const sitOffset = pose === 'sit' ? 4 : 0;
            drawRoundedRect(ctx, px - 11, py - 13 + sitOffset, 22, 18, 6);
            ctx.fillStyle = jerseyColor;
            ctx.fill();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = accentColor;
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(kicker.numberStr, px, py - 1 + sitOffset);

            const armRaise =
              isDancing || u.emoteUntilMs > nowMs
                ? -10 - Math.sin(t * 8) * 5
                : 4;
            ctx.strokeStyle = skinTone;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(px - 11, py - 9 + sitOffset);
            ctx.lineTo(px - 17, py - 6 + armRaise + sitOffset);
            ctx.moveTo(px + 11, py - 9 + sitOffset);
            ctx.lineTo(px + 17, py - 6 + armRaise + sitOffset);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(px, py - 21 + sitOffset, 9.5, 0, Math.PI * 2);
            ctx.fillStyle = skinTone;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py - 24 + sitOffset, 9.2, Math.PI, Math.PI * 2);
            ctx.fillStyle = hairTone;
            ctx.fill();
          }

          if (u.isMe) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▼ BẠN', px, py - 35);
          }

          const tagText = `${u.username} (${kicker.shortName})`;
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          const tw = ctx.measureText(tagText).width + 14;
          drawRoundedRect(ctx, px - tw / 2, py + 18, tw, 18, 6);
          ctx.fillStyle = u.isMe
            ? 'rgba(6, 78, 59, 0.92)'
            : 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.strokeStyle = u.isMe ? '#34d399' : 'rgba(148,163,184,0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(tagText, px, py + 31);

          if (u.emote && u.emoteUntilMs > nowMs) {
            ctx.font = 'bold 11px sans-serif';
            const ew = ctx.measureText(u.emote).width + 14;
            drawRoundedRect(ctx, px - ew / 2, py - 56, ew, 18, 9);
            ctx.fillStyle = 'rgba(236, 72, 153, 0.92)';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(u.emote, px, py - 43);
          }

          if (u.bubbleText && u.bubbleUntilMs > nowMs) {
            ctx.font = '600 11px sans-serif';
            const snippet =
              u.bubbleText.length > 34
                ? `${u.bubbleText.slice(0, 33)}…`
                : u.bubbleText;
            const bw = ctx.measureText(snippet).width + 16;
            const by = u.emote && u.emoteUntilMs > nowMs ? py - 80 : py - 58;
            drawRoundedRect(ctx, px - bw / 2, by, bw, 21, 8);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillText(snippet, px, by + 14);
          }
        });
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [
    open,
    characterPickerOpen,
    playerId,
    username,
    selectedKicker,
    selectedSkin,
    selectedAura,
    discoMusicOn,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(
      34,
      Math.min(WORLD_W - 34, ((e.clientX - rect.left) / rect.width) * WORLD_W),
    );
    const y = Math.max(
      42,
      Math.min(WORLD_H - 34, ((e.clientY - rect.top) / rect.height) * WORLD_H),
    );

    if (isHotelInteriorZone(activeZone)) {
      const stations = getStationsForInterior(activeZone, suiteConfig);
      const hit = stations.find(
        (st) => x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h,
      );
      if (hit) {
        pendingStationRef.current = hit;
        targetPosRef.current = { x: hit.targetX, y: hit.targetY };
        setLocalPose('stand');
        localPoseRef.current = 'stand';
        return;
      }
      pendingStationRef.current = null;
      setLocalPose('stand');
      localPoseRef.current = 'stand';
      targetPosRef.current = { x, y };
      return;
    }

    // Outdoor map interactions
    if (x > 730 && x < 875 && y > 80 && y < 185) {
      // Clicked Hotel Golden Double Doors -> enter Hotel Lobby
      teleportToZone('hotel_lobby');
      return;
    }

    setLocalPose('stand');
    localPoseRef.current = 'stand';
    targetPosRef.current = { x, y };
    const nextZone = detectOutdoorZoneAt(x, y);
    if (nextZone === 'arcade' && y > 455 && y < 535) {
      setArcadeOpen(true);
    }
  };

  const teleportToZone = (zoneId: PlazaZoneId) => {
    const z = ZONE_META[zoneId];
    localPosRef.current = { x: z.spawnX, y: z.spawnY };
    targetPosRef.current = null;
    pendingStationRef.current = null;
    activeZoneRef.current = zoneId;
    localPoseRef.current = 'stand';
    setActiveZone(zoneId);
    setLocalPose('stand');
    if (zoneId !== 'hotel_suite') {
      setDecorateOpen(false);
    }
    if (zoneId === 'hotel_suite' || zoneId === 'hotel_lobby') {
      onlineMatchClient.sendPlazaActivity(
        zoneId === 'hotel_suite'
          ? 'vừa về Phòng Suite VIP 888 tại Khách Sạn Play Together! 🏠✨'
          : 'vừa bước vào Sảnh Lễ Tân Khách Sạn 5★! 🏨✨',
        zoneId,
      );
    }
    onlineMatchClient.moveInPlaza(z.spawnX, z.spawnY, zoneId, 'stand');
    if (zoneId === 'arcade') {
      setArcadeOpen(true);
    }
  };

  const triggerHotelQuickStation = (
    targetZone: PlazaZoneId,
    stationId: string,
  ) => {
    if (activeZone !== targetZone) {
      teleportToZone(targetZone);
    }
    const stations = getStationsForInterior(targetZone, suiteConfig);
    const st = stations.find((item) => item.id === stationId);
    if (!st) return;
    localPosRef.current = { x: st.targetX, y: st.targetY };
    targetPosRef.current = null;
    pendingStationRef.current = null;
    applyStationAction(st);
  };

  const toggleSuiteFurniture = (key: SuiteFurnitureKey) => {
    setSuiteConfig((prev) => ({
      ...prev,
      furniture: {
        ...prev.furniture,
        [key]: !prev.furniture[key],
      },
    }));
  };

  const confirmCharacter = () => {
    setCharacterPickerOpen(false);
    onlineMatchClient.updatePlazaAvatar(
      selectedKicker,
      selectedSkin,
      selectedAura,
    );
  };

  const sendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onlineMatchClient.sendPlazaChat(trimmed);
    setChatInput('');
  };

  const toggleDiscoMusic = () => {
    soundEngine.unlock();
    if (discoMusicOn) {
      soundEngine.stopDiscoBeat();
      setDiscoMusicOn(false);
    } else {
      soundEngine.startDiscoBeat();
      setDiscoMusicOn(true);
    }
  };

  const triggerEmote = (emoteText: string) => {
    onlineMatchClient.sendPlazaEmote(emoteText);
    if (emoteText.includes('Disco') && !discoMusicOn) {
      soundEngine.unlock();
      soundEngine.startDiscoBeat();
      setDiscoMusicOn(true);
    }
    if (emoteText.includes('Suite')) {
      teleportToZone('hotel_suite');
    }
  };

  // Mini-Game Handlers
  const startJuggle = () => {
    juggleScoreRef.current = 0;
    jugglePosRef.current = 20;
    juggleVelRef.current = 5;
    setJuggleScore(0);
    setJuggleBallY(20);
    setJuggleActive(true);
    setJuggleFeedback('Canh bóng rơi xuống vùng 58% - 88% rồi bấm Tâng!');
  };

  const handleJuggleKick = () => {
    if (!juggleActive) {
      startJuggle();
      return;
    }
    const y = jugglePosRef.current;
    if (y >= 46 && y <= 94) {
      juggleScoreRef.current += 1;
      const next = juggleScoreRef.current;
      setJuggleScore(next);
      setJuggleBest((prev) => Math.max(prev, next));
      juggleVelRef.current = -(98 + Math.min(48, next * 2.5));
      soundEngine.unlock();
      soundEngine.playKick(0.45);
      setJuggleFeedback(
        y >= 64 && y <= 84
          ? `HOÀN HẢO! Combo x${next} 🔥`
          : `Tâng đẹp! Combo x${next} ⚽`,
      );
    } else {
      setJuggleFeedback('Chạm hụt nhịp! Đợi bóng rơi xuống vùng xanh lá.');
    }
  };

  const rollVipDice = () => {
    if (diceRolling) return;
    setDiceRolling(true);
    soundEngine.unlock();
    soundEngine.playSkillWhip();
    setTimeout(() => {
      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      setDiceValues([d1, d2]);
      setDiceRolling(false);
      const sum = d1 + d2;
      if (d1 === d2 || sum >= 11) {
        const msg =
          d1 === 6 && d2 === 6
            ? 'DOUBLE LỤC 12 ĐIỂM SIÊU VIP!'
            : `Đôi ${d1}-${d2} (${sum} điểm)!`;
        setDiceStatus(`🎉 ${msg}`);
        onlineMatchClient.sendPlazaActivity(
          `tung xúc xắc đạt ${msg} 🎲✨`,
          'arcade',
        );
      } else {
        setDiceStatus(`Bạn tung được ${d1} + ${d2} = ${sum} điểm.`);
      }
    }, 360);
  };

  const shootMiniPenalty = (corner: 'left' | 'center' | 'right') => {
    const dirs: Array<'left' | 'center' | 'right'> = [
      'left',
      'center',
      'right',
    ];
    const gkDir = dirs[Math.floor(Math.random() * dirs.length)];
    setPenGkSide(gkDir);
    soundEngine.unlock();
    soundEngine.playKick(0.7);
    if (gkDir === corner) {
      soundEngine.playGloveSave();
      setPenResult(
        `Thủ môn bay ${
          gkDir === 'left' ? 'Trái' : gkDir === 'right' ? 'Phải' : 'Giữa'
        } cản phá! Chuỗi về 0.`,
      );
      setPenStreak(0);
    } else {
      const next = penStreak + 1;
      setPenStreak(next);
      soundEngine.playCrowdCheer();
      setPenResult(
        `VÀO GÓC ${
          corner === 'left' ? 'TRÁI' : corner === 'right' ? 'PHẢI' : 'GIỮA'
        }! Chuỗi ${next} bàn liên tiếp!`,
      );
      if (next % 3 === 0) {
        onlineMatchClient.sendPlazaActivity(
          `đang lập chuỗi ${next} bàn Penalty Mini không trượt phát nào! 🥅👑`,
          'arcade',
        );
      }
    }
  };

  const activeKickerProfile = useMemo(
    () => KICKER_PROFILES[selectedKicker],
    [selectedKicker],
  );
  const inHotelInterior = isHotelInteriorZone(activeZone);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-2 sm:p-4">
      <div className="relative flex h-[94vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#090f1b] text-slate-100 shadow-2xl">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0d1628] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-amber-500 shadow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide text-white sm:text-base">
                KHU CHAT & GIẢI TRÍ ONLINE — SIÊU SAO RESORT
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-300/90">
                <span>
                  Hóa thân:{' '}
                  <span className="font-bold text-amber-300">
                    {activeKickerProfile.name}
                  </span>
                </span>
                <span>·</span>
                <span>
                  Khu:{' '}
                  <span className="font-bold text-white">
                    {ZONE_META[activeZone].label}
                  </span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Zap className="h-3 w-3" /> {energy}%
                </span>
                <span className="inline-flex items-center gap-1 text-pink-300 font-bold">
                  <Smile className="h-3 w-3" /> {mood}%
                </span>
              </div>
            </div>
          </div>

          {/* Zone Quick Teleporters + Prominent "Về Khách Sạn" */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => teleportToZone('hotel_suite')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                inHotelInterior
                  ? 'border-amber-300 bg-amber-400 text-slate-950 shadow'
                  : 'border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/35'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Về Khách Sạn</span>
            </button>

            {(
              [
                { id: 'plaza' as const, icon: MapPin, label: 'Quảng Trường' },
                { id: 'disco' as const, icon: Disc3, label: 'Sàn Nhảy Disco' },
                { id: 'arcade' as const, icon: Gamepad2, label: 'Mini-Game' },
              ] as const
            ).map((z) => {
              const Icon = z.icon;
              const isAct = activeZone === z.id;
              return (
                <button
                  key={z.id}
                  onClick={() => teleportToZone(z.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isAct
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{z.label}</span>
                </button>
              );
            })}

            <button
              onClick={toggleDiscoMusic}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                discoMusicOn
                  ? 'border-pink-400 bg-pink-500/25 text-pink-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {discoMusicOn ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>{discoMusicOn ? 'Tắt Nhạc' : 'Nhạc Disco'}</span>
            </button>

            <button
              onClick={() => setCharacterPickerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Đổi Nhân Vật</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* Left: Interactive Resort / Play Together Hotel Canvas */}
          <div className="relative flex min-h-0 flex-col bg-[#070d18]">
            {/* Hotel Play Together Floor Bar (Visible when near/inside Hotel) */}
            {(inHotelInterior || activeZone === 'hotel') && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/25 bg-[#1a130d] px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 mr-1">
                    <Hotel className="h-3.5 w-3.5" />
                    KHÁCH SẠN 5★:
                  </span>
                  {(
                    [
                      { id: 'hotel_lobby' as const, label: 'Tầng 1: Sảnh Lễ Tân' },
                      {
                        id: 'hotel_suite' as const,
                        label: 'Tầng VIP: Phòng Suite 888',
                      },
                      {
                        id: 'hotel_rooftop' as const,
                        label: 'Tầng Thượng: Hồ Bơi',
                      },
                    ] as const
                  ).map((fl) => (
                    <button
                      key={fl.id}
                      onClick={() => teleportToZone(fl.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition cursor-pointer ${
                        activeZone === fl.id
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-amber-100 hover:bg-white/20'
                      }`}
                    >
                      {fl.label}
                    </button>
                  ))}
                  {inHotelInterior && (
                    <button
                      onClick={() => teleportToZone('plaza')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <DoorOpen className="h-3.5 w-3.5" />
                      <span>Ra Quảng Trường</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {activeZone === 'hotel_suite' && (
                    <button
                      onClick={() => setDecorateOpen((v) => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-extrabold cursor-pointer ${
                        decorateOpen
                          ? 'border-sky-300 bg-sky-400 text-slate-950'
                          : 'border-sky-400/45 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                      }`}
                    >
                      <Paintbrush className="h-3.5 w-3.5" />
                      <span>Trang Trí Phòng</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onlineMatchClient.sendPlazaActivity(
                        'đang mở tiệc tại Phòng Suite 888 Khách Sạn 5★ — bấm "Về Khách Sạn" để ghé chơi! 🏨🎉',
                        'hotel_suite',
                      );
                    }}
                    className="rounded-lg bg-pink-500/25 border border-pink-400/45 px-2.5 py-1 text-xs font-bold text-pink-200 hover:bg-pink-500/35 cursor-pointer"
                  >
                    🎉 Mời Bạn Về KS
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex-1 overflow-hidden p-2 sm:p-3">
              <canvas
                ref={canvasRef}
                width={WORLD_W}
                height={WORLD_H}
                onClick={handleCanvasClick}
                className="h-full w-full cursor-crosshair rounded-xl border border-white/10 bg-[#080f1d] object-contain shadow-inner"
              />

              {/* Controls Hint */}
              <div className="pointer-events-none absolute left-5 top-5 rounded-lg border border-white/10 bg-slate-950/85 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {inHotelInterior
                  ? 'Bấm trực tiếp vào Giường / Sofa TV / Bồn Jacuzzi / Mini-Bar / Hồ Bơi hoặc di chuyển WASD!'
                  : 'Click bản đồ hoặc WASD di chuyển · Bấm vào Cửa Khách Sạn để vào Phòng Suite'}
              </div>

              {/* Quick Enter Hotel prompt when standing at outdoor Hotel entrance */}
              {activeZone === 'hotel' && (
                <button
                  onClick={() => teleportToZone('hotel_suite')}
                  className="absolute left-1/2 bottom-6 -translate-x-1/2 flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-xl hover:bg-amber-300 cursor-pointer"
                >
                  <Home className="h-4 w-4" />
                  <span>Bấm Để Vào Phòng Suite & Sảnh Khách Sạn 5★ →</span>
                </button>
              )}

              {/* Floating Arcade Button outdoors */}
              {!inHotelInterior && (
                <button
                  onClick={() => setArcadeOpen((v) => !v)}
                  className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-600 px-3.5 py-2 text-xs font-black text-white shadow-lg hover:bg-sky-500 cursor-pointer"
                >
                  <Gamepad2 className="h-4 w-4" />
                  <span>
                    {arcadeOpen ? 'Đóng Mini-Game' : 'Mở Mini-Game Resort'}
                  </span>
                </button>
              )}
            </div>

            {/* Play Together Hotel Quick Action Bar when inside Hotel */}
            {inHotelInterior ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-400/25 bg-[#15100c] px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
                    Tương Tác KS:
                  </span>
                  {suiteConfig.furniture.bed && (
                    <button
                      onClick={() =>
                        triggerHotelQuickStation('hotel_suite', 'suite_bed')
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-100 hover:bg-amber-500/30 cursor-pointer"
                    >
                      <BedDouble className="h-3.5 w-3.5 text-amber-300" />
                      <span>Ngủ Giường King</span>
                    </button>
                  )}
                  {suiteConfig.furniture.tv_lounge && (
                    <button
                      onClick={() =>
                        triggerHotelQuickStation('hotel_suite', 'suite_sofa_tv')
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-100 hover:bg-sky-500/30 cursor-pointer"
                    >
                      <Tv className="h-3.5 w-3.5 text-sky-300" />
                      <span>Xem TV Sofa</span>
                    </button>
                  )}
                  {suiteConfig.furniture.jacuzzi && (
                    <button
                      onClick={() =>
                        triggerHotelQuickStation('hotel_suite', 'suite_jacuzzi')
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30 cursor-pointer"
                    >
                      <Bath className="h-3.5 w-3.5 text-cyan-300" />
                      <span>Tắm Jacuzzi</span>
                    </button>
                  )}
                  {suiteConfig.furniture.minibar && (
                    <button
                      onClick={() =>
                        triggerHotelQuickStation('hotel_suite', 'suite_minibar')
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-orange-400/35 bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-100 hover:bg-orange-500/30 cursor-pointer"
                    >
                      <Coffee className="h-3.5 w-3.5 text-orange-300" />
                      <span>Tiệc Mini-Bar</span>
                    </button>
                  )}
                  <button
                    onClick={() =>
                      triggerHotelQuickStation('hotel_rooftop', 'pool_swim')
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-teal-400/35 bg-teal-500/15 px-2.5 py-1 text-xs font-bold text-teal-100 hover:bg-teal-500/30 cursor-pointer"
                  >
                    <Waves className="h-3.5 w-3.5 text-teal-300" />
                    <span>Bơi Sân Thượng</span>
                  </button>
                  {localPose !== 'stand' && (
                    <button
                      onClick={() => {
                        setLocalPose('stand');
                        localPoseRef.current = 'stand';
                        onlineMatchClient.moveInPlaza(
                          Math.round(localPosRef.current.x),
                          Math.round(localPosRef.current.y),
                          activeZone,
                          'stand',
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
                    >
                      <Sofa className="h-3.5 w-3.5" />
                      <span>Đứng Dậy</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Users className="h-3.5 w-3.5" />
                  <span>{plazaUsers.length} người trong Resort</span>
                </div>
              </div>
            ) : (
              /* Bottom Emote & Quick Action Bar Outdoors */
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0d1526] px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Biểu cảm:
                  </span>
                  {QUICK_EMOTES.map((em) => (
                    <button
                      key={em.id}
                      onClick={() => triggerEmote(em.id)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:border-pink-400/40 hover:bg-pink-500/20 cursor-pointer"
                    >
                      <span>{em.icon}</span>
                      <span>{em.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Users className="h-3.5 w-3.5" />
                  <span>{plazaUsers.length} người đang trong Khu Giải Trí</span>
                </div>
              </div>
            )}

            {/* Suite Decoration Drawer (Play Together Customizer) */}
            {decorateOpen && activeZone === 'hotel_suite' && (
              <div className="absolute inset-x-4 bottom-16 z-20 mx-auto max-w-2xl rounded-2xl border border-amber-400/45 bg-[#121625] p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                    <Paintbrush className="h-4 w-4" />
                    <span>TRANG TRÍ PHÒNG SUITE KIỂU PLAY TOGETHER</span>
                  </div>
                  <button
                    onClick={() => setDecorateOpen(false)}
                    className="rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-rose-500/30 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                    1. Phong cách nội thất phòng:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(SUITE_THEMES) as SuiteThemeId[]).map((tid) => (
                      <button
                        key={tid}
                        onClick={() =>
                          setSuiteConfig((prev) => ({ ...prev, theme: tid }))
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-extrabold cursor-pointer ${
                          suiteConfig.theme === tid
                            ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {SUITE_THEMES[tid].name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                    2. Bật / Tắt đồ nội thất trong Phòng Suite 888:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      Object.keys(SUITE_FURNITURE_LABELS) as SuiteFurnitureKey[]
                    ).map((fkey) => {
                      const active = suiteConfig.furniture[fkey];
                      return (
                        <button
                          key={fkey}
                          onClick={() => toggleSuiteFurniture(fkey)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                            active
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {SUITE_FURNITURE_LABELS[fkey].icon}{' '}
                          {SUITE_FURNITURE_LABELS[fkey].label}{' '}
                          {active ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Mini-Games Drawer */}
            {arcadeOpen && (
              <div className="absolute inset-x-4 bottom-16 z-20 mx-auto max-w-2xl rounded-2xl border border-sky-400/40 bg-[#0d1729] p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-black text-white">
                      TRUNG TÂM MINI-GAME SIÊU SAO
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'juggle' as const, label: '⚽ Tâng Bóng' },
                        { id: 'dice' as const, label: '🎲 Xúc Xắc VIP' },
                        { id: 'penalty' as const, label: '🥅 Penalty Mini' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveGameTab(tab.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer ${
                          activeGameTab === tab.id
                            ? 'bg-sky-500 text-white'
                            : 'bg-white/10 text-slate-300 hover:bg-white/15'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setArcadeOpen(false)}
                      className="ml-1 rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-rose-500/30 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {activeGameTab === 'juggle' && (
                  <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[140px_1fr]">
                    <div className="relative mx-auto h-48 w-28 overflow-hidden rounded-xl border border-emerald-400/30 bg-slate-950">
                      <div
                        className="absolute inset-x-0 bg-emerald-500/25 border-y border-emerald-400/60"
                        style={{ top: '54%', height: '32%' }}
                      />
                      <div
                        className="absolute left-1/2 -translate-x-1/2 text-2xl transition-none"
                        style={{
                          top: `${Math.min(88, Math.max(4, juggleBallY))}%`,
                        }}
                      >
                        ⚽
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-emerald-300">
                          Điểm: {juggleScore}
                        </span>
                        <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-amber-300">
                          Kỷ lục: {juggleBest}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{juggleFeedback}</p>
                      <button
                        onClick={handleJuggleKick}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-black text-white shadow hover:brightness-110 cursor-pointer"
                      >
                        {juggleActive
                          ? 'TÂNG BÓNG NGAY! ⚽'
                          : 'BẮT ĐẦU TÂNG BÓNG'}
                      </button>
                    </div>
                  </div>
                )}

                {activeGameTab === 'dice' && (
                  <div className="space-y-3 text-center">
                    <div className="flex items-center justify-center gap-6 py-2">
                      {diceValues.map((val, idx) => (
                        <div
                          key={idx}
                          className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-slate-900 text-3xl font-black text-amber-300 shadow-lg"
                        >
                          {diceRolling ? '🎲' : val}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-amber-200">
                      {diceStatus}
                    </p>
                    <button
                      onClick={rollVipDice}
                      disabled={diceRolling}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-black text-white shadow hover:brightness-110 disabled:opacity-60 cursor-pointer"
                    >
                      {diceRolling
                        ? 'Đang lắc xúc xắc...'
                        : 'LẮC XÚC XẮC NGÔI SAO 🎲'}
                    </button>
                  </div>
                )}

                {activeGameTab === 'penalty' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                      <span className="text-xs font-bold text-sky-300">
                        Chuỗi ghi bàn:{' '}
                        <span className="text-base text-white">{penStreak}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Thủ môn Bot vừa bay:{' '}
                        <strong className="text-rose-300">
                          {penGkSide === 'left'
                            ? 'Trái'
                            : penGkSide === 'right'
                            ? 'Phải'
                            : 'Giữa'}
                        </strong>
                      </span>
                    </div>
                    <p className="text-xs font-medium text-emerald-200">
                      {penResult}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => shootMiniPenalty('left')}
                        className="rounded-xl bg-pink-600 py-2.5 text-xs font-black text-white hover:bg-pink-500 cursor-pointer"
                      >
                        ⬅️ Sút Góc Trái
                      </button>
                      <button
                        onClick={() => shootMiniPenalty('center')}
                        className="rounded-xl bg-sky-600 py-2.5 text-xs font-black text-white hover:bg-sky-500 cursor-pointer"
                      >
                        ⬆️ Sút Giữa
                      </button>
                      <button
                        onClick={() => shootMiniPenalty('right')}
                        className="rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        ➡️ Sút Góc Phải
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Online Room Roster + Live Real-Time Chat */}
          <div className="flex min-h-0 flex-col border-t border-white/10 bg-[#0b1322] lg:border-l lg:border-t-0">
            {/* Online Players Roster */}
            <div className="border-b border-white/10 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 text-pink-400" />
                  SIÊU SAO TRONG KHU ({plazaUsers.length})
                </span>
              </div>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {plazaUsers.map((u) => {
                  const k =
                    KICKER_PROFILES[(u.kickerId as KickerId) || 'ronaldo'] ??
                    KICKER_PROFILES.ronaldo;
                  const isSelf = u.playerId === playerId;
                  const zMeta = ZONE_META[u.zone] ?? ZONE_META.plaza;
                  return (
                    <button
                      key={u.playerId}
                      type="button"
                      onClick={() => {
                        if (!isSelf && u.zone !== activeZone) {
                          teleportToZone(u.zone);
                        }
                      }}
                      title={
                        !isSelf && u.zone !== activeZone
                          ? `Bấm để tới ${zMeta.label} cùng ${u.username}`
                          : zMeta.label
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                        isSelf
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-400/40'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: zMeta.color }}
                      />
                      <span className="font-bold">{u.username}</span>
                      <span className="text-slate-400">
                        · {k.shortName} ({zMeta.label})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Chat Stream */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-400">
                  Chào mừng đến Siêu Sao Resort! Bấm{' '}
                  <strong className="text-amber-300">Về Khách Sạn</strong> để
                  vào Phòng Suite 888 kiểu Play Together hoặc rủ bạn bè qua Sàn
                  Nhảy Disco!
                </div>
              )}
              {chatMessages.map((m) => {
                const k =
                  KICKER_PROFILES[(m.kickerId as KickerId) || 'ronaldo'] ??
                  KICKER_PROFILES.ronaldo;
                const isSelf = m.playerId === playerId;
                if (m.kind === 'activity') {
                  return (
                    <div
                      key={m.messageId}
                      className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200"
                    >
                      <span className="font-bold">{m.username}</span> (
                      {k.shortName}) {m.text}
                    </div>
                  );
                }
                return (
                  <div
                    key={m.messageId}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      isSelf
                        ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-50'
                        : 'border-white/10 bg-white/5 text-slate-100'
                    }`}
                  >
                    <div className="mb-0.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-amber-300">
                        {m.username} · {k.shortName}
                      </span>
                      <span>{ZONE_META[m.zone]?.label ?? 'Resort'}</span>
                    </div>
                    <div className="break-words text-xs leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={sendChat}
              className="border-t border-white/10 bg-[#0d1628] p-3"
            >
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={240}
                  placeholder="Nhắn tin với các cầu thủ trong Resort..."
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Gửi</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Character, Skin & Aura Picker Overlay */}
        {characterPickerOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-4">
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-emerald-400/35 bg-[#0d1628] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div>
                  <h3 className="text-base font-black text-white">
                    CHỌN CẦU THỦ NỔI TIẾNG & SKIN VÀO KHU CHAT
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hóa thân thành siêu sao để chat, nhảy Disco, Về Khách Sạn
                    Play Together 5★ & chơi Mini-Game!
                  </p>
                </div>
                <button
                  onClick={confirmCharacter}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  Vào Khu Giải Trí Ngay →
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto p-5">
                {/* Famous Footballers */}
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
                    1. Chọn Cầu Thủ Nổi Tiếng
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {KICKER_ORDER.map((id) => {
                      const k = KICKER_PROFILES[id];
                      const active = selectedKicker === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedKicker(id)}
                          className={`flex items-center gap-2 rounded-xl border p-2 text-left transition cursor-pointer ${
                            active
                              ? 'border-emerald-400 bg-emerald-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black"
                            style={{
                              backgroundColor: k.jerseyColor,
                              color: k.jerseyAccent,
                              border: `1.5px solid ${k.jerseyAccent}`,
                            }}
                          >
                            {k.numberStr}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold">
                              {k.shortName}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">
                              {k.specialty}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Skins */}
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wider text-sky-300">
                    2. Chọn Trang Phục Skin FC
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_ORDER.map((sid) => {
                      const s = PLAYER_SKINS[sid];
                      const active = selectedSkin === sid;
                      return (
                        <button
                          key={sid}
                          onClick={() => setSelectedSkin(sid)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            active
                              ? 'border-sky-400 bg-sky-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-white/40"
                            style={{ backgroundColor: s.jerseyColor }}
                          />
                          <span>{s.nameVi}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Running Auras */}
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wider text-pink-300">
                    3. Chọn Hào Quang Nhân Vật
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {RUNNING_AURA_ORDER.map((aid) => {
                      const a = RUNNING_AURAS[aid];
                      const active = selectedAura === aid;
                      return (
                        <button
                          key={aid}
                          onClick={() => setSelectedAura(aid)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            active
                              ? 'border-pink-400 bg-pink-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: a.hexColor }}
                          />
                          <span>{a.nameVi}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
