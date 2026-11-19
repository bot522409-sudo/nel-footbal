import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PORT_ARG = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1];
const PORT = Number(CLI_PORT_ARG || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const ADMIN_EMAIL = 'bot522409@gmail.com';
const DATA_DIR = path.resolve(__dirname, '.data');
const VISIT_LOGS_FILE = path.join(DATA_DIR, 'visit-logs.json');
const DM_HISTORY_FILE = path.join(DATA_DIR, 'dm-history.json');

function loadFirebaseWebApiKey(): string {
  try {
    const raw = fs.readFileSync(
      path.resolve(__dirname, 'firebase-applet-config.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw) as { apiKey?: string };
    return String(parsed.apiKey || '');
  } catch {
    return '';
  }
}

const FIREBASE_WEB_API_KEY = loadFirebaseWebApiKey();

function ensureDataDir(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore mkdir errors
  }
}

function loadJsonArray<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveJsonArray<T>(filePath: string, items: T[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(items), 'utf8');
  } catch {
    // ignore write errors
  }
}

type PlayerActivity = 'menu' | 'playing' | 'queue' | 'waiting' | 'duel';

interface PlayerBadge {
  playerId: string;
  username: string;
  squadOvr: number;
  elo: number;
  kickerId: string;
  gkId: string;
  activity: PlayerActivity;
  modeLabel: string;
  waitingRoomCode?: string | null;
}

interface RoomPlayer extends PlayerBadge {
  slot: 'p1' | 'p2';
  score: number;
  ws: WebSocket;
}

interface PendingShot {
  aim: { x: number; y: number };
  power: number;
  spin: { curve: number; dip: number };
  kickerId: string;
}

interface PendingGkDive {
  dir: 'left' | 'center' | 'right';
  targetX?: number;
  targetY?: number;
}

interface DuelScenario {
  id: string;
  label: string;
  ballPos: { x: number; z: number };
  wallCount: number;
  wind: { x: number; z: number };
  difficulty: 'medium';
}

const DUEL_SCENARIOS: DuelScenario[] = [
  {
    id: 'online-1',
    label: '19m Trung Lộ Online',
    ballPos: { x: -1.4, z: 19.0 },
    wallCount: 3,
    wind: { x: 0.4, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'online-2',
    label: '22m Góc Trái Online',
    ballPos: { x: -5.4, z: 21.5 },
    wallCount: 4,
    wind: { x: -0.9, z: 0.2 },
    difficulty: 'medium',
  },
  {
    id: 'online-3',
    label: '11m Penalty Online',
    ballPos: { x: 0, z: 11.0 },
    wallCount: 0,
    wind: { x: 0, z: 0 },
    difficulty: 'medium',
  },
  {
    id: 'online-4',
    label: '24m Góc Phải Online',
    ballPos: { x: 5.8, z: 23.2 },
    wallCount: 4,
    wind: { x: 1.1, z: -0.2 },
    difficulty: 'medium',
  },
  {
    id: 'online-5',
    label: '26m Quyết Định',
    ballPos: { x: -3.2, z: 25.8 },
    wallCount: 5,
    wind: { x: -1.3, z: 0.3 },
    difficulty: 'medium',
  },
  {
    id: 'online-6',
    label: '11m Cân Não',
    ballPos: { x: 0, z: 11.0 },
    wallCount: 0,
    wind: { x: 0, z: 0 },
    difficulty: 'medium',
  },
];

interface DuelRoom {
  roomId: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  players: RoomPlayer[];
  turn: number;
  maxTurns: number;
  shooterSlot: 'p1' | 'p2';
  scenario: DuelScenario;
  turnPhase: 'aiming' | 'gk_react' | 'animating' | 'round_pause';
  turnDeadlineMs: number;
  winnerSlot: 'p1' | 'p2' | 'draw' | null;
  pendingShot: PendingShot | null;
  pendingGkDive: PendingGkDive | null;
  turnResultReported: boolean;
  turnTimer: NodeJS.Timeout | null;
  reactTimer: NodeJS.Timeout | null;
  nextTurnTimer: NodeJS.Timeout | null;
}

const clients = new Map<WebSocket, PlayerBadge>();
const adminSockets = new Set<WebSocket>();
const rooms = new Map<string, DuelRoom>();
const roomByCode = new Map<string, string>();
const socketRoom = new Map<WebSocket, string>();
const matchmakingQueue: WebSocket[] = [];

interface InboxRelayMessage {
  messageId: string;
  channel: 'global' | 'dm';
  senderId: string;
  senderName: string;
  recipientId: string | null;
  recipientName: string | null;
  text: string;
  voiceDataUrl?: string | null;
  voiceDurationSec?: number;
  createdAtMs: number;
}

interface VisitSessionLog {
  sessionId: string;
  playerId: string;
  username: string;
  accountType: 'guest' | 'account';
  modeLabel: string;
  startedAtMs: number;
  lastSeenAtMs: number;
  endedAtMs: number | null;
  durationSec: number;
}

const globalInboxHistory: InboxRelayMessage[] = [];
let dmInboxHistory: InboxRelayMessage[] = loadJsonArray<InboxRelayMessage>(
  DM_HISTORY_FILE,
).slice(-500);
let visitLogs: VisitSessionLog[] = loadJsonArray<VisitSessionLog>(
  VISIT_LOGS_FILE,
).slice(-500);
let lastVisitFlushMs = 0;
const voiceRoomPeers = new Map<WebSocket, { playerId: string; username: string; micMuted: boolean }>();

type PlazaZoneId = 'plaza' | 'disco' | 'hotel' | 'arcade';

interface PlazaUserState {
  playerId: string;
  username: string;
  kickerId: string;
  skinId: string;
  auraId: string;
  zone: PlazaZoneId;
  x: number;
  y: number;
  emote: string | null;
  emoteUntilMs: number;
  bubbleText: string | null;
  bubbleUntilMs: number;
  joinedAtMs: number;
}

interface PlazaChatMessage {
  messageId: string;
  kind: 'chat' | 'activity';
  playerId: string;
  username: string;
  kickerId: string;
  zone: PlazaZoneId;
  text: string;
  createdAtMs: number;
}

const plazaUsers = new Map<WebSocket, PlazaUserState>();
const plazaChatHistory: PlazaChatMessage[] = [];

function sanitizePlazaZone(z: unknown): PlazaZoneId {
  if (z === 'disco' || z === 'hotel' || z === 'arcade') return z;
  return 'plaza';
}

function broadcastPlazaState(): void {
  const payload = {
    type: 'plaza:state',
    users: Array.from(plazaUsers.values()),
  };
  for (const targetWs of plazaUsers.keys()) {
    sendJson(targetWs, payload);
  }
}

function getInboxMessagesForPlayer(playerId: string): InboxRelayMessage[] {
  const relevantDms = dmInboxHistory.filter(
    (m) => m.senderId === playerId || m.recipientId === playerId,
  );
  return [...globalInboxHistory, ...relevantDms]
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .slice(-160);
}

async function verifyAdminBearerToken(req: express.Request): Promise<boolean> {
  if (!FIREBASE_WEB_API_KEY) return false;
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return false;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        FIREBASE_WEB_API_KEY,
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!resp.ok) return false;
    const data = (await resp.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    return Boolean(
      user &&
        user.email?.toLowerCase() === ADMIN_EMAIL &&
        user.emailVerified === true,
    );
  } catch {
    return false;
  }
}

function broadcastVoiceRoomState(): void {
  const members = Array.from(voiceRoomPeers.values());
  const payload = { type: 'voice:room_state', members };
  for (const ws of clients.keys()) {
    sendJson(ws, payload);
  }
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function serializeRoom(room: DuelRoom) {
  return {
    roomId: room.roomId,
    code: room.code,
    status: room.status,
    players: room.players.map((p) => ({
      playerId: p.playerId,
      username: p.username,
      squadOvr: p.squadOvr,
      elo: p.elo,
      kickerId: p.kickerId,
      gkId: p.gkId,
      slot: p.slot,
      score: p.score,
    })),
    turn: room.turn,
    maxTurns: room.maxTurns,
    shooterSlot: room.shooterSlot,
    scenario: room.scenario,
    turnPhase: room.turnPhase,
    turnDeadlineMs: room.turnDeadlineMs,
    winnerSlot: room.winnerSlot,
  };
}

function resolveLiveBadgeForSocket(ws: WebSocket, base: PlayerBadge): PlayerBadge {
  const roomId = socketRoom.get(ws);
  if (roomId) {
    const room = rooms.get(roomId);
    if (room && room.status === 'playing') {
      return {
        ...base,
        activity: 'duel',
        modeLabel: `Đang Đấu Online (${room.code})`,
        waitingRoomCode: null,
      };
    }
    if (room && room.status === 'waiting') {
      return {
        ...base,
        activity: 'waiting',
        modeLabel: `Đang Mở Phòng ${room.code}`,
        waitingRoomCode: room.code,
      };
    }
  }
  if (matchmakingQueue.includes(ws)) {
    return {
      ...base,
      activity: 'queue',
      modeLabel: 'Đang Tìm Đối Thủ',
      waitingRoomCode: null,
    };
  }
  return {
    ...base,
    waitingRoomCode: null,
  };
}

function buildPresencePayload() {
  const activityPriority: Record<PlayerActivity, number> = {
    duel: 5,
    waiting: 4,
    queue: 3,
    playing: 2,
    menu: 1,
  };
  const uniqueBadges = new Map<string, PlayerBadge>();
  for (const [ws, badge] of clients.entries()) {
    const live = resolveLiveBadgeForSocket(ws, badge);
    const existing = uniqueBadges.get(live.playerId);
    if (
      !existing ||
      activityPriority[live.activity] >= activityPriority[existing.activity]
    ) {
      uniqueBadges.set(live.playerId, live);
    }
  }
  const playersPreview = Array.from(uniqueBadges.values()).slice(0, 60);
  const openRooms = Array.from(rooms.values())
    .filter((r) => r.status === 'waiting' && r.players.length === 1)
    .map((r) => ({
      roomId: r.roomId,
      code: r.code,
      hostPlayerId: r.players[0].playerId,
      hostUsername: r.players[0].username,
      hostOvr: r.players[0].squadOvr,
      hostElo: r.players[0].elo,
    }));

  return {
    type: 'presence:state',
    data: {
      onlineCount: Math.max(clients.size, uniqueBadges.size),
      activeRoomsCount: rooms.size,
      inQueueCount: matchmakingQueue.length,
      playersPreview,
      openRooms,
    },
  };
}

function broadcastPresence(): void {
  const payload = buildPresencePayload();
  for (const ws of clients.keys()) {
    sendJson(ws, payload);
  }
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!roomByCode.has(code)) return code;
  }
  return `F${Date.now().toString().slice(-3)}`;
}

