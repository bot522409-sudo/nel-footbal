import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Disc3,
  Gamepad2,
  Hotel,
  MapPin,
  Music,
  Send,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
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
    label: 'Khách Sạn 5★',
    spawnX: 795,
    spawnY: 215,
    color: '#f59e0b',
    desc: 'Sảnh Hoàng Gia, Suite 888 & Hồ Bơi Vô Cực',
  },
  arcade: {
    label: 'Khu Mini-Game',
    spawnX: 500,
    spawnY: 505,
    color: '#38bdf8',
    desc: 'Tâng Bóng, Xúc Xắc & Penalty Arcade',
  },
};

const QUICK_EMOTES = [
  { id: 'Nhảy Disco 💃', label: 'Nhảy Disco', icon: '💃' },
  { id: 'Moonwalk 🕺', label: 'Moonwalk', icon: '🕺' },
  { id: 'Siuuu! 🔥', label: 'Siuuu!', icon: '🔥' },
  { id: 'Nghỉ Suite 🛌', label: 'Nghỉ Khách Sạn', icon: '🏨' },
  { id: 'Cạn Ly VIP 🥂', label: 'Cạn Ly 🥂', icon: '🥂' },
  { id: 'Vẫy Tay 👋', label: 'Chào Fan', icon: '👋' },
];

