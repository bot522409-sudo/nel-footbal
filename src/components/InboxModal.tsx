import {
  Globe,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Search,
  Send,
  Square,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Language } from '../game/fcData';
import {
  DirectoryPlayerEntry,
  OnlineAccountProfile,
  sendCloudInboxMessage,
  subscribeCloudDmInbox,
  subscribeCloudGlobalInbox,
  subscribeDirectoryPlayers,
} from '../services/onlineClubService';
import {
  InboxChatMessage,
  onlineMatchClient,
  OnlinePlayerBadge,
  VoiceRoomMember,
} from '../services/onlineMatchClient';

interface InboxModalProps {
  lang: Language;
  account: OnlineAccountProfile | null;
  currentPlayerId: string;
  displayUsername: string;
  wsConnected: boolean;
  onlinePlayers: OnlinePlayerBadge[];
  initialChannel?: 'global' | 'dm' | 'voice';
  initialRecipient?: { id: string; name: string } | null;
  onClose: () => void;
}

const RTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function formatTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function InboxModal({
  lang,
  account,
  currentPlayerId,
  displayUsername,
  wsConnected,
  onlinePlayers,
  initialChannel = 'global',
  initialRecipient = null,
  onClose,
}: InboxModalProps) {
  const isVi = lang === 'vi';
  const [tab, setTab] = useState<'global' | 'dm' | 'voice'>(initialChannel);
  const [selectedDmTarget, setSelectedDmTarget] = useState<{
    id: string;
    name: string;
  } | null>(initialRecipient);
  const [dmSearch, setDmSearch] = useState('');
  const [directoryPlayers, setDirectoryPlayers] = useState<
    DirectoryPlayerEntry[]
  >([]);
  const [draftText, setDraftText] = useState('');
  const [wsMessages, setWsMessages] = useState<InboxChatMessage[]>([]);
  const [cloudGlobalMessages, setCloudGlobalMessages] = useState<
    InboxChatMessage[]
  >([]);
  const [cloudDmMessages, setCloudDmMessages] = useState<InboxChatMessage[]>(
    [],
  );

  // Voice Note (MediaRecorder) state
  const [recordingVoiceNote, setRecordingVoiceNote] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartMsRef = useRef<number>(0);

  // WebRTC Live Voice Room state
  const [inVoiceRoom, setInVoiceRoom] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceRoomMember[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<
    Array<{ peerId: string; stream: MediaStream }>
  >([]);
  const localVoiceStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const otherOnlinePlayers = useMemo(
    () => onlinePlayers.filter((p) => p.playerId !== currentPlayerId),
    [onlinePlayers, currentPlayerId],
  );

  // Subscribe to public directory so Inbox lists ALL registered players (including offline)
  useEffect(() => {
    return subscribeDirectoryPlayers(setDirectoryPlayers);
  }, []);

  // Subscribe to Firestore persistent inbox when signed in
  useEffect(() => {
    if (!account) {
      setCloudGlobalMessages([]);
      setCloudDmMessages([]);
      return;
    }
    const unsubGlobal = subscribeCloudGlobalInbox((rows) => {
      setCloudGlobalMessages(
        rows.map((r) => ({
          messageId: r.messageId,
          channel: 'global',
          senderId: r.senderUid,
          senderName: r.senderName,
          recipientId: null,
          recipientName: null,
          text: r.text,
          createdAtMs: r.createdAtMs,
        })),
      );
    });
    const unsubDm = subscribeCloudDmInbox(account.uid, (rows) => {
      setCloudDmMessages(
        rows.map((r) => ({
          messageId: r.messageId,
          channel: 'dm',
          senderId: r.senderUid,
          senderName: r.senderName,
          recipientId: r.recipientUid,
          recipientName: r.recipientName,
          text: r.text,
          createdAtMs: r.createdAtMs,
        })),
      );
    });
    return () => {
      unsubGlobal();
      unsubDm();
    };
  }, [account]);

  const closePeerConnection = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      peersRef.current.delete(peerId);
    }
    setRemoteStreams((prev) => prev.filter((item) => item.peerId !== peerId));
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_ICE_SERVERS);
      const localStream = localVoiceStreamRef.current;
      if (localStream) {
        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream);
        }
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          onlineMatchClient.sendRtcSignal({
            toPlayerId: peerId,
            signalType: 'ice-candidate',
            candidate: ev.candidate.toJSON(),
            mode: 'room',
          });
        }
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams[0];
        if (!stream) return;
        setRemoteStreams((prev) => {
          const without = prev.filter((item) => item.peerId !== peerId);
          return [...without, { peerId, stream }];
        });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed' ||
          pc.connectionState === 'disconnected'
        ) {
          closePeerConnection(peerId);
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [closePeerConnection],
  );

  // WebSocket listeners for Inbox chat & WebRTC signaling
  useEffect(() => {
    onlineMatchClient.requestInboxHistory();
    const unsub = onlineMatchClient.onEvent((event) => {
      switch (event.type) {
        case 'inbox:history':
          setWsMessages(event.messages);
          break;
        case 'inbox:chat_message':
          setWsMessages((prev) => {
            if (prev.some((m) => m.messageId === event.message.messageId)) {
              return prev;
            }
            return [...prev.slice(-140), event.message];
          });
          break;
        case 'voice:room_state':
          setVoiceMembers(event.members);
          break;
        case 'voice:room_peers_for_offer': {
          for (const peerId of event.peerIds) {
            if (peerId === currentPlayerId) continue;
            const pc = createPeerConnection(peerId);
            void (async () => {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                onlineMatchClient.sendRtcSignal({
                  toPlayerId: peerId,
                  signalType: 'offer',
                  sdp: pc.localDescription,
                  mode: 'room',
                });
              } catch {
                // ignore transient SDP negotiation failures
              }
            })();
          }
          break;
        }
        case 'rtc:signal': {
          const fromId = event.fromPlayerId;
          if (!localVoiceStreamRef.current) return;
          const pc = createPeerConnection(fromId);
          void (async () => {
            try {
              if (event.signalType === 'offer' && event.sdp) {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(event.sdp),
                );
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                onlineMatchClient.sendRtcSignal({
                  toPlayerId: fromId,
                  signalType: 'answer',
                  sdp: pc.localDescription,
                  mode: 'room',
                });
              } else if (event.signalType === 'answer' && event.sdp) {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(event.sdp),
                );
              } else if (
                event.signalType === 'ice-candidate' &&
                event.candidate
              ) {
                await pc.addIceCandidate(new RTCIceCandidate(event.candidate));
              }
            } catch {
              // ignore signaling errors if peer left
            }
          })();
          break;
        }
      }
    });
    return () => unsub();
  }, [createPeerConnection, currentPlayerId]);

  const leaveVoiceRoomCleanup = useCallback(() => {
    onlineMatchClient.leaveVoiceRoom();
    setInVoiceRoom(false);
    setMicMuted(false);
    for (const peerId of Array.from(peersRef.current.keys())) {
      closePeerConnection(peerId);
    }
    if (localVoiceStreamRef.current) {
      for (const track of localVoiceStreamRef.current.getTracks()) {
        track.stop();
      }
      localVoiceStreamRef.current = null;
    }
    setRemoteStreams([]);
  }, [closePeerConnection]);

  // Cleanup recording & voice room on modal close
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recordStreamRef.current) {
        for (const track of recordStreamRef.current.getTracks()) {
          track.stop();
        }
      }
      leaveVoiceRoomCleanup();
    };
  }, [leaveVoiceRoomCleanup]);

  // Attach remote WebRTC MediaStreams to hidden <audio> elements
  useEffect(() => {
    for (const { peerId, stream } of remoteStreams) {
      const audioEl = audioElsRef.current.get(peerId);
      if (audioEl && audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        void audioEl.play().catch(() => {
          // autoplay policy handled once user has interacted
        });
      }
    }
  }, [remoteStreams]);

  const mergedMessages = useMemo(() => {
    const map = new Map<string, InboxChatMessage>();
    const combined = [...cloudGlobalMessages, ...cloudDmMessages, ...wsMessages];
    for (const msg of combined) {
      if (!map.has(msg.messageId)) {
        map.set(msg.messageId, msg);
      } else {
        const prev = map.get(msg.messageId)!;
        if (!prev.voiceDataUrl && msg.voiceDataUrl) {
          map.set(msg.messageId, msg);
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.createdAtMs - b.createdAtMs,
    );
  }, [cloudGlobalMessages, cloudDmMessages, wsMessages]);

  const visibleMessages = useMemo(() => {
    if (tab === 'global') {
      return mergedMessages.filter((m) => m.channel === 'global');
    }
    if (tab === 'dm') {
      if (!selectedDmTarget) return [];
      return mergedMessages.filter(
        (m) =>
          m.channel === 'dm' &&
          ((m.senderId === currentPlayerId &&
            m.recipientId === selectedDmTarget.id) ||
            (m.senderId === selectedDmTarget.id &&
              m.recipientId === currentPlayerId)),
      );
    }
    return [];
  }, [mergedMessages, tab, selectedDmTarget, currentPlayerId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length, tab, selectedDmTarget?.id]);

  // Available DM conversation partners (online players + registered directory + historical DM contacts)
  const dmContacts = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; online: boolean; squadOvr?: number }
    >();
    for (const op of otherOnlinePlayers) {
      map.set(op.playerId, {
        id: op.playerId,
        name: op.username,
        online: true,
        squadOvr: op.squadOvr,
      });
    }
    for (const dir of directoryPlayers) {
      if (dir.uid === currentPlayerId) continue;
      const existing = map.get(dir.uid);
      if (existing) {
        existing.name = dir.username || existing.name;
        existing.squadOvr = dir.squadOvr;
      } else {
        map.set(dir.uid, {
          id: dir.uid,
          name: dir.username,
          online: false,
          squadOvr: dir.squadOvr,
        });
      }
    }
    for (const msg of mergedMessages) {
      if (msg.channel !== 'dm') continue;
      if (msg.senderId !== currentPlayerId && msg.senderName) {
        if (!map.has(msg.senderId)) {
          map.set(msg.senderId, {
            id: msg.senderId,
            name: msg.senderName,
            online: false,
          });
        }
      }
      if (
        msg.recipientId &&
        msg.recipientId !== currentPlayerId &&
        msg.recipientName
      ) {
        if (!map.has(msg.recipientId)) {
          map.set(msg.recipientId, {
            id: msg.recipientId,
            name: msg.recipientName,
            online: false,
          });
        }
      }
    }
    if (selectedDmTarget && !map.has(selectedDmTarget.id)) {
      map.set(selectedDmTarget.id, {
        id: selectedDmTarget.id,
        name: selectedDmTarget.name,
        online: otherOnlinePlayers.some((p) => p.playerId === selectedDmTarget.id),
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if ((b.squadOvr ?? 0) !== (a.squadOvr ?? 0)) {
        return (b.squadOvr ?? 0) - (a.squadOvr ?? 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    otherOnlinePlayers,
    directoryPlayers,
    mergedMessages,
    currentPlayerId,
    selectedDmTarget,
  ]);

  const filteredDmContacts = useMemo(() => {
    const q = dmSearch.trim().toLowerCase();
    if (!q) return dmContacts;
    return dmContacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [dmContacts, dmSearch]);

  const selectedDmOnline = useMemo(() => {
    if (!selectedDmTarget) return false;
    return otherOnlinePlayers.some((p) => p.playerId === selectedDmTarget.id);
  }, [selectedDmTarget, otherOnlinePlayers]);

  const handleSendText = () => {
    const text = draftText.trim();
    if (!text) return;
    if (tab === 'dm' && !selectedDmTarget) return;
    if (!wsConnected && !account) return;

    const channel = tab === 'dm' ? 'dm' : 'global';
    onlineMatchClient.sendInboxMessage({
      channel,
      recipientId: channel === 'dm' ? selectedDmTarget?.id ?? null : null,
      recipientName: channel === 'dm' ? selectedDmTarget?.name ?? null : null,
      text,
    });

    if (account) {
      void sendCloudInboxMessage({
        senderUid: account.uid,
        senderName: displayUsername,
        channel,
        recipientUid: channel === 'dm' ? selectedDmTarget?.id ?? null : null,
        recipientName: channel === 'dm' ? selectedDmTarget?.name ?? null : null,
        text,
      });
    }

    setDraftText('');
  };

  const handleToggleVoiceNoteRecord = async () => {
    setVoiceError(null);
    if (recordingVoiceNote && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingVoiceNote(false);
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        isVi
          ? 'Trình duyệt không hỗ trợ ghi âm Micro.'
          : 'Your browser does not support Microphone recording.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 32000,
      });
      mediaRecorderRef.current = recorder;
      recordStartMsRef.current = Date.now();
      setRecordSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) mediaChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - recordStartMsRef.current) / 1000),
        );
        const blob = new Blob(mediaChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        for (const t of stream.getTracks()) t.stop();
        recordStreamRef.current = null;

        if (blob.size > 260_000) {
          setVoiceError(
            isVi
              ? 'Tin nhắn thoại vượt quá giới hạn dung lượng (~12 giây). Vui lòng thu âm ngắn hơn.'
              : 'Voice clip exceeded max size (~12s). Please record a shorter clip.',
          );
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl) return;
          const channel = tab === 'dm' && selectedDmTarget ? 'dm' : 'global';
          onlineMatchClient.sendInboxMessage({
            channel,
            recipientId: channel === 'dm' ? selectedDmTarget?.id ?? null : null,
            recipientName:
              channel === 'dm' ? selectedDmTarget?.name ?? null : null,
            text: isVi
              ? `Tin nhắn thoại (${durationSec}s)`
              : `Voice note (${durationSec}s)`,
            voiceDataUrl: dataUrl,
            voiceDurationSec: durationSec,
          });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setRecordingVoiceNote(true);
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - recordStartMsRef.current) / 1000,
        );
        setRecordSeconds(elapsed);
        if (elapsed >= 12 && mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecordingVoiceNote(false);
          if (recordTimerRef.current) {
            window.clearInterval(recordTimerRef.current);
            recordTimerRef.current = null;
          }
        }
      }, 250);
    } catch {
      setVoiceError(
        isVi
          ? 'Không truy cập được Micro. Hãy cấp quyền Micro cho trình duyệt để gửi thoại.'
          : 'Microphone access denied. Please allow mic permissions in your browser.',
      );
    }
  };

  const handleJoinVoiceRoom = async () => {
    setVoiceError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        isVi
          ? 'Trình duyệt không hỗ trợ WebRTC Micro.'
          : 'WebRTC Microphone is not supported in this browser.',
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localVoiceStreamRef.current = stream;
      setMicMuted(false);
      setInVoiceRoom(true);
      onlineMatchClient.joinVoiceRoom(false);
    } catch {
      setVoiceError(
        isVi
          ? 'Không thể bật Micro trực tiếp. Vui lòng cấp quyền Micro để vào phòng thoại.'
          : 'Cannot access microphone. Please grant mic permission to join Voice Room.',
      );
    }
  };

  const handleToggleVoiceRoomMute = () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    if (localVoiceStreamRef.current) {
      for (const track of localVoiceStreamRef.current.getAudioTracks()) {
        track.enabled = !nextMuted;
      }
    }
    onlineMatchClient.setVoiceRoomMuted(nextMuted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a14]/88 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl h-[86vh] max-h-[86vh] flex flex-col bg-[#0B1320] border border-sky-400/35 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-[#0d1728]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
              <MessageSquare size={14} />
              <span>
                {isVi
                  ? 'Hộp Thư Trực Tuyến · Chat Thế Giới · Nhắn Riêng & Bật Mic'
                  : 'Online Inbox · Global Chat · DM & Live Voice Mic'}
              </span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white mt-0.5">
              {isVi ? 'HỘP THƯ & PHÒNG THOẠI' : 'INBOX & VOICE CHAT'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-emerald-300">
              @{displayUsername} · {wsConnected ? 'Online' : 'Offline'}
            </span>
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-2.5 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('global')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              tab === 'global'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe size={14} />
            <span>{isVi ? 'Kênh Thế Giới' : 'Global Chat'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('dm')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              tab === 'dm'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>
              {isVi
                ? `Tin Nhắn Riêng (${dmContacts.length})`
                : `Direct Messages (${dmContacts.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('voice')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold border-b-2 transition-colors cursor-pointer ${
              tab === 'voice'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Mic size={14} />
            <span>
              {isVi
                ? `Phòng Mic (${voiceMembers.length})`
                : `Voice Room (${voiceMembers.length})`}
            </span>
          </button>
        </div>

        {voiceError ? (
          <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/45 text-xs font-semibold text-rose-200 flex items-center justify-between gap-2">
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-rose-200 hover:text-white cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        ) : null}

        {/* Hidden Audio Elements for WebRTC Remote Streams */}
        <div className="hidden" aria-hidden="true">
          {remoteStreams.map((item) => (
            <audio
              key={item.peerId}
              autoPlay
              playsInline
              ref={(el) => {
                if (el) {
                  audioElsRef.current.set(item.peerId, el);
                  if (el.srcObject !== item.stream) {
                    el.srcObject = item.stream;
                  }
                } else {
                  audioElsRef.current.delete(item.peerId);
                }
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        {tab === 'voice' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                  <Radio size={15} />
                  <span>
                    {isVi
                      ? 'PHÒNG ĐÀM THOẠI MICRO TRỰC TIẾP (WEBRTC)'
                      : 'LIVE WEBRTC VOICE CHAT ROOM'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  {isVi
                    ? 'Bật Micro để trò chuyện trực tiếp bằng giọng nói với các người chơi đang online khác theo thời gian thực!'
                    : 'Enable your Microphone to talk live in real time with other online players!'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!inVoiceRoom ? (
                  <button
                    type="button"
                    disabled={!wsConnected}
                    onClick={() => void handleJoinVoiceRoom()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Mic size={15} />
                    <span>{isVi ? 'Bật Mic & Vào Phòng' : 'Join & Enable Mic'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleVoiceRoomMute}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-extrabold text-xs cursor-pointer ${
                        micMuted
                          ? 'bg-rose-500 hover:bg-rose-400 text-white'
                          : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                      }`}
                    >
                      {micMuted ? <MicOff size={15} /> : <Mic size={15} />}
                      <span>
                        {micMuted
                          ? isVi
                            ? 'Đang Tắt Mic'
                            : 'Mic Muted'
                          : isVi
                          ? 'Mic Đang Mở'
                          : 'Mic Live'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={leaveVoiceRoomCleanup}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-rose-300 font-extrabold text-xs cursor-pointer"
                    >
                      <PhoneOff size={14} />
                      <span>{isVi ? 'Rời Phòng' : 'Leave'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
              <div className="text-xs font-extrabold text-slate-200">
                {isVi
                  ? `Người Đang Trong Phòng Thoại (${voiceMembers.length})`
                  : `Members in Voice Room (${voiceMembers.length})`}
              </div>
              {voiceMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {isVi
                    ? 'Chưa có ai bật Mic trong phòng thoại. Bấm "Bật Mic & Vào Phòng" để bắt đầu trò chuyện!'
                    : 'No one is in the voice room yet. Click Join & Enable Mic to start talking!'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {voiceMembers.map((m) => (
                    <div
                      key={m.playerId}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            m.micMuted ? 'bg-slate-500' : 'bg-emerald-400'
                          }`}
                        />
                        <span className="text-xs font-bold text-white truncate">
                          @{m.username}
                          {m.playerId === currentPlayerId
                            ? isVi
                              ? ' (Bạn)'
                              : ' (You)'
                            : ''}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          m.micMuted ? 'text-slate-400' : 'text-emerald-300'
                        }`}
                      >
                        {m.micMuted ? <MicOff size={13} /> : <Volume2 size={13} />}
                        <span>{m.micMuted ? 'Muted' : 'Speaking'}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* DM Contact Sidebar */}
            {tab === 'dm' ? (
              <aside className="w-60 sm:w-68 border-r border-white/10 bg-slate-950/60 flex flex-col shrink-0">
                <div className="p-3 border-b border-white/10 space-y-2">
                  <div className="text-[11px] font-extrabold text-slate-300">
                    {isVi
                      ? `NGƯỜI CHƠI (${dmContacts.length})`
                      : `PLAYERS (${dmContacts.length})`}
                  </div>
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={dmSearch}
                      onChange={(e) => setDmSearch(e.target.value)}
                      placeholder={
                        isVi ? 'Tìm tên người chơi...' : 'Search player name...'
                      }
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  {filteredDmContacts.length === 0 ? (
                    <p className="text-[11px] text-slate-500 px-1 py-2 leading-relaxed">
                      {isVi
                        ? 'Không tìm thấy người chơi phù hợp.'
                        : 'No matching players found.'}
                    </p>
                  ) : (
                    filteredDmContacts.map((c) => {
                      const active = selectedDmTarget?.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setSelectedDmTarget({ id: c.id, name: c.name })
                          }
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-500/20 border-sky-400/60 text-white'
                              : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                c.online ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">
                                @{c.name}
                              </div>
                              {typeof c.squadOvr === 'number' ? (
                                <div className="text-[10px] font-mono-tabular text-amber-300">
                                  OVR {c.squadOvr}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold shrink-0 ${
                              c.online ? 'text-emerald-300' : 'text-slate-400'
                            }`}
                          >
                            {c.online ? 'Online' : 'Offline'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>
            ) : null}

            {/* Chat Thread + Input */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {tab === 'dm' && !selectedDmTarget ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400">
                  {isVi
                    ? 'Chọn tên một người chơi ở cột bên trái (kể cả đang Offline) để nhắn tin riêng hoặc gửi ghi âm giọng nói.'
                    : 'Select any player on the left (even if Offline) to send direct messages or voice clips.'}
                </div>
              ) : (
                <>
                  {tab === 'dm' && selectedDmTarget ? (
                    <div className="px-4 py-2 border-b border-white/10 bg-slate-900/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            selectedDmOnline ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <span className="font-bold text-sky-300">
                          {isVi ? 'Đang nhắn với' : 'Chatting with'} @
                          {selectedDmTarget.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            selectedDmOnline
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35'
                              : 'bg-slate-800 text-slate-300 border border-white/10'
                          }`}
                        >
                          {selectedDmOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      {!selectedDmOnline ? (
                        <span className="text-[11px] text-amber-300">
                          {isVi
                            ? 'Người chơi đang Offline — tin nhắn được lưu và gửi đến họ khi online lại.'
                            : 'Player is Offline — messages are saved and delivered when they return.'}
                        </span>
                      ) : !account ? (
                        <span className="text-[11px] text-amber-300">
                          {isVi
                            ? 'Khách: tin nhắn lưu trên máy chủ phiên này (đăng nhập để đồng bộ lâu dài)'
                            : 'Guest: saved on server relay (sign in for cloud sync)'}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {visibleMessages.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        {isVi
                          ? 'Chưa có tin nhắn nào. Hãy gửi lời chào hoặc bấm giữ biểu tượng Mic để gửi tin nhắn thoại!'
                          : 'No messages yet. Say hello or record a voice clip!'}
                      </div>
                    ) : (
                      visibleMessages.map((msg) => {
                        const isMine = msg.senderId === currentPlayerId;
                        const canJumpDm = !isMine && tab === 'global' && msg.senderId;
                        return (
                          <div
                            key={msg.messageId}
                            className={`flex flex-col ${
                              isMine ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                              {canJumpDm ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDmTarget({
                                      id: msg.senderId,
                                      name: msg.senderName,
                                    });
                                    setTab('dm');
                                  }}
                                  title={
                                    isVi
                                      ? `Nhắn tin riêng cho @${msg.senderName}`
                                      : `Direct message @${msg.senderName}`
                                  }
                                  className="font-bold text-sky-300 hover:text-sky-200 underline decoration-dotted cursor-pointer"
                                >
                                  @{msg.senderName}
                                </button>
                              ) : (
                                <span className="font-bold text-slate-300">
                                  @{msg.senderName}
                                </span>
                              )}
                              <span>·</span>
                              <span>{formatTime(msg.createdAtMs)}</span>
                            </div>
                            <div
                              className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed border ${
                                isMine
                                  ? 'bg-emerald-500/20 border-emerald-400/45 text-white'
                                  : 'bg-slate-900 border-white/12 text-slate-100'
                              }`}
                            >
                              {msg.text ? <p>{msg.text}</p> : null}
                              {msg.voiceDataUrl ? (
                                <audio
                                  controls
                                  src={msg.voiceDataUrl}
                                  className="mt-1.5 h-8 max-w-[230px]"
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Composer */}
                  <div className="p-3 border-t border-white/10 bg-[#0d1728] flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!wsConnected}
                      onClick={() => void handleToggleVoiceNoteRecord()}
                      title={
                        recordingVoiceNote
                          ? isVi
                            ? 'Bấm để dừng và gửi tin nhắn thoại'
                            : 'Stop & send voice note'
                          : isVi
                          ? 'Bấm để ghi âm tin nhắn thoại (tối đa 12s)'
                          : 'Record voice clip (max 12s)'
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                        recordingVoiceNote
                          ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse'
                          : 'bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-200'
                      }`}
                    >
                      {recordingVoiceNote ? (
                        <>
                          <Square size={13} fill="currentColor" />
                          <span>{recordSeconds}s</span>
                        </>
                      ) : (
                        <>
                          <Mic size={14} />
                          <span className="hidden sm:inline">
                            {isVi ? 'Gửi Thoại' : 'Voice'}
                          </span>
                        </>
                      )}
                    </button>

                    <input
                      type="text"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendText();
                        }
                      }}
                      placeholder={
                        tab === 'dm' && selectedDmTarget
                          ? isVi
                            ? `Nhắn tin riêng cho @${selectedDmTarget.name}...`
                            : `Message @${selectedDmTarget.name}...`
                          : isVi
                          ? 'Nhập tin nhắn gửi kênh thế giới...'
                          : 'Write a global chat message...'
                      }
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />

                    <button
                      type="button"
                      disabled={(!wsConnected && !account) || !draftText.trim()}
                      onClick={handleSendText}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Send size={14} />
                      <span>{isVi ? 'Gửi' : 'Send'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