function clearRoomTimers(room: DuelRoom): void {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  if (room.reactTimer) {
    clearTimeout(room.reactTimer);
    room.reactTimer = null;
  }
  if (room.nextTurnTimer) {
    clearTimeout(room.nextTurnTimer);
    room.nextTurnTimer = null;
  }
}

function removeSocketFromQueue(ws: WebSocket): void {
  const idx = matchmakingQueue.indexOf(ws);
  if (idx >= 0) {
    matchmakingQueue.splice(idx, 1);
    sendJson(ws, { type: 'queue:status', waiting: false });
  }
}

function broadcastRoom(room: DuelRoom, payload: unknown): void {
  for (const p of room.players) {
    sendJson(p.ws, payload);
  }
}

function executeRoomTurnAnimation(room: DuelRoom): void {
  if (room.status !== 'playing' || room.turnPhase === 'animating') return;
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  if (room.reactTimer) {
    clearTimeout(room.reactTimer);
    room.reactTimer = null;
  }

  room.turnPhase = 'animating';
  const shooter =
    room.players.find((p) => p.slot === room.shooterSlot) ?? room.players[0];
  const keeper =
    room.players.find((p) => p.slot !== room.shooterSlot) ?? room.players[0];

  const shot: PendingShot = room.pendingShot ?? {
    aim: { x: 1.9, y: 1.5 },
    power: 0.72,
    spin: { curve: -0.35, dip: 0.2 },
    kickerId: shooter.kickerId || 'ronaldo',
  };

  const gkDive: PendingGkDive = room.pendingGkDive ?? {
    dir: 'center',
  };

  broadcastRoom(room, {
    type: 'duel:execute',
    payload: {
      roomId: room.roomId,
      turn: room.turn,
      aim: shot.aim,
      power: shot.power,
      spin: shot.spin,
      kickerId: shot.kickerId,
      gkDive,
      gkId: keeper.gkId || 'courtois',
    },
    room: serializeRoom(room),
  });

  // Safety fallback if neither client reports result within 6s
  room.nextTurnTimer = setTimeout(() => {
    if (room.status === 'playing' && !room.turnResultReported) {
      finalizeRoomTurn(room, false, 'Hết giờ lượt');
    }
  }, 6000);
}

