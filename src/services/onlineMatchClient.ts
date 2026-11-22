import { AimTarget, GoalkeeperId, KickScenario, KickerId, SpinInput } from '../game/types';

export type OnlinePlayerActivity = 'menu' | 'playing' | 'queue' | 'waiting' | 'duel';

export interface OnlinePlayerBadge {
  playerId: string;
  username: string;
  squadOvr: number;
  elo: number;
  kickerId: KickerId;
  gkId: GoalkeeperId;
  isGuest?: boolean;
  activity?: OnlinePlayerActivity;
  modeLabel?: string;
  waitingRoomCode?: string | null;
}

export interface OnlineOpenRoom {
  roomId: string;
  code: string;
  hostPlayerId: string;
  hostUsername: string;
  hostOvr: number;
  hostElo: number;
}

export interface OnlineRoomPlayer extends OnlinePlayerBadge {
  slot: 'p1' | 'p2';
  score: number;
}

export interface OnlineRoomState {
  roomId: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  players: OnlineRoomPlayer[];
  turn: number;
  maxTurns: number;
  shooterSlot: 'p1' | 'p2';
  scenario: KickScenario;
  turnPhase: 'aiming' | 'gk_react' | 'animating' | 'round_pause';
  turnDeadlineMs: number;
  winnerSlot: 'p1' | 'p2' | 'draw' | null;
}

export interface OnlineShotLaunchPayload {
  roomId: string;
  turn: number;
  aim: AimTarget;
  power: number;
  spin: SpinInput;
  kickerId: KickerId;
  gkDive: {
    dir: 'left' | 'center' | 'right';
    targetX?: number;
    targetY?: number;
  } | null;
  gkId: GoalkeeperId;
}

export interface OnlinePresenceInfo {
  onlineCount: number;
  activeRoomsCount: number;
  inQueueCount: number;
  playersPreview: OnlinePlayerBadge[];
  openRooms?: OnlineOpenRoom[];
}

export interface InboxChatMessage {
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

export interface VoiceRoomMember {
  playerId: string;
  username: string;
  micMuted: boolean;
}

export type PlazaZoneId =
  | 'plaza'
  | 'disco'
  | 'hotel'
  | 'hotel_lobby'
  | 'hotel_suite'
  | 'hotel_rooftop'
  | 'arcade';

export type PlazaAvatarPose = 'stand' | 'sit' | 'sleep' | 'bath' | 'swim' | 'dance';

export interface PlazaUserState {
  playerId: string;
  username: string;
  kickerId: string;
  skinId: string;
  auraId: string;
  zone: PlazaZoneId;
  x: number;
  y: number;
  pose?: PlazaAvatarPose;
  emote: string | null;
  emoteUntilMs: number;
  bubbleText: string | null;
  bubbleUntilMs: number;
  joinedAtMs: number;
}

export interface PlazaChatMessage {
  messageId: string;
  kind: 'chat' | 'activity';
  playerId: string;
  username: string;
  kickerId: string;
  zone: PlazaZoneId;
  text: string;
  createdAtMs: number;
}

export type OnlineServerEvent =
  | { type: 'presence:state'; data: OnlinePresenceInfo }
  | { type: 'queue:status'; waiting: boolean }
  | { type: 'room:joined'; room: OnlineRoomState; yourSlot: 'p1' | 'p2' }
  | { type: 'room:ready'; room: OnlineRoomState }
  | { type: 'duel:turn_start'; room: OnlineRoomState }
  | { type: 'duel:shot_alert'; reactDeadlineMs: number }
  | { type: 'duel:execute'; payload: OnlineShotLaunchPayload; room: OnlineRoomState }
  | {
      type: 'duel:score_update';
      room: OnlineRoomState;
      lastTurnOutcome: {
        turn: number;
        shooterSlot: 'p1' | 'p2';
        isGoal: boolean;
        outcomeTitle: string;
      };
    }
  | { type: 'duel:match_over'; room: OnlineRoomState; reason?: 'forfeit' | 'normal' }
  | { type: 'duel:emote'; fromUsername: string; emote: string }
  | { type: 'duel:challenge_incoming'; challengeId: string; from: OnlinePlayerBadge }
  | { type: 'duel:challenge_declined'; byUsername: string }
  | { type: 'admin:kicked'; reason: string }
  | { type: 'room:error'; message: string }
  | { type: 'inbox:history'; messages: InboxChatMessage[] }
  | { type: 'inbox:chat_message'; message: InboxChatMessage }
  | { type: 'voice:room_state'; members: VoiceRoomMember[] }
  | { type: 'voice:room_peers_for_offer'; peerIds: string[] }
  | { type: 'plaza:state'; users: PlazaUserState[] }
  | { type: 'plaza:history'; messages: PlazaChatMessage[] }
  | { type: 'plaza:chat_message'; message: PlazaChatMessage }
  | {
      type: 'rtc:signal';
      fromPlayerId: string;
      fromUsername: string;
      signalType: string;
      sdp: RTCSessionDescriptionInit | null;
      candidate: RTCIceCandidateInit | null;
      mode: 'direct' | 'room';
    };

type EventListener = (event: OnlineServerEvent) => void;
type ConnectionListener = (connected: boolean) => void;

class OnlineMatchClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private connListeners = new Set<ConnectionListener>();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private currentPlayer: OnlinePlayerBadge | null = null;
  private adminEmail: string | undefined = undefined;
  private connected = false;
  private manualClose = false;