function detectZoneAt(x: number, y: number): PlazaZoneId {
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

  // Mini-games drawer state
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [activeGameTab, setActiveGameTab] = useState<'juggle' | 'dice' | 'penalty'>('juggle');

  // Mini-Game 1: Tâng Bóng Siêu Sao
  const [juggleBallY, setJuggleBallY] = useState(25);
  const [juggleScore, setJuggleScore] = useState(0);
  const [juggleBest, setJuggleBest] = useState(0);
  const [juggleActive, setJuggleActive] = useState(false);
  const [juggleFeedback, setJuggleFeedback] = useState('Nhấn "Tâng Ngay!" khi bóng rơi vào vùng xanh lá!');
  const juggleVelRef = useRef(0);
  const jugglePosRef = useRef(25);
  const juggleScoreRef = useRef(0);

  // Mini-Game 2: Xúc Xắc Ngôi Sao
  const [diceValues, setDiceValues] = useState<[number, number]>([6, 6]);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceStatus, setDiceStatus] = useState('Tung xúc xắc cùng hội siêu sao VIP!');

  // Mini-Game 3: Sút Penalty Arcade
  const [penStreak, setPenStreak] = useState(0);
  const [penResult, setPenResult] = useState<string>('Chọn góc sút Trái / Giữa / Phải để thắng Thủ Môn Bot!');
  const [penGkSide, setPenGkSide] = useState<'left' | 'center' | 'right'>('center');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Local player smooth position & input refs
  const localPosRef = useRef({ x: 500, y: 325 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const lastNetMoveRef = useRef(0);
  const usersRef = useRef<PlazaUserState[]>([]);
  const smoothUsersRef = useRef<Record<string, { x: number; y: number; vx: number; vy: number }>>({});
  const joinedRef = useRef(false);

  useEffect(() => {
    usersRef.current = plazaUsers;
  }, [plazaUsers]);

  // Sync defaults when opening
  useEffect(() => {
    if (!open) return;
    setSelectedKicker(initialKickerId);
    setSelectedSkin(initialSkinId);
    setSelectedAura(initialAuraId);
    setCharacterPickerOpen(true);
    joinedRef.current = false;
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
          if (prev.some((m) => m.messageId === ev.message.messageId)) return prev;
          return [...prev.slice(-79), ev.message];
        });
      }
    });

    // Join immediately so presence & chat load cleanly while choosing/confirming character
    const startZone = detectZoneAt(localPosRef.current.x, localPosRef.current.y);
    onlineMatchClient.joinPlaza({
      kickerId: initialKickerId,
      skinId: initialSkinId,
      auraId: initialAuraId,
      zone: startZone,
      x: localPosRef.current.x,
      y: localPosRef.current.y,
    });
    joinedRef.current = true;

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
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
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

  // Main 60fps Resort World Canvas Loop
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

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
        const len = Math.hypot(kx, ky);
        localPosRef.current.x = Math.max(
          28,
          Math.min(WORLD_W - 28, localPosRef.current.x + (kx / len) * 205 * dt),
        );
        localPosRef.current.y = Math.max(
          32,
          Math.min(WORLD_H - 28, localPosRef.current.y + (ky / len) * 205 * dt),
        );
        moved = true;
      } else if (targetPosRef.current) {
        const dx = targetPosRef.current.x - localPosRef.current.x;
        const dy = targetPosRef.current.y - localPosRef.current.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) {
          targetPosRef.current = null;
        } else {
          const step = Math.min(d, 225 * dt);
          localPosRef.current.x += (dx / d) * step;
          localPosRef.current.y += (dy / d) * step;
          moved = true;
        }
      }

      const currentZone = detectZoneAt(localPosRef.current.x, localPosRef.current.y);
      setActiveZone((prev) => (prev === currentZone ? prev : currentZone));

      if (moved && now - lastNetMoveRef.current > 85) {
        lastNetMoveRef.current = now;
        onlineMatchClient.moveInPlaza(
          Math.round(localPosRef.current.x),
          Math.round(localPosRef.current.y),
          currentZone,
        );
      }

      // 2. Render Resort Canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const t = now * 0.001;
        ctx.clearRect(0, 0, WORLD_W, WORLD_H);

        // Resort outer lawn / marble base
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

        // ---- ZONE 1: SÀN NHẢY DISCO CLUB (Top-Left) ----
        drawRoundedRect(ctx, 20, 18, 355, 350, 22);
        ctx.fillStyle = '#140b29';
        ctx.fill();
        ctx.strokeStyle = currentZone === 'disco' ? '#ec4899' : 'rgba(236,72,153,0.4)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Neon Disco Dance Grid (6x5 animated tiles)
        const beat = Math.floor(t * 2.4);
        const discoPalette = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 6; col++) {
            const tileX = 52 + col * 48;
            const tileY = 108 + row * 44;
            const colorIdx = (row + col + beat) % discoPalette.length;
            const pulse = 0.25 + 0.32 * Math.abs(Math.sin(t * 5 + row * 0.8 + col));
            ctx.fillStyle = discoPalette[colorIdx];
            ctx.globalAlpha = pulse;
            drawRoundedRect(ctx, tileX, tileY, 44, 40, 6);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        // Spinning Disco Ball + Light Rays
        const ballCx = 196;
        const ballCy = 66;
        ctx.save();
        for (let r = 0; r < 6; r++) {
          const ang = t * 1.1 + (r * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(ballCx, ballCy);
          ctx.lineTo(ballCx + Math.cos(ang) * 155, ballCy + Math.abs(Math.sin(ang)) * 185);
          ctx.lineTo(ballCx + Math.cos(ang + 0.18) * 155, ballCy + Math.abs(Math.sin(ang + 0.18)) * 185);
          ctx.closePath();
          ctx.fillStyle = r % 2 === 0 ? 'rgba(236,72,153,0.12)' : 'rgba(56,189,248,0.11)';
          ctx.fill();
        }
        ctx.restore();
        const discoGrad = ctx.createRadialGradient(ballCx - 5, ballCy - 5, 2, ballCx, ballCy, 19);
        discoGrad.addColorStop(0, '#ffffff');
        discoGrad.addColorStop(0.55, '#cbd5e1');
        discoGrad.addColorStop(1, '#475569');
        ctx.fillStyle = discoGrad;
        ctx.beginPath();
        ctx.arc(ballCx, ballCy, 18, 0, Math.PI * 2);
        ctx.fill();

        // DJ Booth
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

        // ---- ZONE 2: KHÁCH SẠN HOÀNG GIA 5★ (Top-Right) ----
        drawRoundedRect(ctx, 625, 18, 355, 365, 22);
        ctx.fillStyle = '#1b1612';
        ctx.fill();
        ctx.strokeStyle = currentZone === 'hotel' ? '#f59e0b' : 'rgba(245,158,11,0.4)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Red Carpet + Marble Lobby
        drawRoundedRect(ctx, 642, 62, 152, 298, 14);
        ctx.fillStyle = '#292018';
        ctx.fill();
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(694, 78, 46, 270);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(694, 78, 46, 270);

        // VIP Suite 888 Bed & Lounge (Top-Right)
        drawRoundedRect(ctx, 808, 56, 156, 138, 14);
        ctx.fillStyle = '#2b1f29';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251,191,36,0.45)';
        ctx.stroke();
        // King bed
        drawRoundedRect(ctx, 840, 74, 92, 66, 10);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.fillStyle = '#be123c';
        ctx.fillRect(840, 104, 92, 36);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PHÒNG SUITE 888', 886, 174);

        // Rooftop Infinity Pool (Bottom-Right inside Hotel)
        drawRoundedRect(ctx, 808, 212, 156, 148, 16);
        const poolGrad = ctx.createLinearGradient(808, 212, 964, 360);
        poolGrad.addColorStop(0, '#0284c7');
        poolGrad.addColorStop(1, '#0d9488');
        ctx.fillStyle = poolGrad;
        ctx.fill();
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Animated water shimmer lines
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1.5;
        for (let w = 0; w < 4; w++) {
          const wy = 238 + w * 28;
          ctx.beginPath();
          ctx.moveTo(824 + Math.sin(t * 2 + w) * 8, wy);
          ctx.quadraticCurveTo(886, wy + Math.cos(t * 3 + w) * 6, 948 + Math.sin(t * 2 + w) * 8, wy);
          ctx.stroke();
        }
        ctx.fillStyle = '#e0f2fe';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('HỒ BƠI VÔ CỰC', 886, 350);

        ctx.fillStyle = '#fcd34d';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🏨 KHÁCH SẠN HOÀNG GIA 5★', 640, 42);

        // ---- ZONE 3: QUẢNG TRƯỜNG DANH VỌNG (Center) ----
        ctx.beginPath();
        ctx.arc(500, 240, 102, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.fill();
        ctx.strokeStyle = currentZone === 'plaza' ? '#10b981' : 'rgba(16,185,129,0.38)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Central Star Fountain
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

        // ---- ZONE 4: KHU MINI-GAME SIÊU SAO (Bottom Center) ----
        drawRoundedRect(ctx, 275, 422, 450, 180, 22);
        ctx.fillStyle = '#0b192e';
        ctx.fill();
        ctx.strokeStyle = currentZone === 'arcade' ? '#38bdf8' : 'rgba(56,189,248,0.4)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 3 Arcade Stations
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

        // 3. Click destination marker
        if (targetPosRef.current) {
          ctx.beginPath();
          ctx.arc(targetPosRef.current.x, targetPosRef.current.y, 10 + Math.sin(t * 8) * 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 4. Render ALL Real Connected Players in Resort (Sorted by Y for depth)
        const nowMs = Date.now();
        const renderList = usersRef.current.map((u) => {
          const isMe = u.playerId === playerId;
          const targetX = isMe ? localPosRef.current.x : u.x;
          const targetY = isMe ? localPosRef.current.y : u.y;
          const prev = smoothUsersRef.current[u.playerId] ?? {
            x: targetX,
            y: targetY,
            vx: 0,
            vy: 0,
          };
          const nextX = isMe ? targetX : prev.x + (targetX - prev.x) * Math.min(1, dt * 10);
          const nextY = isMe ? targetY : prev.y + (targetY - prev.y) * Math.min(1, dt * 10);
          const speed = Math.hypot(nextX - prev.x, nextY - prev.y) / Math.max(0.001, dt);
          smoothUsersRef.current[u.playerId] = {
            x: nextX,
            y: nextY,
            vx: nextX - prev.x,
            vy: nextY - prev.y,
          };
          return { ...u, renderX: nextX, renderY: nextY, speed, isMe };
        });

        // Guarantee self renders smoothly even before first plaza:state round-trip
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
          const kicker = KICKER_PROFILES[(u.kickerId as KickerId) || 'ronaldo'] ?? KICKER_PROFILES.ronaldo;
          const skin = PLAYER_SKINS[(u.skinId as PlayerSkinId) || 'default'] ?? PLAYER_SKINS.default;
          const aura = RUNNING_AURAS[(u.auraId as RunningAuraId) || 'emerald_wind'] ?? RUNNING_AURAS.emerald_wind;
          const jerseyColor = u.skinId && u.skinId !== 'default' ? skin.jerseyColor : kicker.jerseyColor;
          const accentColor = u.skinId && u.skinId !== 'default' ? skin.accentColor : kicker.jerseyAccent;
          const skinTone = hexFromNumber(kicker.skinColor);
          const hairTone = hexFromNumber(kicker.hairColor);

          const isDancing =
            (u.emoteUntilMs > nowMs && (u.emote?.includes('Disco') || u.emote?.includes('Moonwalk'))) ||
            u.zone === 'disco';
          const bob = isDancing
            ? Math.abs(Math.sin(t * 7.5 + u.renderX * 0.05)) * 5
            : u.speed > 18
            ? Math.abs(Math.sin(t * 11)) * 4
            : Math.sin(t * 2.5) * 1.2;
          const sway = isDancing ? Math.sin(t * 6.5 + u.renderY * 0.05) * 4 : 0;

          const px = u.renderX + sway;
          const py = u.renderY - bob;

          // Running/Star Aura glow on ground
          if (aura.id !== 'none') {
            ctx.beginPath();
            ctx.ellipse(u.renderX, u.renderY + 14, 21, 9, 0, 0, Math.PI * 2);
            ctx.strokeStyle = aura.hexColor;
            ctx.lineWidth = u.isMe ? 2.5 : 1.8;
            ctx.globalAlpha = 0.72;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          // Contact shadow
          ctx.beginPath();
          ctx.ellipse(u.renderX, u.renderY + 14, 14, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.48)';
          ctx.fill();

          // Animated Legs
          const legSwing = u.speed > 18 ? Math.sin(t * 14) * 5 : isDancing ? Math.sin(t * 7) * 4 : 0;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px - 5, py + 2);
          ctx.lineTo(px - 6 - legSwing * 0.4, py + 13);
          ctx.moveTo(px + 5, py + 2);
          ctx.lineTo(px + 6 + legSwing * 0.4, py + 13);
          ctx.stroke();

          // Jersey Torso
          drawRoundedRect(ctx, px - 11, py - 13, 22, 18, 6);
          ctx.fillStyle = jerseyColor;
          ctx.fill();
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Jersey Number
          ctx.fillStyle = accentColor;
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(kicker.numberStr, px, py - 1);

          // Arms (raised when dancing or doing Siuuu/Cạn Ly)
          const armRaise = isDancing || u.emoteUntilMs > nowMs ? -10 - Math.sin(t * 8) * 5 : 4;
          ctx.strokeStyle = skinTone;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(px - 11, py - 9);
          ctx.lineTo(px - 17, py - 6 + armRaise);
          ctx.moveTo(px + 11, py - 9);
          ctx.lineTo(px + 17, py - 6 + armRaise);
          ctx.stroke();

          // Head & Hair
          ctx.beginPath();
          ctx.arc(px, py - 21, 9.5, 0, Math.PI * 2);
          ctx.fillStyle = skinTone;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, py - 24, 9.2, Math.PI, Math.PI * 2);
          ctx.fillStyle = hairTone;
          ctx.fill();

          // Self golden crown indicator
          if (u.isMe) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('▼ BẠN', px, py - 35);
          }

          // Nameplate (Username · Famous Player)
          const tagText = `${u.username} (${kicker.shortName})`;
          ctx.font = 'bold 11px sans-serif';
          const tw = ctx.measureText(tagText).width + 14;
          drawRoundedRect(ctx, px - tw / 2, py + 18, tw, 18, 6);
          ctx.fillStyle = u.isMe ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.88)';
          ctx.fill();
          ctx.strokeStyle = u.isMe ? '#34d399' : 'rgba(148,163,184,0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(tagText, px, py + 31);

          // Active Emote Pill
          if (u.emote && u.emoteUntilMs > nowMs) {
            ctx.font = 'bold 11px sans-serif';
            const ew = ctx.measureText(u.emote).width + 14;
            drawRoundedRect(ctx, px - ew / 2, py - 56, ew, 18, 9);
            ctx.fillStyle = 'rgba(236, 72, 153, 0.92)';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(u.emote, px, py - 43);
          }

          // Speech Bubble
          if (u.bubbleText && u.bubbleUntilMs > nowMs) {
            ctx.font = '600 11px sans-serif';
            const snippet = u.bubbleText.length > 34 ? `${u.bubbleText.slice(0, 33)}…` : u.bubbleText;
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
  }, [open, characterPickerOpen, playerId, username, selectedKicker, selectedSkin, selectedAura]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((e.clientY - rect.top) / rect.height) * WORLD_H;
    targetPosRef.current = {
      x: Math.max(28, Math.min(WORLD_W - 28, x)),
      y: Math.max(32, Math.min(WORLD_H - 28, y)),
    };
    const nextZone = detectZoneAt(targetPosRef.current.x, targetPosRef.current.y);
    if (nextZone === 'arcade' && y > 455 && y < 535) {
      setArcadeOpen(true);
    }
  };

  const teleportToZone = (zoneId: PlazaZoneId) => {
    const z = ZONE_META[zoneId];
    localPosRef.current = { x: z.spawnX, y: z.spawnY };
    targetPosRef.current = null;
    setActiveZone(zoneId);
    onlineMatchClient.moveInPlaza(z.spawnX, z.spawnY, zoneId);
    if (zoneId === 'arcade') {
      setArcadeOpen(true);
    }
  };

  const confirmCharacter = () => {
    setCharacterPickerOpen(false);
    onlineMatchClient.updatePlazaAvatar(selectedKicker, selectedSkin, selectedAura);
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
        const msg = d1 === 6 && d2 === 6 ? 'DOUBLE LỤC 12 ĐIỂM SIÊU VIP!' : `Đôi ${d1}-${d2} (${sum} điểm)!`;
        setDiceStatus(`🎉 ${msg}`);
        onlineMatchClient.sendPlazaActivity(`tung xúc xắc đạt ${msg} 🎲✨`, 'arcade');
      } else {
        setDiceStatus(`Bạn tung được ${d1} + ${d2} = ${sum} điểm.`);
      }
    }, 360);
  };

  const shootMiniPenalty = (corner: 'left' | 'center' | 'right') => {
    const dirs: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
    const gkDir = dirs[Math.floor(Math.random() * dirs.length)];
    setPenGkSide(gkDir);
    soundEngine.unlock();
    soundEngine.playKick(0.7);
    if (gkDir === corner) {
      soundEngine.playGloveSave();
      setPenResult(`Thủ môn bay ${gkDir === 'left' ? 'Trái' : gkDir === 'right' ? 'Phải' : 'Giữa'} cản phá! Chuỗi về 0.`);
      setPenStreak(0);
    } else {
      const next = penStreak + 1;
      setPenStreak(next);
      soundEngine.playCrowdCheer();
      setPenResult(`VÀO GÓC ${corner === 'left' ? 'TRÁI' : corner === 'right' ? 'PHẢI' : 'GIỮA'}! Chuỗi ${next} bàn liên tiếp!`);
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
              <div className="text-[11px] text-emerald-300/90">
                Đang hóa thân: <span className="font-bold text-amber-300">{activeKickerProfile.name}</span> · Khu vực:{' '}
                <span className="font-bold text-white">{ZONE_META[activeZone].label}</span>
              </div>
            </div>
          </div>

          {/* Zone Quick Teleporters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'plaza' as const, icon: MapPin, label: 'Quảng Trường' },
                { id: 'disco' as const, icon: Disc3, label: 'Sàn Nhảy Disco' },
                { id: 'hotel' as const, icon: Hotel, label: 'Khách Sạn 5★' },
                { id: 'arcade' as const, icon: Gamepad2, label: 'Mini-Game' },
              ] as const
            ).map((z) => {
              const Icon = z.icon;
              const isAct = activeZone === z.id;
              return (
                <button
                  key={z.id}
                  onClick={() => teleportToZone(z.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
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
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                discoMusicOn
                  ? 'border-pink-400 bg-pink-500/25 text-pink-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {discoMusicOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{discoMusicOn ? 'Tắt Nhạc Disco' : 'Bật Nhạc Disco'}</span>
            </button>

            <button
              onClick={() => setCharacterPickerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Đổi Nhân Vật & Skin</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30"
            >
              <X className="h-4 w-4" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* Left: Interactive 2D Resort World + Emote Bar */}
          <div className="relative flex min-h-0 flex-col bg-[#070d18]">
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
                Click bản đồ hoặc nhấn <span className="font-bold text-emerald-300">WASD / Phím mũi tên</span> để di chuyển
              </div>

              {/* Floating Arcade Button */}
              <button
                onClick={() => setArcadeOpen((v) => !v)}
                className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-600 px-3.5 py-2 text-xs font-black text-white shadow-lg hover:bg-sky-500"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>{arcadeOpen ? 'Đóng Mini-Game' : 'Mở Mini-Game Resort'}</span>
              </button>
            </div>

            {/* Bottom Emote & Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0d1526] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Biểu cảm:
                </span>
                {QUICK_EMOTES.map((em) => (
                  <button
                    key={em.id}
                    onClick={() => triggerEmote(em.id)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:border-pink-400/40 hover:bg-pink-500/20"
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
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
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
                      className="ml-1 rounded-lg bg-white/10 p-1 text-slate-300 hover:bg-rose-500/30 hover:text-white"
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
                        style={{ top: `${Math.min(88, Math.max(4, juggleBallY))}%` }}
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
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-black text-white shadow hover:brightness-110"
                      >
                        {juggleActive ? 'TÂNG BÓNG NGAY! ⚽' : 'BẮT ĐẦU TÂNG BÓNG'}
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
                    <p className="text-xs font-semibold text-amber-200">{diceStatus}</p>
                    <button
                      onClick={rollVipDice}
                      disabled={diceRolling}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-black text-white shadow hover:brightness-110 disabled:opacity-60"
                    >
                      {diceRolling ? 'Đang lắc xúc xắc...' : 'LẮC XÚC XẮC NGÔI SAO 🎲'}
                    </button>
                  </div>
                )}

                {activeGameTab === 'penalty' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                      <span className="text-xs font-bold text-sky-300">
                        Chuỗi ghi bàn: <span className="text-base text-white">{penStreak}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Thủ môn Bot vừa bay:{' '}
                        <strong className="text-rose-300">
                          {penGkSide === 'left' ? 'Trái' : penGkSide === 'right' ? 'Phải' : 'Giữa'}
                        </strong>
                      </span>
                    </div>
                    <p className="text-xs font-medium text-emerald-200">{penResult}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => shootMiniPenalty('left')}
                        className="rounded-xl bg-pink-600 py-2.5 text-xs font-black text-white hover:bg-pink-500"
                      >
                        ⬅️ Sút Góc Trái
                      </button>
                      <button
                        onClick={() => shootMiniPenalty('center')}
                        className="rounded-xl bg-sky-600 py-2.5 text-xs font-black text-white hover:bg-sky-500"
                      >
                        ⬆️ Sút Giữa
                      </button>
                      <button
                        onClick={() => shootMiniPenalty('right')}
                        className="rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500"
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
              <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                {plazaUsers.map((u) => {
                  const k = KICKER_PROFILES[(u.kickerId as KickerId) || 'ronaldo'] ?? KICKER_PROFILES.ronaldo;
                  const isSelf = u.playerId === playerId;
                  return (
                    <div
                      key={u.playerId}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                        isSelf
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-200'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ZONE_META[u.zone]?.color ?? '#10b981' }}
                      />
                      <span className="font-bold">{u.username}</span>
                      <span className="text-slate-400">· {k.shortName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Chat Stream */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-400">
                  Chào mừng đến Siêu Sao Resort! Hãy gửi lời chào hoặc rủ mọi người qua Sàn Nhảy Disco & Khách Sạn 5★.
                </div>
              )}
              {chatMessages.map((m) => {
                const k = KICKER_PROFILES[(m.kickerId as KickerId) || 'ronaldo'] ?? KICKER_PROFILES.ronaldo;
                const isSelf = m.playerId === playerId;
                if (m.kind === 'activity') {
                  return (
                    <div
                      key={m.messageId}
                      className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200"
                    >
                      <span className="font-bold">{m.username}</span> ({k.shortName}) {m.text}
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
                    <div className="break-words text-xs leading-relaxed">{m.text}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={sendChat} className="border-t border-white/10 bg-[#0d1628] p-3">
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
                  className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400"
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
                    Hóa thân thành siêu sao yêu thích để chat, nhảy Disco, nghỉ Khách Sạn 5★ & chơi Mini-Game!
                  </p>
                </div>
                <button
                  onClick={confirmCharacter}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400"
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
                          className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
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
                            <div className="truncate text-xs font-bold">{k.shortName}</div>
                            <div className="truncate text-[10px] text-slate-400">{k.specialty}</div>
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
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
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
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
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