function startRoomTurn(room: DuelRoom, turnNumber: number): void {
  if (room.status !== 'playing') return;
  clearRoomTimers(room);

  room.turn = turnNumber;
  room.shooterSlot = turnNumber % 2 === 1 ? 'p1' : 'p2';
  const scenarioIdx = Math.floor((turnNumber - 1) / 2) % DUEL_SCENARIOS.length;
  room.scenario = DUEL_SCENARIOS[scenarioIdx];
  room.turnPhase = 'aiming';
  room.turnDeadlineMs = Date.now() + 18000;
  room.pendingShot = null;
  room.pendingGkDive = null;
  room.turnResultReported = false;

  broadcastRoom(room, {
    type: 'duel:turn_start',
    room: serializeRoom(room),
  });

  room.turnTimer = setTimeout(() => {
    if (room.status === 'playing' && room.turn === turnNumber && room.turnPhase === 'aiming') {
      executeRoomTurnAnimation(room);
    }
  }, 18500);
}

function finalizeRoomTurn(
  room: DuelRoom,
  isGoal: boolean,
  outcomeTitle: string,
): void {
  if (room.status !== 'playing' || room.turnResultReported) return;
  room.turnResultReported = true;
  clearRoomTimers(room);

  const shooter = room.players.find((p) => p.slot === room.shooterSlot);
  if (shooter && isGoal) {
    shooter.score += 1;
  }

  room.turnPhase = 'round_pause';

  const p1 = room.players.find((p) => p.slot === 'p1');
  const p2 = room.players.find((p) => p.slot === 'p2');
  const p1Score = p1?.score ?? 0;
  const p2Score = p2?.score ?? 0;

  broadcastRoom(room, {
    type: 'duel:score_update',
    room: serializeRoom(room),
    lastTurnOutcome: {
      turn: room.turn,
      shooterSlot: room.shooterSlot,
      isGoal,
      outcomeTitle,
    },
  });

  // Check if match is over (completed an even pair >= maxTurns and score is not tied)
  const pairFinished = room.turn % 2 === 0;
  const reachedMax = room.turn >= room.maxTurns;
  if (reachedMax && pairFinished && p1Score !== p2Score) {
    room.status = 'finished';
    room.winnerSlot = p1Score > p2Score ? 'p1' : 'p2';
    room.nextTurnTimer = setTimeout(() => {
      broadcastRoom(room, {
        type: 'duel:match_over',
        room: serializeRoom(room),
        reason: 'normal',
      });
    }, 1800);
    return;
  }

  // Sudden death extension if tied after maxTurns
  if (reachedMax && pairFinished && p1Score === p2Score) {
    room.maxTurns = room.turn + 2;
  }

  const nextTurn = room.turn + 1;
  room.nextTurnTimer = setTimeout(() => {
    startRoomTurn(room, nextTurn);
  }, 2400);
}