  public connect(player: OnlinePlayerBadge, adminEmail?: string): void {
    this.currentPlayer = player;
    this.adminEmail = adminEmail;
    this.manualClose = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'presence:hello', player, adminEmail });
      }
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws/online`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.notifyConn();
      if (this.currentPlayer) {
        this.send({
          type: 'presence:hello',
          player: this.currentPlayer,
          adminEmail: this.adminEmail,
        });
      }
      if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(String(msg.data)) as OnlineServerEvent;
        if (parsed.type === 'admin:kicked') {
          this.manualClose = true;
        }
        this.listeners.forEach((fn) => fn(parsed));
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = (ev) => {
      this.connected = false;
      this.notifyConn();
      if (this.heartbeatTimer) {
        window.clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      if (!this.manualClose && ev.code !== 4003) {
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => {
          if (this.currentPlayer) this.connect(this.currentPlayer, this.adminEmail);
        }, 2500);
      }
    };

    ws.onerror = () => {
      // handled cleanly via onclose reconnect
    };
  }

  public updatePlayerBadge(player: OnlinePlayerBadge, adminEmail?: string): void {
    this.currentPlayer = player;
    this.adminEmail = adminEmail;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'presence:hello', player, adminEmail });
    }
  }

  public sendAdminKick(
    targetPlayerId: string,
    adminEmail: string,
    reason?: string,
  ): void {
    this.send({ type: 'admin:kick', targetPlayerId, adminEmail, reason });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public onEvent(fn: EventListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public onConnectionChange(fn: ConnectionListener): () => void {
    this.connListeners.add(fn);
    fn(this.connected);
    return () => this.connListeners.delete(fn);
  }

  public createRoom(): void {
    this.send({ type: 'room:create' });
  }

  public joinRoom(code: string): void {
    this.send({ type: 'room:join', code: code.trim().toUpperCase() });
  }

  public joinQuickMatch(): void {
    this.send({ type: 'queue:join' });
  }

  public requestPresenceSync(): void {
    this.send({ type: 'presence:request' });
  }

  public sendChallenge(targetPlayerId: string): void {
    this.send({ type: 'duel:challenge_send', targetPlayerId });
  }

  public acceptChallenge(challengeId: string, challengerId: string): void {
    this.send({ type: 'duel:challenge_accept', challengeId, challengerId });
  }

  public declineChallenge(challengeId: string, challengerId: string): void {
    this.send({ type: 'duel:challenge_decline', challengeId, challengerId });
  }

  public leaveQueueOrRoom(roomId?: string): void {
    this.send({ type: 'room:leave', roomId });
  }

  public sendKick(
    roomId: string,
    turn: number,
    aim: AimTarget,
    power: number,
    spin: SpinInput,
    kickerId: KickerId,
  ): void {
    this.send({ type: 'duel:kick', roomId, turn, aim, power, spin, kickerId });
  }

  public sendGkDive(
    roomId: string,
    turn: number,
    dir: 'left' | 'center' | 'right',
    targetX?: number,
    targetY?: number,
  ): void {
    this.send({ type: 'duel:gk_dive', roomId, turn, dir, targetX, targetY });
  }

  public sendTurnResult(
    roomId: string,
    turn: number,
    isGoal: boolean,
    outcomeTitle: string,
  ): void {
    this.send({ type: 'duel:turn_result', roomId, turn, isGoal, outcomeTitle });
  }

  public sendEmote(roomId: string, emote: string): void {
    this.send({ type: 'duel:emote', roomId, emote });
  }

  public requestInboxHistory(): void {
    this.send({ type: 'inbox:history_request' });
  }

  public sendInboxMessage(params: {
    channel: 'global' | 'dm';
    recipientId?: string | null;
    recipientName?: string | null;
    text: string;
    voiceDataUrl?: string | null;
    voiceDurationSec?: number;
  }): void {
    this.send({
      type: 'inbox:chat_send',
      channel: params.channel,
      recipientId: params.recipientId ?? null,
      recipientName: params.recipientName ?? null,
      text: params.text,
      voiceDataUrl: params.voiceDataUrl ?? null,
      voiceDurationSec: params.voiceDurationSec,
    });
  }

  public joinVoiceRoom(micMuted = false): void {
    this.send({ type: 'voice:room_join', micMuted });
  }

  public setVoiceRoomMuted(micMuted: boolean): void {
    this.send({ type: 'voice:room_mute', micMuted });
  }

  public leaveVoiceRoom(): void {
    this.send({ type: 'voice:room_leave' });
  }

  public sendRtcSignal(params: {
    toPlayerId: string;
    signalType: string;
    sdp?: RTCSessionDescriptionInit | null;
    candidate?: RTCIceCandidateInit | null;
    mode?: 'direct' | 'room';
  }): void {
    this.send({
      type: 'rtc:signal',
      toPlayerId: params.toPlayerId,
      signalType: params.signalType,
      sdp: params.sdp ?? null,
      candidate: params.candidate ?? null,
      mode: params.mode ?? 'room',
    });
  }

  public joinPlaza(params: {
    kickerId: string;
    skinId: string;
    auraId: string;
    zone: PlazaZoneId;
    x: number;
    y: number;
    pose?: PlazaAvatarPose;
  }): void {
    this.send({ type: 'plaza:join', ...params });
  }

  public moveInPlaza(
    x: number,
    y: number,
    zone: PlazaZoneId,
    pose?: PlazaAvatarPose,
  ): void {
    this.send({ type: 'plaza:move', x, y, zone, pose });
  }

  public updatePlazaAvatar(kickerId: string, skinId: string, auraId: string): void {
    this.send({ type: 'plaza:update_avatar', kickerId, skinId, auraId });
  }

  public sendPlazaEmote(emote: string): void {
    this.send({ type: 'plaza:emote', emote });
  }

  public sendPlazaChat(text: string): void {
    this.send({ type: 'plaza:chat', text });
  }

  public sendPlazaActivity(text: string, zone: PlazaZoneId): void {
    this.send({ type: 'plaza:activity', text, zone });
  }

  public leavePlaza(): void {
    this.send({ type: 'plaza:leave' });
  }

  private notifyConn(): void {
    this.connListeners.forEach((fn) => fn(this.connected));
  }

  private send(payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}

export const onlineMatchClient = new OnlineMatchClient();