function leaveCurrentRoom(ws: WebSocket): void {
  removeSocketFromQueue(ws);
  const roomId = socketRoom.get(ws);
  if (!roomId) return;
  socketRoom.delete(ws);

  const room = rooms.get(roomId);
  if (!room) return;

  const leavingPlayer = room.players.find((p) => p.ws === ws);
  const remainingPlayers = room.players.filter((p) => p.ws !== ws);

  if (remainingPlayers.length === 0) {
    clearRoomTimers(room);
    rooms.delete(room.roomId);
    roomByCode.delete(room.code);
    broadcastPresence();
    return;
  }

  if (room.status === 'playing' && leavingPlayer) {
    clearRoomTimers(room);
    room.status = 'finished';
    room.winnerSlot = remainingPlayers[0].slot;
    room.players = remainingPlayers;
    broadcastRoom(room, {
      type: 'duel:match_over',
      room: serializeRoom(room),
      reason: 'forfeit',
    });
  } else {
    room.players = remainingPlayers;
  }

  // Clean up finished room entry once empty or ended
  rooms.delete(room.roomId);
  roomByCode.delete(room.code);
  for (const p of remainingPlayers) {
    socketRoom.delete(p.ws);
  }
  broadcastPresence();
}

function createAndPairRoom(p1Ws: WebSocket, p2Ws?: WebSocket): DuelRoom | null {
  const b1 = clients.get(p1Ws);
  if (!b1) return null;

  leaveCurrentRoom(p1Ws);
  if (p2Ws) leaveCurrentRoom(p2Ws);

  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const code = generateRoomCode();
  const room: DuelRoom = {
    roomId,
    code,
    status: p2Ws ? 'playing' : 'waiting',
    players: [
      {
        ...b1,
        slot: 'p1',
        score: 0,
        ws: p1Ws,
      },
    ],
    turn: 1,
    maxTurns: 6,
    shooterSlot: 'p1',
    scenario: DUEL_SCENARIOS[0],
    turnPhase: 'aiming',
    turnDeadlineMs: Date.now() + 18000,
    winnerSlot: null,
    pendingShot: null,
    pendingGkDive: null,
    turnResultReported: false,
    turnTimer: null,
    reactTimer: null,
    nextTurnTimer: null,
  };

  socketRoom.set(p1Ws, roomId);

  if (p2Ws) {
    const b2 = clients.get(p2Ws);
    if (b2) {
      room.players.push({
        ...b2,
        slot: 'p2',
        score: 0,
        ws: p2Ws,
      });
      socketRoom.set(p2Ws, roomId);
    } else {
      room.status = 'waiting';
    }
  }

  rooms.set(roomId, room);
  roomByCode.set(code, roomId);

  if (room.players.length === 1) {
    sendJson(p1Ws, {
      type: 'room:joined',
      room: serializeRoom(room),
      yourSlot: 'p1',
    });
  } else {
    const serialized = serializeRoom(room);
    sendJson(room.players[0].ws, {
      type: 'room:joined',
      room: serialized,
      yourSlot: 'p1',
    });
    sendJson(room.players[1].ws, {
      type: 'room:joined',
      room: serialized,
      yourSlot: 'p2',
    });
    broadcastRoom(room, { type: 'room:ready', room: serialized });
    startRoomTurn(room, 1);
  }

  broadcastPresence();
  return room;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '128kb' }));
  app.use('/api/visits/ping', express.text({ type: 'text/plain', limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      onlineCount: clients.size,
      activeRooms: rooms.size,
    });
  });

  app.post('/api/visits/ping', (req, res) => {
    let body: Record<string, unknown> = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body) as Record<string, unknown>;
      } catch {
        res.status(400).json({ ok: false });
        return;
      }
    } else if (req.body && typeof req.body === 'object') {
      body = req.body as Record<string, unknown>;
    }

    const sessionId = String(body.sessionId || '').trim().slice(0, 80);
    if (!sessionId || sessionId.length < 4) {
      res.status(400).json({ ok: false });
      return;
    }

    const now = Date.now();
    const playerId = String(body.playerId || 'Khach').trim().slice(0, 128) || 'Khach';
    const username = String(body.username || 'Khách').trim().slice(0, 32) || 'Khách';
    const accountType: 'guest' | 'account' =
      body.accountType === 'account' ? 'account' : 'guest';
    const modeLabel =
      String(body.modeLabel || (accountType === 'guest' ? 'Chơi Trải Nghiệm' : 'Sảnh Chính'))
        .trim()
        .slice(0, 64) || 'Chơi Trải Nghiệm';
    const ended = Boolean(body.ended);
    const requestedStart = Number(body.startedAtMs);
    const safeStart =
      Number.isFinite(requestedStart) &&
      requestedStart > 1_700_000_000_000 &&
      requestedStart <= now + 5000
        ? Math.round(requestedStart)
        : now;

    const existing = visitLogs.find((v) => v.sessionId === sessionId);
    let shouldFlushNow = false;
    if (existing) {
      existing.playerId = playerId;
      existing.username = username;
      existing.accountType = accountType;
      existing.modeLabel = modeLabel;
      existing.lastSeenAtMs = now;
      if (ended) {
        existing.endedAtMs = now;
        shouldFlushNow = true;
      } else {
        existing.endedAtMs = null;
      }
      const endRef = existing.endedAtMs ?? existing.lastSeenAtMs;
      existing.durationSec = Math.max(0, Math.round((endRef - existing.startedAtMs) / 1000));
    } else {
      const entry: VisitSessionLog = {
        sessionId,
        playerId,
        username,
        accountType,
        modeLabel,
        startedAtMs: safeStart,
        lastSeenAtMs: now,
        endedAtMs: ended ? now : null,
        durationSec: Math.max(0, Math.round((now - safeStart) / 1000)),
      };
      visitLogs.unshift(entry);
      if (visitLogs.length > 500) {
        visitLogs = visitLogs.slice(0, 500);
      }
      shouldFlushNow = true;
    }

    if (shouldFlushNow || now - lastVisitFlushMs > 12_000) {
      lastVisitFlushMs = now;
      saveJsonArray(VISIT_LOGS_FILE, visitLogs);
    }

    res.json({ ok: true });
  });

  app.get('/api/admin/visits', async (req, res) => {
    const allowed = await verifyAdminBearerToken(req);
    if (!allowed) {
      res.status(403).json({ error: 'Admin access only (bot522409@gmail.com).' });
      return;
    }
    const now = Date.now();
    const sorted = [...visitLogs]
      .sort((a, b) => b.startedAtMs - a.startedAtMs)
      .map((v) => ({
        ...v,
        isOnline: !v.endedAtMs && now - v.lastSeenAtMs < 45_000,
      }));
    res.json({ visits: sorted });
  });

  app.delete('/api/admin/visits', async (req, res) => {
    const allowed = await verifyAdminBearerToken(req);
    if (!allowed) {
      res.status(403).json({ error: 'Admin access only (bot522409@gmail.com).' });
      return;
    }
    visitLogs = [];
    saveJsonArray(VISIT_LOGS_FILE, visitLogs);
    res.json({ ok: true });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/online' });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    clients.set(ws, {
      playerId: `anon_${Math.random().toString(36).slice(2, 8)}`,
      username: 'Player',
      squadOvr: 79,
      elo: 1000,
      kickerId: 'ronaldo',
      gkId: 'courtois',
      activity: 'menu',
      modeLabel: 'Sảnh Chính',
      waitingRoomCode: null,
    });
    sendJson(ws, buildPresencePayload());

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'ping') return;

      if (type === 'presence:request') {
        sendJson(ws, buildPresencePayload());
        return;
      }

      if (type === 'presence:hello') {
        const p = msg.player as Partial<PlayerBadge> | undefined;
        const adminEmail = String(msg.adminEmail || '').toLowerCase();
        if (adminEmail === 'bot522409@gmail.com') {
          adminSockets.add(ws);
        } else {
          adminSockets.delete(ws);
        }
        if (p) {
          const rawAct = p.activity;
          const safeActivity: PlayerActivity =
            rawAct === 'playing' || rawAct === 'queue' || rawAct === 'waiting' || rawAct === 'duel'
              ? rawAct
              : 'menu';
          clients.set(ws, {
            playerId: String(p.playerId || `anon_${Math.random().toString(36).slice(2, 8)}`),
            username: String(p.username || 'Player').slice(0, 24),
            squadOvr: Math.max(1, Math.min(200, Number(p.squadOvr || 79))),
            elo: Math.max(0, Math.min(10000, Number(p.elo || 1000))),
            kickerId: String(p.kickerId || 'ronaldo'),
            gkId: String(p.gkId || 'courtois'),
            activity: safeActivity,
            modeLabel: String(p.modeLabel || (safeActivity === 'playing' ? 'Đang Đá Sân' : 'Sảnh Chính')).slice(0, 48),
            waitingRoomCode: typeof p.waitingRoomCode === 'string' ? p.waitingRoomCode : null,
          });
          const updatedBadge = clients.get(ws)!;
          sendJson(ws, {
            type: 'inbox:history',
            messages: getInboxMessagesForPlayer(updatedBadge.playerId),
          });
          sendJson(ws, {
            type: 'voice:room_state',
            members: Array.from(voiceRoomPeers.values()),
          });
          broadcastPresence();
        }
        return;
      }

      if (type === 'inbox:history_request') {
        const badge = clients.get(ws);
        sendJson(ws, {
          type: 'inbox:history',
          messages: badge
            ? getInboxMessagesForPlayer(badge.playerId)
            : globalInboxHistory,
        });
        sendJson(ws, {
          type: 'voice:room_state',
          members: Array.from(voiceRoomPeers.values()),
        });
        return;
      }

      if (type === 'inbox:chat_send') {
        const sender = clients.get(ws);
        if (!sender) return;
        const channel = msg.channel === 'dm' ? 'dm' : 'global';
        const recipientId =
          channel === 'dm' && typeof msg.recipientId === 'string'
            ? msg.recipientId.trim().slice(0, 128)
            : null;
        const recipientName =
          channel === 'dm' && typeof msg.recipientName === 'string'
            ? msg.recipientName.trim().slice(0, 24)
            : null;
        const text = String(msg.text || '').trim().slice(0, 500);
        const rawVoice =
          typeof msg.voiceDataUrl === 'string' &&
          msg.voiceDataUrl.startsWith('data:audio/') &&
          msg.voiceDataUrl.length <= 260000
            ? msg.voiceDataUrl
            : null;
        const voiceDurationSec =
          rawVoice && typeof msg.voiceDurationSec === 'number'
            ? Math.max(1, Math.min(60, Math.round(msg.voiceDurationSec)))
            : undefined;
        if (!text && !rawVoice) return;

        const relayMsg: InboxRelayMessage = {
          messageId: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          channel,
          senderId: sender.playerId,
          senderName: sender.username,
          recipientId,
          recipientName,
          text: text || (rawVoice ? 'Tin nhắn thoại' : ''),
          voiceDataUrl: rawVoice,
          voiceDurationSec,
          createdAtMs: Date.now(),
        };

        if (channel === 'global') {
          globalInboxHistory.push(relayMsg);
          if (globalInboxHistory.length > 75) {
            globalInboxHistory.shift();
          }
          for (const targetWs of clients.keys()) {
            sendJson(targetWs, { type: 'inbox:chat_message', message: relayMsg });
          }
        } else if (recipientId) {
          // Persist DM even when recipient is currently offline so they receive it on reconnect
          dmInboxHistory.push(relayMsg);
          if (dmInboxHistory.length > 500) {
            dmInboxHistory = dmInboxHistory.slice(-500);
          }
          saveJsonArray(DM_HISTORY_FILE, dmInboxHistory);

          for (const [targetWs, badge] of clients.entries()) {
            if (badge.playerId === recipientId || badge.playerId === sender.playerId) {
              sendJson(targetWs, { type: 'inbox:chat_message', message: relayMsg });
            }
          }
        }
        return;
      }

      if (type === 'voice:room_join') {
        const sender = clients.get(ws);
        if (!sender) return;
        const existingPeers = Array.from(voiceRoomPeers.values())
          .filter((m) => m.playerId !== sender.playerId)
          .map((m) => m.playerId);
        voiceRoomPeers.set(ws, {
          playerId: sender.playerId,
          username: sender.username,
          micMuted: Boolean(msg.micMuted),
        });
        sendJson(ws, {
          type: 'voice:room_peers_for_offer',
          peerIds: existingPeers,
        });
        broadcastVoiceRoomState();
        return;
      }

      if (type === 'voice:room_mute') {
        const current = voiceRoomPeers.get(ws);
        if (current) {
          current.micMuted = Boolean(msg.micMuted);
          broadcastVoiceRoomState();
        }
        return;
      }

      if (type === 'voice:room_leave') {
        if (voiceRoomPeers.delete(ws)) {
          broadcastVoiceRoomState();
        }
        return;
      }

      if (type === 'rtc:signal') {
        const sender = clients.get(ws);
        if (!sender) return;
        const toPlayerId = String(msg.toPlayerId || '').trim();
        if (!toPlayerId) return;
        const payload = {
          type: 'rtc:signal',
          fromPlayerId: sender.playerId,
          fromUsername: sender.username,
          signalType: String(msg.signalType || ''),
          sdp: msg.sdp ?? null,
          candidate: msg.candidate ?? null,
          mode: msg.mode === 'direct' ? 'direct' : 'room',
        };
        for (const [targetWs, badge] of clients.entries()) {
          if (badge.playerId === toPlayerId && targetWs !== ws) {
            sendJson(targetWs, payload);
          }
        }
        return;
      }

      if (type === 'admin:kick') {
        const adminEmail = String(msg.adminEmail || '').toLowerCase();
        if (!adminSockets.has(ws) || adminEmail !== 'bot522409@gmail.com') {
          return;
        }
        const targetPlayerId = String(msg.targetPlayerId || '').trim();
        if (!targetPlayerId) return;
        const myBadge = clients.get(ws);
        if (myBadge && myBadge.playerId === targetPlayerId) return;
        const reason = String(
          msg.reason || 'Bạn đã bị Quản Trị Viên mời khỏi phiên chơi.',
        ).slice(0, 140);

        for (const [targetWs, badge] of Array.from(clients.entries())) {
          if (badge.playerId === targetPlayerId) {
            sendJson(targetWs, { type: 'admin:kicked', reason });
            leaveCurrentRoom(targetWs);
            if (plazaUsers.delete(targetWs)) {
              broadcastPlazaState();
            }
            clients.delete(targetWs);
            adminSockets.delete(targetWs);
            setTimeout(() => {
              try {
                targetWs.close(4003, 'Kicked by Admin');
              } catch {
                // ignore
              }
            }, 80);
          }
        }
        broadcastPresence();
        return;
      }

      if (type === 'plaza:join') {
        const badge = clients.get(ws);
        if (!badge) return;
        const zone = sanitizePlazaZone(msg.zone);
        const rawX = Number(msg.x);
        const rawY = Number(msg.y);
        const userState: PlazaUserState = {
          playerId: badge.playerId,
          username: badge.username,
          kickerId: String(msg.kickerId || badge.kickerId || 'ronaldo').slice(0, 32),
          skinId: String(msg.skinId || 'default').slice(0, 32),
          auraId: String(msg.auraId || 'emerald_wind').slice(0, 32),
          zone,
          x: Number.isFinite(rawX) ? Math.max(24, Math.min(976, rawX)) : 490,
          y: Number.isFinite(rawY) ? Math.max(24, Math.min(596, rawY)) : 310,
          emote: null,
          emoteUntilMs: 0,
          bubbleText: null,
          bubbleUntilMs: 0,
          joinedAtMs: Date.now(),
        };
        plazaUsers.set(ws, userState);
        sendJson(ws, {
          type: 'plaza:history',
          messages: plazaChatHistory,
        });
        broadcastPlazaState();
        return;
      }

      if (type === 'plaza:move') {
        const user = plazaUsers.get(ws);
        if (!user) return;
        const rawX = Number(msg.x);
        const rawY = Number(msg.y);
        if (Number.isFinite(rawX)) user.x = Math.max(24, Math.min(976, rawX));
        if (Number.isFinite(rawY)) user.y = Math.max(24, Math.min(596, rawY));
        user.zone = sanitizePlazaZone(msg.zone);
        broadcastPlazaState();
        return;
      }

      if (type === 'plaza:update_avatar') {
        const user = plazaUsers.get(ws);
        if (!user) return;
        if (typeof msg.kickerId === 'string') user.kickerId = msg.kickerId.slice(0, 32);
        if (typeof msg.skinId === 'string') user.skinId = msg.skinId.slice(0, 32);
        if (typeof msg.auraId === 'string') user.auraId = msg.auraId.slice(0, 32);
        broadcastPlazaState();
        return;
      }

      if (type === 'plaza:emote') {
        const user = plazaUsers.get(ws);
        if (!user) return;
        const emote = String(msg.emote || '').trim().slice(0, 36);
        user.emote = emote || null;
        user.emoteUntilMs = emote ? Date.now() + 4800 : 0;
        broadcastPlazaState();
        return;
      }

      if (type === 'plaza:chat') {
        const user = plazaUsers.get(ws);
        if (!user) return;
        const text = String(msg.text || '').trim().slice(0, 260);
        if (!text) return;
        const now = Date.now();
        user.bubbleText = text.slice(0, 84);
        user.bubbleUntilMs = now + 5600;
        const chatMsg: PlazaChatMessage = {
          messageId: `plz_${now}_${Math.random().toString(36).slice(2, 7)}`,
          kind: 'chat',
          playerId: user.playerId,
          username: user.username,
          kickerId: user.kickerId,
          zone: user.zone,
          text,
          createdAtMs: now,
        };
        plazaChatHistory.push(chatMsg);
        if (plazaChatHistory.length > 80) plazaChatHistory.shift();
        for (const targetWs of plazaUsers.keys()) {
          sendJson(targetWs, { type: 'plaza:chat_message', message: chatMsg });
        }
        broadcastPlazaState();
        return;
      }

      if (type === 'plaza:activity') {
        const user = plazaUsers.get(ws);
        if (!user) return;
        const text = String(msg.text || '').trim().slice(0, 200);
        if (!text) return;
        const now = Date.now();
        const actMsg: PlazaChatMessage = {
          messageId: `plza_${now}_${Math.random().toString(36).slice(2, 7)}`,
          kind: 'activity',
          playerId: user.playerId,
          username: user.username,
          kickerId: user.kickerId,
          zone: sanitizePlazaZone(msg.zone ?? user.zone),
          text,
          createdAtMs: now,
        };
        plazaChatHistory.push(actMsg);
        if (plazaChatHistory.length > 80) plazaChatHistory.shift();
        for (const targetWs of plazaUsers.keys()) {
          sendJson(targetWs, { type: 'plaza:chat_message', message: actMsg });
        }
        return;
      }

      if (type === 'plaza:leave') {
        if (plazaUsers.delete(ws)) {
          broadcastPlazaState();
        }
        return;
      }

      if (type === 'room:create') {
        createAndPairRoom(ws);
        return;
      }

      if (type === 'room:join') {
        const code = String(msg.code || '').trim().toUpperCase();
        const targetRoomId = roomByCode.get(code);
        const room = targetRoomId ? rooms.get(targetRoomId) : undefined;
        if (!room || room.status !== 'waiting' || room.players.length >= 2) {
          sendJson(ws, {
            type: 'room:error',
            message: `Không tìm thấy phòng "${code}" đang chờ đấu.`,
          });
          return;
        }
        if (room.players.some((p) => p.ws === ws)) return;

        leaveCurrentRoom(ws);
        const badge = clients.get(ws);
        if (!badge) return;

        room.players.push({
          ...badge,
          slot: 'p2',
          score: 0,
          ws,
        });
        room.status = 'playing';
        socketRoom.set(ws, room.roomId);

        const serialized = serializeRoom(room);
        sendJson(ws, {
          type: 'room:joined',
          room: serialized,
          yourSlot: 'p2',
        });
        broadcastRoom(room, { type: 'room:ready', room: serialized });
        broadcastPresence();
        startRoomTurn(room, 1);
        return;
      }

      if (type === 'queue:join') {
        if (matchmakingQueue.includes(ws)) {
          sendJson(ws, { type: 'queue:status', waiting: true });
          return;
        }
        leaveCurrentRoom(ws);
        const myBadge = clients.get(ws);
        const oppIdx = matchmakingQueue.findIndex((otherWs) => {
          if (otherWs === ws || otherWs.readyState !== WebSocket.OPEN) return false;
          const otherBadge = clients.get(otherWs);
          return !myBadge || !otherBadge || otherBadge.playerId !== myBadge.playerId;
        });

        if (oppIdx >= 0) {
          const oppWs = matchmakingQueue.splice(oppIdx, 1)[0];
          createAndPairRoom(oppWs, ws);
        } else {
          matchmakingQueue.push(ws);
          sendJson(ws, { type: 'queue:status', waiting: true });
          broadcastPresence();
        }
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom(ws);
        return;
      }

      if (type === 'duel:challenge_send') {
        const sender = clients.get(ws);
        if (!sender) return;
        const targetPlayerId = String(msg.targetPlayerId || '').trim();
        if (!targetPlayerId || targetPlayerId === sender.playerId) return;

        let delivered = false;
        let busyInDuel = false;
        const challengeId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const liveSender = resolveLiveBadgeForSocket(ws, sender);

        for (const [targetWs, badge] of clients.entries()) {
          if (badge.playerId !== targetPlayerId || targetWs.readyState !== WebSocket.OPEN) continue;
          const targetRoomId = socketRoom.get(targetWs);
          const targetRoom = targetRoomId ? rooms.get(targetRoomId) : undefined;
          if (targetRoom && targetRoom.status === 'playing') {
            busyInDuel = true;
            continue;
          }
          sendJson(targetWs, {
            type: 'duel:challenge_incoming',
            challengeId,
            from: liveSender,
          });
          delivered = true;
        }

        if (!delivered) {
          sendJson(ws, {
            type: 'room:error',
            message: busyInDuel
              ? 'Người chơi này đang bận trong một trận đấu 1v1 khác.'
              : 'Người chơi này hiện không kết nối trực tuyến thời gian thực để nhận lời mời.',
          });
        }
        return;
      }

      if (type === 'duel:challenge_accept') {
        const acceptor = clients.get(ws);
        if (!acceptor) return;
        const challengerId = String(msg.challengerId || '').trim();
        if (!challengerId) return;

        let challengerWs: WebSocket | null = null;
        for (const [cWs, badge] of clients.entries()) {
          if (badge.playerId === challengerId && cWs.readyState === WebSocket.OPEN) {
            const cRoomId = socketRoom.get(cWs);
            const cRoom = cRoomId ? rooms.get(cRoomId) : undefined;
            if (!cRoom || cRoom.status !== 'playing') {
              challengerWs = cWs;
              break;
            }
          }
        }

        if (!challengerWs) {
          sendJson(ws, {
            type: 'room:error',
            message: 'Người thách đấu đã rời kết nối hoặc đang đấu trận khác.',
          });
          return;
        }
        createAndPairRoom(challengerWs, ws);
        return;
      }

      if (type === 'duel:challenge_decline') {
        const sender = clients.get(ws);
        const challengerId = String(msg.challengerId || '').trim();
        if (!sender || !challengerId) return;
        for (const [cWs, badge] of clients.entries()) {
          if (badge.playerId === challengerId && cWs.readyState === WebSocket.OPEN) {
            sendJson(cWs, {
              type: 'duel:challenge_declined',
              byUsername: sender.username,
            });
          }
        }
        return;
      }

      const roomId = socketRoom.get(ws);
      const room = roomId ? rooms.get(roomId) : undefined;
      if (!room || room.status !== 'playing') return;

      const sender = room.players.find((p) => p.ws === ws);
      if (!sender) return;

      if (type === 'duel:emote') {
        const emote = String(msg.emote || '').slice(0, 32);
        if (emote) {
          broadcastRoom(room, {
            type: 'duel:emote',
            fromUsername: sender.username,
            emote,
          });
        }
        return;
      }

      if (type === 'duel:kick') {
        if (
          sender.slot !== room.shooterSlot ||
          room.turnPhase !== 'aiming' ||
          Number(msg.turn) !== room.turn
        ) {
          return;
        }
        room.pendingShot = {
          aim: msg.aim as { x: number; y: number },
          power: Number(msg.power || 0.72),
          spin: msg.spin as { curve: number; dip: number },
          kickerId: String(msg.kickerId || sender.kickerId || 'ronaldo'),
        };

        if (room.pendingGkDive) {
          executeRoomTurnAnimation(room);
        } else {
          room.turnPhase = 'gk_react';
          const reactDeadlineMs = Date.now() + 1500;
          broadcastRoom(room, {
            type: 'duel:shot_alert',
            reactDeadlineMs,
          });
          room.reactTimer = setTimeout(() => {
            if (room.status === 'playing' && room.turnPhase === 'gk_react') {
              executeRoomTurnAnimation(room);
            }
          }, 1500);
        }
        return;
      }

      if (type === 'duel:gk_dive') {
        if (
          sender.slot === room.shooterSlot ||
          Number(msg.turn) !== room.turn ||
          room.turnPhase === 'animating' ||
          room.turnPhase === 'round_pause'
        ) {
          return;
        }
        const dir =
          msg.dir === 'left' || msg.dir === 'right' ? msg.dir : 'center';
        room.pendingGkDive = {
          dir,
          targetX: typeof msg.targetX === 'number' ? msg.targetX : undefined,
          targetY: typeof msg.targetY === 'number' ? msg.targetY : undefined,
        };
        if (room.turnPhase === 'gk_react' && room.pendingShot) {
          executeRoomTurnAnimation(room);
        }
        return;
      }

      if (type === 'duel:turn_result') {
        if (
          sender.slot !== room.shooterSlot ||
          Number(msg.turn) !== room.turn ||
          room.turnPhase !== 'animating'
        ) {
          return;
        }
        finalizeRoomTurn(
          room,
          Boolean(msg.isGoal),
          String(msg.outcomeTitle || ''),
        );
      }
    });

    ws.on('close', () => {
      if (voiceRoomPeers.delete(ws)) {
        broadcastVoiceRoomState();
      }
      if (plazaUsers.delete(ws)) {
        broadcastPlazaState();
      }
      leaveCurrentRoom(ws);
      adminSockets.delete(ws);
      clients.delete(ws);
      broadcastPresence();
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sút Phạt 3D Online server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
