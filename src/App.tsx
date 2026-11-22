/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPanelModal } from './components/AdminPanelModal';
import {
  AuthGateModal,
  AuthModalInitialView,
} from './components/AuthGateModal';
import { BottomDock } from './components/BottomDock';
import { FcStoreModal } from './components/FcStoreModal';
import {
  GoalCelebrationBanner,
  GoalCelebrationEvent,
} from './components/GoalCelebrationBanner';
import { InboxModal } from './components/InboxModal';
import { MainMenuOverlay } from './components/MainMenuOverlay';
import { OnlineArenaModal } from './components/OnlineArenaModal';
import { OnlineDuelOverlay } from './components/OnlineDuelOverlay';
import { ShotResultOverlay } from './components/ShotResultOverlay';
import { SocialPlazaModal } from './components/SocialPlazaModal';
import { TopHud } from './components/TopHud';
import { soundEngine } from './game/audio';
import { FreeKickEngine } from './game/engine';
import {
  ALL_FC_PLAYER_IDS,
  applyMissionEvent,
  buildBestLineup,
  claimAllMissionRewards,
  claimMissionReward,
  computeSquadOvr,
  ensureFreshMissions,
  FC_PACKS,
  FC_PLAYERS,
  FcClubState,
  FcPackDef,
  FcPlayerCard,
  getTodayDateKey,
  isWinterMilestoneUnlocked,
  Language,
  loadFcClubState,
  loadWinterEventState,
  rollPackCards,
  saveFcClubState,
  saveWinterEventState,
  WINTER_MILESTONES,
  WinterEventState,
  withAdminFullPlayers,
} from './game/fcData';
import {
  CHALLENGE_SCENARIOS,
  computeImpossibleEntryFee,
  GameSnapshot,
  GoalkeeperId,
  IMPOSSIBLE_REWARD_COINS,
  KickerId,
  PLAYER_SKINS,
  PlayerSkinId,
  RUNNING_AURAS,
  RunningAuraId,
  WindState,
} from './game/types';
import { auth } from './services/firebaseClient';
import {
  ADMIN_EMAIL,
  AuthActionError,
  buyTransferListing,
  cancelTransferListing,
  claimTransferSalePayouts,
  CloudPresenceActivity,
  createTransferListing,
  DEFAULT_ONLINE_STATS,
  fetchUserAccountProfile,
  hasLocalUnsavedProgress,
  isCurrentUserAdmin,
  loadLocalBestScore,
  loginWithGoogle,
  logoutAccount,
  markPlayedAsGuest,
  OnlineAccountProfile,
  OnlinePresenceCloudRecord,
  OnlineRecordStats,
  removeCloudOnlinePresence,
  subscribeCloudOnlinePresence,
  subscribeMyCloudAccount,
  subscribeTransferListings,
  syncAccountProgressToCloud,
  TransferListingRecord,
  updateCloudOnlinePresence,
  upsertCloudVisitSession,
} from './services/onlineClubService';
import {
  onlineMatchClient,
  OnlinePlayerBadge,
  OnlinePresenceInfo,
  OnlineRoomState,
} from './services/onlineMatchClient';

const PLAYER_SKIN_STORAGE_KEY = 'sut_phat_3d_player_skin_v1';
const RUNNING_AURA_STORAGE_KEY = 'sut_phat_3d_running_aura_v1';

function loadSavedPlayerSkin(): PlayerSkinId {
  try {
    const raw = localStorage.getItem(PLAYER_SKIN_STORAGE_KEY) as PlayerSkinId | null;
    if (raw && raw in PLAYER_SKINS) return raw;
  } catch {
    // ignore storage errors
  }
  return 'default';
}

function loadSavedRunningAura(): RunningAuraId {
  try {
    const raw = localStorage.getItem(RUNNING_AURA_STORAGE_KEY) as RunningAuraId | null;
    if (raw && raw in RUNNING_AURAS) return raw;
  } catch {
    // ignore storage errors
  }
  return 'emerald_wind';
}

const INITIAL_SNAPSHOT: GameSnapshot = {
  mode: 'challenge',
  matchFormat: '5v5',
  practiceFocus: 'freekick',
  phase: 'aiming',
  turnRole: 'kick',
  vsBotHalf: 'player_kick',
  difficulty: 'medium',
  kickerId: 'ronaldo',
  gkId: 'courtois',
  playerSkinId: loadSavedPlayerSkin(),
  runningAuraId: loadSavedRunningAura(),
  activeBotKickerId: 'messi',
  cameraPreset: 'kicker',
  scenario: CHALLENGE_SCENARIOS[0],
  round: 1,
  totalRounds: CHALLENGE_SCENARIOS.length,
  score: 0,
  bestScore: 0,
  streak: 0,
  goalsScored: 0,
  playerGoals: 0,
  botGoals: 0,
  gkSaves: 0,
  homeTeamId: 'real_madrid',
  awayTeamId: 'barcelona',
  matchTimeSec: 0,
  matchDurationSec: 90,
  matchPossession: 'home',
  matchEventText: null,
  matchShotsHome: 0,
  matchShotsAway: 0,
  matchGoalSeq: 0,
  matchGoalTier: null,
  matchGoalScorerName: null,
  matchGoalTeam: null,
  power: 0.72,
  spin: { curve: -0.35, dip: 0.25 },
  shotSkill: 'normal',
  activeDribbleSkill: null,
  weather: 'snow',
  aim: { x: 1.85, y: 1.75 },
  previewBendMeters: 0,
  customWindActive: false,
  lastOutcome: null,
  history: [],
  muted: false,
  hasReplay: false,
  cameraOrbitMode: false,
  cameraHasCustomOrbit: false,
};

const GUEST_NAME_STORAGE_KEY = 'sut_phat_3d_guest_name_v1';
const GUEST_TAB_ID_SESSION_KEY = 'sut_phat_3d_guest_tab_id_v1';

function loadSavedGuestName(): string {
  try {
    const existing =
      localStorage.getItem(GUEST_NAME_STORAGE_KEY) ??
      localStorage.getItem('sut_phat_3d_guest_id');
    if (existing && existing.trim().length >= 2) {
      return existing.trim().slice(0, 24);
    }
    const generated = `Khach_${Math.floor(1000 + Math.random() * 8999)}`;
    localStorage.setItem(GUEST_NAME_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `Khach_${Math.floor(1000 + Math.random() * 8999)}`;
  }
}

function saveGuestName(name: string): string {
  const cleaned =
    name.trim().replace(/\s+/g, ' ').slice(0, 24) ||
    `Khach_${Math.floor(1000 + Math.random() * 8999)}`;
  try {
    localStorage.setItem(GUEST_NAME_STORAGE_KEY, cleaned);
  } catch {
    // ignore storage errors
  }
  return cleaned;
}

function getOrCreateGuestTabPlayerId(): string {
  try {
    const existing = sessionStorage.getItem(GUEST_TAB_ID_SESSION_KEY);
    if (existing && existing.startsWith('guest_')) return existing;
    const rand = Math.random().toString(36).slice(2, 8).padEnd(6, 'x');
    const generated = `guest_${Date.now().toString(36)}_${rand}`;
    sessionStorage.setItem(GUEST_TAB_ID_SESSION_KEY, generated);
    return generated;
  } catch {
    const rand = Math.random().toString(36).slice(2, 8).padEnd(6, 'x');
    return `guest_${Date.now().toString(36)}_${rand}`;
  }
}

function stripLegacyBillionGrant(
  club: FcClubState,
  scopeKey: string,
): { club: FcClubState; cleaned: boolean } {
  const key = `sut_phat_3d_grant_1b_${scopeKey}`;
  let hadFlag = false;
  try {
    hadFlag = localStorage.getItem(key) === '1';
    if (hadFlag) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }

  if (!hadFlag) {
    return { club, cleaned: false };
  }

  let nextCoins = club.coins;
  if (club.coins >= 1_000_000_000) {
    nextCoins = Math.max(1200, club.coins - 1_000_000_000);
  } else if (club.coins >= 100_000_000 || hadFlag) {
    nextCoins = 1200;
  }

  return {
    club: { ...club, coins: nextCoins },
    cleaned: nextCoins !== club.coins,
  };
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const lightningFlashRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FreeKickEngine | null>(null);
  const visitSessionIdRef = useRef<string>(
    `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8).padEnd(6, 'k')}`,
  );
  const visitClientTokenRef = useRef<string>(
    `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10).padEnd(8, 't')}`,
  );
  const visitStartedAtRef = useRef<number>(Date.now());
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [inMenu, setInMenu] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [lang, setLang] = useState<Language>('vi');
  const [club, setClub] = useState<FcClubState>(() => {
    const loaded = loadFcClubState();
    return stripLegacyBillionGrant(loaded, 'local').club;
  });
  const [onlineStats, setOnlineStats] = useState<OnlineRecordStats>(() => ({
    ...DEFAULT_ONLINE_STATS,
    bestScore: loadLocalBestScore(),
  }));
  const [winterEvent, setWinterEvent] = useState<WinterEventState>(() =>
    loadWinterEventState(),
  );
  const [storeTab, setStoreTab] = useState<
    'packs' | 'winter' | 'squad' | 'missions' | 'market' | null
  >(null);
  const [transferListings, setTransferListings] = useState<
    TransferListingRecord[]
  >([]);
  const [kickNotice, setKickNotice] = useState<string | null>(null);
  const [lastCoinsEarned, setLastCoinsEarned] = useState(0);

  // Account & Auth Gate State
  const [account, setAccount] = useState<OnlineAccountProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(true);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [authModalView, setAuthModalView] =
    useState<AuthModalInitialView | null>(null);
  const [authInitialError, setAuthInitialError] =
    useState<AuthActionError | null>(null);
  const [googleLoginBusy, setGoogleLoginBusy] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const guestDismissedRef = useRef(false);
  const skipNextCloudSyncRef = useRef(false);
  const lastSyncedCoinsRef = useRef<number | null>(null);
  const [guestName, setGuestName] = useState<string>(() => loadSavedGuestName());
  const [guestTabId] = useState<string>(() => getOrCreateGuestTabPlayerId());

  // Online Multiplayer 1v1 State
  const [onlineArenaTab, setOnlineArenaTab] = useState<
    'duel' | 'leaderboard' | null
  >(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [presence, setPresence] = useState<OnlinePresenceInfo>({
    onlineCount: 1,
    activeRoomsCount: 0,
    inQueueCount: 0,
    playersPreview: [],
  });
  const [inQueue, setInQueue] = useState(false);
  const [activeRoom, setActiveRoom] = useState<OnlineRoomState | null>(null);
  const [yourSlot, setYourSlot] = useState<'p1' | 'p2'>('p1');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [shotAlertDeadlineMs, setShotAlertDeadlineMs] = useState<number | null>(
    null,
  );
  const [waitingShotSync, setWaitingShotSync] = useState(false);
  const [lastTurnMessage, setLastTurnMessage] = useState<string | null>(null);
  const [lastEmote, setLastEmote] = useState<{
    from: string;
    emote: string;
  } | null>(null);
  const [onlineMatchCoins, setOnlineMatchCoins] = useState(0);
  const [onlineMatchReason, setOnlineMatchReason] = useState<
    'normal' | 'forfeit' | null
  >(null);
  const [goalCelebration, setGoalCelebration] =
    useState<GoalCelebrationEvent | null>(null);
  const [impossibleNotice, setImpossibleNotice] = useState<string | null>(null);
  const [cloudPresencePlayers, setCloudPresencePlayers] = useState<
    OnlinePresenceCloudRecord[]
  >([]);
  const [inboxOpen, setInboxOpen] = useState<{
    channel: 'global' | 'dm' | 'voice';
    recipient?: { id: string; name: string } | null;
  } | null>(null);
  const [socialPlazaOpen, setSocialPlazaOpen] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<{
    challengeId: string;
    from: OnlinePlayerBadge;
  } | null>(null);

  const isEffectiveAdmin = isAdmin && adminModeEnabled;
  const rewardLatchRef = useRef<string | null>(null);
  const lastMatchGoalSeqRef = useRef(0);
  const goalBannerTimerRef = useRef<number | null>(null);
  const impossibleNoticeTimerRef = useRef<number | null>(null);
  const clubCoinsRef = useRef<number>(club.coins);
  const isAdminRef = useRef<boolean>(isAdmin);
  const adminModeEnabledRef = useRef<boolean>(adminModeEnabled);
  const isEffectiveAdminRef = useRef<boolean>(isEffectiveAdmin);
  const activeRoomRef = useRef<OnlineRoomState | null>(null);
  const yourSlotRef = useRef<'p1' | 'p2'>('p1');
  const onlineTurnRewardLatchRef = useRef<number>(-1);
  const onlineMatchRewardLatchRef = useRef<string | null>(null);

  clubCoinsRef.current = club.coins;
  isAdminRef.current = isAdmin;
  adminModeEnabledRef.current = adminModeEnabled;
  isEffectiveAdminRef.current = isEffectiveAdmin;

  const showImpossibleNotice = useCallback((message: string) => {
    if (impossibleNoticeTimerRef.current) {
      window.clearTimeout(impossibleNoticeTimerRef.current);
    }
    setImpossibleNotice(message);
    impossibleNoticeTimerRef.current = window.setTimeout(() => {
      setImpossibleNotice(null);
      impossibleNoticeTimerRef.current = null;
    }, 4500);
  }, []);

  const chargeImpossibleAttempt = useCallback(
    (exitToMenuIfInsufficient = false): boolean => {
      if (isEffectiveAdminRef.current) {
        return true;
      }
      const currentCoins = clubCoinsRef.current;
      if (currentCoins < 10) {
        showImpossibleNotice(
          lang === 'vi'
            ? 'Bạn cần tối thiểu 10 Xu để tham gia Chỗ Sút Không Thể Vào (phí 10% số Xu).'
            : 'You need at least 10 Coins to enter the Impossible Goal mode (10% entry fee).',
        );
        if (exitToMenuIfInsufficient) {
          setInMenu(true);
          engineRef.current?.setPaused(true);
        }
        return false;
      }
      const fee = computeImpossibleEntryFee(currentCoins, false);
      const nextCoins = Math.max(0, currentCoins - fee);
      clubCoinsRef.current = nextCoins;
      setClub((prev) => ({
        ...prev,
        coins: Math.max(0, prev.coins - fee),
      }));
      setLastCoinsEarned(-fee);
      showImpossibleNotice(
        lang === 'vi'
          ? `Đã trừ ${fee.toLocaleString()} Xu (10% phí tham gia Chỗ Sút Không Thể Vào). Ghi bàn thưởng ${IMPOSSIBLE_REWARD_COINS.toLocaleString()} Xu!`
          : `Deducted ${fee.toLocaleString()} Coins (10% Impossible Goal fee). Score to win ${IMPOSSIBLE_REWARD_COINS.toLocaleString()} Coins!`,
      );
      return true;
    },
    [lang, showImpossibleNotice],
  );

  const chargeImpossibleAttemptRef = useRef(chargeImpossibleAttempt);
  chargeImpossibleAttemptRef.current = chargeImpossibleAttempt;

  const triggerGoalBanner = useCallback(
    (payload: Omit<GoalCelebrationEvent, 'id'>) => {
      if (goalBannerTimerRef.current) {
        window.clearTimeout(goalBannerTimerRef.current);
      }
      setGoalCelebration({
        ...payload,
        id: Date.now() + Math.random(),
      });
      goalBannerTimerRef.current = window.setTimeout(() => {
        setGoalCelebration(null);
        goalBannerTimerRef.current = null;
      }, 1900);
    },
    [],
  );

  activeRoomRef.current = activeRoom;
  yourSlotRef.current = yourSlot;

  const hasUnsavedGuestProgress = !account && hasLocalUnsavedProgress(club);
  const displayUsername = account?.username ?? guestName;
  const currentPlayerId = account?.uid ?? guestTabId;

  const handleUpdateGuestName = useCallback((nextName: string) => {
    const saved = saveGuestName(nextName);
    setGuestName(saved);
  }, []);

  const mergedOnlinePlayers = useMemo(() => {
    const map = new Map<string, OnlinePlayerBadge>();
    for (const cp of cloudPresencePlayers) {
      map.set(cp.uid, {
        playerId: cp.uid,
        username: cp.username,
        squadOvr: cp.squadOvr,
        elo: cp.elo,
        kickerId: cp.kickerId as KickerId,
        gkId: cp.gkId as GoalkeeperId,
        isGuest: false,
        activity: cp.activity,
        modeLabel: cp.modeLabel,
        waitingRoomCode: cp.roomCode,
      });
    }
    for (const wp of presence.playersPreview) {
      map.set(wp.playerId, { ...map.get(wp.playerId), ...wp });
    }
    return Array.from(map.values());
  }, [cloudPresencePlayers, presence.playersPreview]);

  const effectiveOnlineCount = Math.max(
    presence.onlineCount,
    mergedOnlinePlayers.length,
  );

  const syncLineupToEngine = useCallback((lineupIds: string[]) => {
    const cards = lineupIds.map((id) => FC_PLAYERS[id]).filter(Boolean);
    engineRef.current?.setFcLineup(cards);

    const kickerCard = FC_PLAYERS[lineupIds[4]];
    if (kickerCard?.kickerId) {
      engineRef.current?.setKicker(kickerCard.kickerId);
    }
    const gkCard = FC_PLAYERS[lineupIds[0]];
    if (gkCard?.gkId) {
      engineRef.current?.setGoalkeeper(gkCard.gkId);
    }
  }, []);

  useEffect(() => {
    saveFcClubState(club);
  }, [club]);

  useEffect(() => {
    saveWinterEventState(winterEvent);
  }, [winterEvent]);

  // Auto-arm & start FC Soundtrack BGM when entering the app (resumes on first user gesture if browser suspends audio)
  useEffect(() => {
    soundEngine.startFcBgm();
    const unlockAndPlay = () => {
      soundEngine.unlock();
      soundEngine.startFcBgm();
    };
    window.addEventListener('pointerdown', unlockAndPlay, { passive: true });
    window.addEventListener('keydown', unlockAndPlay, { passive: true });
    window.addEventListener('touchstart', unlockAndPlay, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
      window.removeEventListener('touchstart', unlockAndPlay);
      soundEngine.stopFcBgm();
    };
  }, []);

  useEffect(() => {
    soundEngine.setBgmMode(inMenu ? 'menu' : 'match');
  }, [inMenu]);

  // Listen to Firebase Auth state across reloads / sessions
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await fetchUserAccountProfile(fbUser.uid);
          if (profile) {
            const { club: cleanedClub, cleaned } = stripLegacyBillionGrant(
              profile.club,
              profile.uid,
            );
            const adminFlag = isCurrentUserAdmin();
            const finalClub = adminFlag
              ? withAdminFullPlayers(cleanedClub)
              : cleanedClub;
            skipNextCloudSyncRef.current =
              !cleaned && finalClub === cleanedClub;
            lastSyncedCoinsRef.current = finalClub.coins;
            setIsAdmin(adminFlag);
            setAccount(
              cleaned || finalClub !== cleanedClub
                ? { ...profile, club: finalClub }
                : profile,
            );
            setClub(finalClub);
            setOnlineStats(profile.stats);
            setAuthModalView(null);
            setAuthInitialized(true);
            return;
          }
        } catch (err) {
          console.error('Failed loading user profile:', err);
        }
      } else {
        setAccount(null);
        setIsAdmin(false);
        setAdminPanelOpen(false);
        lastSyncedCoinsRef.current = null;
        if (!guestDismissedRef.current) {
          setAuthModalView('choice');
        }
      }
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  const handleForcedKick = useCallback(async (reason: string) => {
    if (isCurrentUserAdmin()) return;
    if (activeRoomRef.current) {
      onlineMatchClient.leaveQueueOrRoom(activeRoomRef.current.roomId);
    } else {
      onlineMatchClient.leaveQueueOrRoom();
    }
    setActiveRoom(null);
    setInQueue(false);
    setShotAlertDeadlineMs(null);
    setWaitingShotSync(false);
    setLastTurnMessage(null);
    setOnlineArenaTab(null);
    setStoreTab(null);
    setAdminPanelOpen(false);
    engineRef.current?.setOnlineHandlers(null);
    if (engineRef.current) {
      engineRef.current.setMode('challenge');
      engineRef.current.setPaused(true);
    }
    setInMenu(true);
    setKickNotice(
      reason || 'Bạn đã bị Quản Trị Viên mời khỏi trò chơi.',
    );

    if (auth.currentUser) {
      try {
        await logoutAccount();
      } catch {
        // ignore logout error if session already closed
      }
      guestDismissedRef.current = true;
      setAccount(null);
      setIsAdmin(false);
      setAuthModalView(null);
    }
  }, []);

  const handleForcedKickRef = useRef(handleForcedKick);
  handleForcedKickRef.current = handleForcedKick;

  // Listen to live cloud adjustments & admin kicks (e.g., rewards/fines/kicks)
  useEffect(() => {
    if (!account) return;
    return subscribeMyCloudAccount(account.uid, (update) => {
      if (
        typeof update.coins === 'number' &&
        lastSyncedCoinsRef.current !== update.coins
      ) {
        lastSyncedCoinsRef.current = update.coins;
        skipNextCloudSyncRef.current = true;
        setClub((prev) =>
          prev.coins === update.coins ? prev : { ...prev, coins: update.coins! },
        );
      }

      if (update.kickedAtMs && !isCurrentUserAdmin()) {
        const kickKey = `sut_phat_3d_handled_kick_${account.uid}`;
        let handledMs = 0;
        try {
          handledMs = Number(localStorage.getItem(kickKey) || '0') || 0;
        } catch {
          handledMs = 0;
        }
        const isRecent = Date.now() - update.kickedAtMs < 15 * 60 * 1000;
        if (update.kickedAtMs > handledMs && isRecent) {
          try {
            localStorage.setItem(kickKey, String(update.kickedAtMs));
          } catch {
            // ignore storage errors
          }
          void handleForcedKickRef.current(
            update.kickReason ||
              'Bạn đã bị Quản Trị Viên kick khỏi hệ thống.',
          );
        }
      }
    });
  }, [account]);

  // Listen to live Transfer Market listings when signed in
  useEffect(() => {
    if (!account) {
      setTransferListings([]);
      return;
    }
    return subscribeTransferListings(setTransferListings);
  }, [account]);

  // Sync Club & Online Stats to Cloud Firestore whenever logged-in state changes
  useEffect(() => {
    if (!account) return;
    if (skipNextCloudSyncRef.current) {
      skipNextCloudSyncRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      lastSyncedCoinsRef.current = club.coins;
      void syncAccountProgressToCloud(
        account.uid,
        account.username,
        club,
        onlineStats,
      );
    }, 650);
    return () => window.clearTimeout(timer);
  }, [account, club, onlineStats]);

  // Subscribe to Firestore online_presence so players across all modes/lobby are visible
  useEffect(() => {
    return subscribeCloudOnlinePresence(setCloudPresencePlayers);
  }, []);

  // Keep WebSocket & Cloud Presence updated with live player activity
  const liveActivity: CloudPresenceActivity = activeRoom
    ? activeRoom.status === 'waiting'
      ? 'waiting'
      : 'duel'
    : inQueue
    ? 'queue'
    : inMenu
    ? 'menu'
    : 'playing';

  const liveModeLabel =
    liveActivity === 'menu'
      ? 'Ở Sảnh Chính'
      : liveActivity === 'queue'
      ? 'Tìm Trận Online'
      : liveActivity === 'waiting'
      ? `Chờ Phòng ${activeRoom?.code ?? ''}`
      : liveActivity === 'duel'
      ? 'Đang Đấu 1v1'
      : snapshot.mode === 'match'
      ? `Đá Trận ${snapshot.matchFormat}`
      : snapshot.mode === 'vs_bot'
      ? 'Đấu Bot'
      : snapshot.mode === 'penalty'
      ? 'Đá Penalty'
      : snapshot.mode === 'impossible'
      ? 'Sút 1 Tỷ'
      : snapshot.mode === 'gk_practice'
      ? 'Tập Thủ Môn'
      : snapshot.mode === 'practice'
      ? snapshot.practiceFocus === 'curve_lab'
        ? 'Luyện Sút Xoáy Kỹ Thuật'
        : 'Đang Luyện Tập'
      : 'Đang Thử Thách';

  const waitingRoomCode =
    activeRoom && activeRoom.status === 'waiting' ? activeRoom.code : null;

  useEffect(() => {
    const kickerCard = FC_PLAYERS[club.lineupIds[4]];
    const gkCard = FC_PLAYERS[club.lineupIds[0]];
    const squadOvr = computeSquadOvr(club.lineupIds);
    const badge: OnlinePlayerBadge = {
      playerId: currentPlayerId,
      username: displayUsername,
      squadOvr,
      elo: onlineStats.elo,
      kickerId: (kickerCard?.kickerId ?? 'ronaldo') as KickerId,
      gkId: (gkCard?.gkId ?? 'courtois') as GoalkeeperId,
      isGuest: !account,
      activity: liveActivity,
      modeLabel: liveModeLabel,
      waitingRoomCode,
    };
    const adminEmailArg = isAdmin ? ADMIN_EMAIL : undefined;
    onlineMatchClient.connect(badge, adminEmailArg);
    onlineMatchClient.updatePlayerBadge(badge, adminEmailArg);
  }, [
    account,
    currentPlayerId,
    isAdmin,
    displayUsername,
    club.lineupIds,
    onlineStats.elo,
    liveActivity,
    liveModeLabel,
    waitingRoomCode,
  ]);

  // Periodic Firestore online_presence heartbeat for signed-in users
  useEffect(() => {
    if (!account) return;
    const kickerCard = FC_PLAYERS[club.lineupIds[4]];
    const gkCard = FC_PLAYERS[club.lineupIds[0]];
    const sendBeat = () => {
      void updateCloudOnlinePresence({
        uid: account.uid,
        username: displayUsername,
        activity: liveActivity,
        modeLabel: liveModeLabel,
        squadOvr: computeSquadOvr(club.lineupIds),
        elo: onlineStats.elo,
        kickerId: kickerCard?.kickerId ?? 'ronaldo',
        gkId: gkCard?.gkId ?? 'courtois',
        roomCode: waitingRoomCode,
      });
    };
    sendBeat();
    const timer = window.setInterval(sendBeat, 25_000);
    return () => window.clearInterval(timer);
  }, [
    account,
    displayUsername,
    club.lineupIds,
    onlineStats.elo,
    liveActivity,
    liveModeLabel,
    waitingRoomCode,
  ]);

  // Visit & Playtime Tracker heartbeat (covers both signed-in accounts and guest "Chơi Trải Nghiệm")
  const visitModeLabel = !account
    ? inMenu
      ? 'Chơi Trải Nghiệm (Khách)'
      : `Chơi Trải Nghiệm · ${liveModeLabel}`
    : liveModeLabel;

  useEffect(() => {
    const accountType: 'account' | 'guest' = account ? 'account' : 'guest';
    const buildPayload = (ended = false) =>
      JSON.stringify({
        sessionId: visitSessionIdRef.current,
        playerId: currentPlayerId,
        username: displayUsername,
        accountType,
        modeLabel: visitModeLabel,
        startedAtMs: visitStartedAtRef.current,
        ended,
      });

    const sendPing = (ended = false) => {
      void fetch('/api/visits/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildPayload(ended),
        keepalive: ended,
      }).catch(() => {
        // ignore transient network errors
      });

      void upsertCloudVisitSession({
        sessionId: visitSessionIdRef.current,
        clientToken: visitClientTokenRef.current,
        playerId: currentPlayerId,
        username: displayUsername,
        accountType,
        modeLabel: visitModeLabel,
        startedAtMs: visitStartedAtRef.current,
        ended,
      });
    };

    sendPing(false);
    const interval = window.setInterval(() => sendPing(false), 15_000);

    const handlePageLeave = () => {
      const payload = buildPayload(true);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/visits/ping',
          new Blob([payload], { type: 'text/plain;charset=UTF-8' }),
        );
      } else {
        sendPing(true);
      }
      void upsertCloudVisitSession({
        sessionId: visitSessionIdRef.current,
        clientToken: visitClientTokenRef.current,
        playerId: currentPlayerId,
        username: displayUsername,
        accountType,
        modeLabel: visitModeLabel,
        startedAtMs: visitStartedAtRef.current,
        ended: true,
      });
    };

    window.addEventListener('pagehide', handlePageLeave);
    window.addEventListener('beforeunload', handlePageLeave);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', handlePageLeave);
      window.removeEventListener('beforeunload', handlePageLeave);
    };
  }, [account, currentPlayerId, displayUsername, visitModeLabel]);

  // WebSocket Online Arena & Duel Event Listeners
  useEffect(() => {
    const unsubConn = onlineMatchClient.onConnectionChange(setWsConnected);
    const unsubEvents = onlineMatchClient.onEvent((event) => {
      switch (event.type) {
        case 'presence:state':
          setPresence(event.data);
          break;
        case 'queue:status':
          setInQueue(event.waiting);
          break;
        case 'room:error':
          setRoomError(event.message);
          break;
        case 'room:joined':
          setRoomError(null);
          setInQueue(false);
          setActiveRoom(event.room);
          setYourSlot(event.yourSlot);
          break;
        case 'room:ready':
          setRoomError(null);
          setInQueue(false);
          setActiveRoom(event.room);
          setOnlineArenaTab(null);
          setAuthModalView(null);
          setStoreTab(null);
          setInboxOpen(null);
          setAdminPanelOpen(false);
          setSocialPlazaOpen(false);
          soundEngine.stopDiscoBeat();
          setInMenu(false);
          setOnlineMatchCoins(0);
          setOnlineMatchReason(null);
          onlineTurnRewardLatchRef.current = -1;
          onlineMatchRewardLatchRef.current = null;
          break;
        case 'duel:turn_start': {
          setActiveRoom(event.room);
          setShotAlertDeadlineMs(null);
          setWaitingShotSync(false);
          setLastTurnMessage(null);
          const slot = yourSlotRef.current;
          const isMyKick = event.room.shooterSlot === slot;
          const shooter =
            event.room.players.find((p) => p.slot === event.room.shooterSlot) ??
            event.room.players[0];
          const keeper =
            event.room.players.find((p) => p.slot !== event.room.shooterSlot) ??
            event.room.players[0];
          const myScore =
            event.room.players.find((p) => p.slot === slot)?.score ?? 0;
          const oppScore =
            event.room.players.find((p) => p.slot !== slot)?.score ?? 0;

          engineRef.current?.setOnlineHandlers({
            onShot: (shot) => {
              setWaitingShotSync(true);
              onlineMatchClient.sendKick(
                event.room.roomId,
                event.room.turn,
                shot.aim,
                shot.power,
                shot.spin,
                shot.kickerId,
              );
            },
            onGkDive: (dive) => {
              onlineMatchClient.sendGkDive(
                event.room.roomId,
                event.room.turn,
                dive.dir,
                dive.targetX,
                dive.targetY,
              );
            },
            onTurnFinished: (outcome) => {
              if (event.room.shooterSlot === yourSlotRef.current) {
                const isGoal =
                  outcome.type === 'goal' ||
                  outcome.type === 'goal_top_corner';
                onlineMatchClient.sendTurnResult(
                  event.room.roomId,
                  event.room.turn,
                  isGoal,
                  outcome.title,
                );
              }
            },
          });

          engineRef.current?.startOnlineDuelTurn({
            role: isMyKick ? 'kick' : 'gk',
            scenario: event.room.scenario,
            kickerId: (shooter?.kickerId || 'ronaldo') as KickerId,
            gkId: (keeper?.gkId || 'courtois') as GoalkeeperId,
            round: event.room.turn,
            totalRounds: event.room.maxTurns,
            playerGoals: myScore,
            botGoals: oppScore,
          });
          break;
        }
        case 'duel:shot_alert':
          setShotAlertDeadlineMs(event.reactDeadlineMs);
          break;
        case 'duel:execute':
          setActiveRoom(event.room);
          setShotAlertDeadlineMs(null);
          engineRef.current?.executeSyncedOnlineDuelShot({
            aim: event.payload.aim,
            power: event.payload.power,
            spin: event.payload.spin,
            kickerId: event.payload.kickerId,
            gkId: event.payload.gkId,
            gkDive: event.payload.gkDive,
          });
          break;
        case 'duel:score_update': {
          setActiveRoom(event.room);
          const { turn, shooterSlot, isGoal, outcomeTitle } =
            event.lastTurnOutcome;
          setLastTurnMessage(outcomeTitle);

          if (onlineTurnRewardLatchRef.current !== turn) {
            onlineTurnRewardLatchRef.current = turn;
            const iWasShooter = shooterSlot === yourSlotRef.current;
            const earnedGoal = iWasShooter && isGoal;
            const earnedSave = !iWasShooter && !isGoal;
            if (earnedGoal || earnedSave) {
              setClub((prev) =>
                applyMissionEvent(
                  {
                    ...prev,
                    coins: isEffectiveAdminRef.current
                      ? prev.coins
                      : prev.coins + 100,
                  },
                  earnedGoal ? { goals: 1 } : { gk_saves: 1 },
                ),
              );
              if (earnedGoal) {
                setOnlineStats((prev) => ({
                  ...prev,
                  onlineGoals: prev.onlineGoals + 1,
                }));
                triggerGoalBanner({
                  title: outcomeTitle || 'VÀOOOO!!',
                  subtitle: 'Ghi bàn trong trận Đấu Online 1v1!',
                  isSuper: outcomeTitle.includes('SIÊU PHẨM'),
                  coinsBonus: 100,
                });
              }
            }
          }
          break;
        }
        case 'duel:match_over': {
          setActiveRoom(event.room);
          setOnlineMatchReason(event.reason ?? 'normal');
          engineRef.current?.setPaused(true);

          const matchKey = `${event.room.roomId}-over`;
          if (onlineMatchRewardLatchRef.current !== matchKey) {
            onlineMatchRewardLatchRef.current = matchKey;
            const iWon = event.room.winnerSlot === yourSlotRef.current;
            const isDraw = event.room.winnerSlot === 'draw';
            const deltaCoins = iWon ? 500 : isDraw ? 150 : -200;
            const deltaElo = iWon ? 28 : isDraw ? 4 : -16;

            setOnlineMatchCoins(deltaCoins);
            setClub((prev) =>
              applyMissionEvent(
                {
                  ...prev,
                  coins: isEffectiveAdminRef.current
                    ? prev.coins
                    : Math.max(0, prev.coins + deltaCoins),
                },
                iWon ? { matches_won: 1 } : {},
              ),
            );
            setOnlineStats((prev) => ({
              ...prev,
              onlineWins: prev.onlineWins + (iWon ? 1 : 0),
              onlineDraws: prev.onlineDraws + (isDraw ? 1 : 0),
              onlineLosses: prev.onlineLosses + (!iWon && !isDraw ? 1 : 0),
              elo: Math.max(100, prev.elo + deltaElo),
            }));
          }
          break;
        }
        case 'duel:emote':
          setLastEmote({ from: event.fromUsername, emote: event.emote });
          window.setTimeout(() => setLastEmote(null), 2600);
          break;
        case 'duel:challenge_incoming':
          setIncomingChallenge({
            challengeId: event.challengeId,
            from: event.from,
          });
          break;
        case 'duel:challenge_declined':
          showImpossibleNotice(
            `@${event.byUsername} đã từ chối lời mời thách đấu 1v1.`,
          );
          break;
        case 'admin:kicked':
          void handleForcedKickRef.current(event.reason);
          break;
      }
    });
    return () => {
      unsubConn();
      unsubEvents();
    };
  }, [showImpossibleNotice, triggerGoalBanner]);

  const lineupKey = club.lineupIds.join('|');
  useEffect(() => {
    syncLineupToEngine(lineupKey.split('|'));
  }, [lineupKey, syncLineupToEngine]);

  useEffect(() => {
    engineRef.current?.setAdmin(isAdmin && adminModeEnabled);
  }, [isAdmin, adminModeEnabled]);

  useEffect(() => {
    if (!isAdmin) return;
    if (club.ownedIds.length < ALL_FC_PLAYER_IDS.length) {
      setClub((prev) => withAdminFullPlayers(prev));
    }
  }, [isAdmin, club.ownedIds.length]);

  const handleStateUpdate = useCallback((next: GameSnapshot) => {
    setSnapshot(next);

    if (next.bestScore > 0) {
      setOnlineStats((prev) =>
        next.bestScore > prev.bestScore
          ? { ...prev, bestScore: next.bestScore }
          : prev,
      );
    }

    if (next.mode === 'online_duel') {
      return;
    }

    // Clear latch once back in active play
    if (next.phase === 'aiming' || next.phase === 'playing') {
      rewardLatchRef.current = null;
    }

    // Immediate goal coin reward during 3D Match (flat +100 Xu per goal)
    if (
      next.mode === 'match' &&
      next.matchGoalSeq > lastMatchGoalSeqRef.current &&
      next.matchGoalTier
    ) {
      lastMatchGoalSeqRef.current = next.matchGoalSeq;
      const goalCoin = 100;
      const isSuper = next.matchGoalTier === 'super';
      setClub((prev) =>
        applyMissionEvent(
          {
            ...prev,
            coins: isEffectiveAdminRef.current
              ? prev.coins
              : prev.coins + goalCoin,
          },
          { goals: 1, top_corner: isSuper ? 1 : 0 },
        ),
      );
      triggerGoalBanner({
        title: isSuper ? 'SIÊU PHẨM!!' : 'VÀOOOO!!',
        subtitle:
          next.matchEventText || 'Pha dứt điểm tung lưới đẹp mắt!',
        isSuper,
        coinsBonus: goalCoin,
      });
    }

    // Credit Coins (or deduct -200 Xu on defeat) on match completion
    if (next.phase === 'match_over') {
      const key = `over-${next.mode}-${next.playerGoals}-${next.botGoals}-${next.score}-${next.matchTimeSec}`;
      if (rewardLatchRef.current === key) return;
      rewardLatchRef.current = key;

      const diffBonus =
        next.difficulty === 'extreme'
          ? 1.75
          : next.difficulty === 'pro'
          ? 1.35
          : next.difficulty === 'medium'
          ? 1.15
          : 1.0;
      let earned = 80;
      if (next.mode === 'match') {
        if (next.playerGoals > next.botGoals) {
          earned = Math.round(350 * diffBonus);
        } else if (next.playerGoals === next.botGoals) {
          earned = 100;
        } else {
          earned = -200;
        }
      } else if (next.mode === 'vs_bot' || next.mode === 'penalty') {
        if (next.playerGoals > next.botGoals) {
          earned = Math.round(250 * diffBonus);
        } else if (next.playerGoals === next.botGoals) {
          earned = 100;
        } else {
          earned = -200;
        }
      } else {
        if (next.goalsScored <= 1) {
          earned = -200;
        } else if (next.goalsScored >= 3) {
          earned = 100 + next.goalsScored * 30;
        } else {
          earned = 60;
        }
      }

      const wonCompetitive =
        next.playerGoals > next.botGoals &&
        (next.mode === 'match' ||
          next.mode === 'vs_bot' ||
          next.mode === 'penalty');

      const wonHardMatch =
        wonCompetitive &&
        (next.difficulty === 'pro' ||
          next.difficulty === 'extreme' ||
          next.mode === 'impossible');

      setLastCoinsEarned(earned);
      setClub((prev) =>
        applyMissionEvent(
          {
            ...prev,
            coins: isEffectiveAdminRef.current
              ? prev.coins
              : Math.max(0, prev.coins + earned),
          },
          wonCompetitive
            ? {
                matches_won: 1,
                match_3d_won: next.mode === 'match' ? 1 : 0,
                hard_matches_won: wonHardMatch ? 1 : 0,
              }
            : {},
        ),
      );
    } else if (next.phase === 'result' && next.lastOutcome) {
      const isPositive =
        next.turnRole === 'gk'
          ? next.lastOutcome.type !== 'goal' &&
            next.lastOutcome.type !== 'goal_top_corner'
          : next.lastOutcome.type === 'goal' ||
            next.lastOutcome.type === 'goal_top_corner';
      if (isPositive) {
        const key = `shot-${next.mode}-${next.round}-${next.score}-${next.gkSaves}-${next.goalsScored}`;
        if (rewardLatchRef.current === key) return;
        rewardLatchRef.current = key;
        const isGkSave = next.turnRole === 'gk';
        const isTopCorner =
          !isGkSave && next.lastOutcome.type === 'goal_top_corner';
        const isHeaderOrPenalty =
          !isGkSave &&
          (Boolean(next.lastOutcome.isHeader) ||
            next.mode === 'penalty' ||
            next.scenario.id === 'spot-penalty');
        const shotCoin =
          next.mode === 'impossible' ? IMPOSSIBLE_REWARD_COINS : 100;
        setClub((prev) =>
          applyMissionEvent(
            {
              ...prev,
              coins: isEffectiveAdminRef.current
                ? prev.coins
                : prev.coins + shotCoin,
            },
            isGkSave
              ? { gk_saves: 1 }
              : {
                  goals: 1,
                  top_corner: isTopCorner ? 1 : 0,
                  header_or_penalty: isHeaderOrPenalty ? 1 : 0,
                },
          ),
        );
        if (!isGkSave) {
          triggerGoalBanner({
            title: next.lastOutcome.title,
            subtitle: next.lastOutcome.subtitle,
            isSuper:
              isTopCorner ||
              Boolean(next.lastOutcome.isHeader) ||
              Boolean(next.lastOutcome.hitWoodwork),
            speedKmh: next.lastOutcome.speedKmh,
            coinsBonus: shotCoin,
          });
        }
      }
    }
  }, [triggerGoalBanner]);

  const focusGameSurface = useCallback(() => {
    window.focus();
    window.setTimeout(() => {
      canvasMountRef.current?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const handleOpenStore = (
    tab: 'packs' | 'winter' | 'squad' | 'missions' | 'market',
  ) => {
    setClub((prev) => ({
      ...prev,
      missions: ensureFreshMissions(prev.missions),
    }));
    setStoreTab(tab);
    engineRef.current?.setPaused(true);
  };

  const handleCloseStore = () => {
    setStoreTab(null);
    if (!inMenu && !authModalView && !onlineArenaTab && !socialPlazaOpen) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleOpenAuth = (view: AuthModalInitialView) => {
    setAuthInitialError(null);
    setAuthModalView(view);
    engineRef.current?.setPaused(true);
  };

  const handleAuthSuccess = (profile: OnlineAccountProfile) => {
    const { club: cleanedClub, cleaned } = stripLegacyBillionGrant(
      profile.club,
      profile.uid,
    );
    const adminFlag = isCurrentUserAdmin();
    const finalClub = adminFlag
      ? withAdminFullPlayers(cleanedClub)
      : cleanedClub;
    skipNextCloudSyncRef.current = !cleaned && finalClub === cleanedClub;
    lastSyncedCoinsRef.current = finalClub.coins;
    setIsAdmin(adminFlag);
    setAccount(
      cleaned || finalClub !== cleanedClub
        ? { ...profile, club: finalClub }
        : profile,
    );
    setClub(finalClub);
    setOnlineStats(profile.stats);
    setAuthInitialError(null);
    setAuthModalView(null);
    if (!inMenu && !storeTab && !onlineArenaTab && !adminPanelOpen && !socialPlazaOpen) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleQuickGoogleLogin = async () => {
    if (googleLoginBusy) return;
    setGoogleLoginBusy(true);
    const seedClub = hasLocalUnsavedProgress(club) ? club : undefined;
    const res = await loginWithGoogle(seedClub);
    setGoogleLoginBusy(false);
    if (res.ok) {
      handleAuthSuccess(res.profile);
      return;
    }
    if (res.error.code === 'auth/popup-closed-by-user') {
      return;
    }
    setAuthInitialError(res.error);
    setAuthModalView('login');
    engineRef.current?.setPaused(true);
  };

  const handleContinueAsGuest = () => {
    guestDismissedRef.current = true;
    markPlayedAsGuest();
    setAuthInitialError(null);
    setAuthModalView(null);
    if (!inMenu && !storeTab && !onlineArenaTab && !adminPanelOpen && !socialPlazaOpen) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleLogout = async () => {
    if (account) {
      await removeCloudOnlinePresence(account.uid);
    }
    await logoutAccount();
    guestDismissedRef.current = false;
    setIsAdmin(false);
    setAdminPanelOpen(false);
    setAccount(null);
    setAuthModalView('choice');
  };

  const handleOpenAdmin = () => {
    if (!isCurrentUserAdmin()) return;
    setAdminPanelOpen(true);
    engineRef.current?.setPaused(true);
  };

  const handleCloseAdmin = () => {
    setAdminPanelOpen(false);
    if (
      !inMenu &&
      !storeTab &&
      !authModalView &&
      !onlineArenaTab &&
      !inboxOpen &&
      !socialPlazaOpen
    ) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleEnterImpossibleFromAdmin = () => {
    if (!isCurrentUserAdmin()) return;
    setAdminPanelOpen(false);
    setInMenu(false);
    setLastCoinsEarned(0);
    const engine = engineRef.current;
    if (engine) {
      engine.setPaused(false);
      engine.setMode('impossible');
    }
    focusGameSurface();
  };

  const handleAdminCoinsAdjusted = (targetUid: string, nextCoins: number) => {
    if (account && account.uid === targetUid) {
      lastSyncedCoinsRef.current = nextCoins;
      skipNextCloudSyncRef.current = true;
      setClub((prev) => ({ ...prev, coins: nextCoins }));
    }
  };

  const handleAdminKickOnlinePlayer = (
    targetPlayerId: string,
    _label: string,
    reason: string,
  ) => {
    if (!isCurrentUserAdmin()) return;
    onlineMatchClient.sendAdminKick(targetPlayerId, ADMIN_EMAIL, reason);
  };

  const handleOpenOnlineArena = (tab: 'duel' | 'leaderboard') => {
    setRoomError(null);
    setOnlineArenaTab(tab);
    onlineMatchClient.requestPresenceSync();
    engineRef.current?.setPaused(true);
  };

  const handleOpenInbox = (
    channel: 'global' | 'dm' | 'voice' = 'global',
    recipient: { id: string; name: string } | null = null,
  ) => {
    setInboxOpen({ channel, recipient });
    engineRef.current?.setPaused(true);
  };

  const handleCloseInbox = () => {
    setInboxOpen(null);
    if (
      !inMenu &&
      !storeTab &&
      !authModalView &&
      !onlineArenaTab &&
      !adminPanelOpen &&
      !socialPlazaOpen
    ) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleOpenSocialPlaza = () => {
    setSocialPlazaOpen(true);
    engineRef.current?.setPaused(true);
  };

  const handleCloseSocialPlaza = () => {
    soundEngine.stopDiscoBeat();
    setSocialPlazaOpen(false);
    if (
      !inMenu &&
      !storeTab &&
      !authModalView &&
      !onlineArenaTab &&
      !adminPanelOpen &&
      !inboxOpen
    ) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleCloseOnlineArena = () => {
    if (inQueue || (activeRoom && activeRoom.status === 'waiting')) {
      onlineMatchClient.leaveQueueOrRoom(activeRoom?.roomId);
      setInQueue(false);
      setActiveRoom(null);
    }
    setOnlineArenaTab(null);
    if (!inMenu && !storeTab && !authModalView && !socialPlazaOpen) {
      engineRef.current?.setPaused(false);
      focusGameSurface();
    }
  };

  const handleExitOnlineDuel = () => {
    if (activeRoom) {
      onlineMatchClient.leaveQueueOrRoom(activeRoom.roomId);
    }
    setActiveRoom(null);
    setInQueue(false);
    setShotAlertDeadlineMs(null);
    setWaitingShotSync(false);
    setLastTurnMessage(null);
    engineRef.current?.setOnlineHandlers(null);
    engineRef.current?.setMode('challenge');
    engineRef.current?.setPaused(true);
    setInMenu(true);
  };

  const handleRematchOnline = () => {
    if (activeRoom) {
      onlineMatchClient.leaveQueueOrRoom(activeRoom.roomId);
    }
    setActiveRoom(null);
    setInMenu(true);
    setOnlineArenaTab('duel');
    onlineMatchClient.joinQuickMatch();
  };

  const handleBuyPack = (packId: FcPackDef['id']) => {
    const pack = FC_PACKS.find((p) => p.id === packId);
    const adminUnlimited = isEffectiveAdmin;
    if (!pack || (!adminUnlimited && club.coins < pack.price)) return null;
    const { cards, duplicateRefund } = rollPackCards(packId, club.ownedIds);
    setClub((prev) => {
      const nextOwned = Array.from(
        new Set([...prev.ownedIds, ...cards.map((c) => c.id)]),
      );
      return applyMissionEvent(
        {
          ...prev,
          coins: adminUnlimited
            ? prev.coins
            : prev.coins - pack.price + duplicateRefund,
          ownedIds: nextOwned,
          packsOpened: prev.packsOpened + 1,
        },
        { packs_opened: 1 },
      );
    });
    return { cards, duplicateRefund };
  };

  const handleAssignLineupSlot = (slotIdx: number, cardId: string) => {
    setClub((prev) => {
      const nextLineup = [...prev.lineupIds] as [
        string,
        string,
        string,
        string,
        string,
      ];
      const existingIdx = nextLineup.indexOf(cardId);
      if (existingIdx >= 0 && existingIdx !== slotIdx) {
        nextLineup[existingIdx] = nextLineup[slotIdx];
      }
      nextLineup[slotIdx] = cardId;
      return {
        ...prev,
        lineupIds: nextLineup,
        activeKickerCardId: nextLineup[4],
        activeGkCardId: nextLineup[0],
      };
    });
  };

  const handleAutoBestLineup = () => {
    setClub((prev) => {
      const bestLineup = buildBestLineup(prev.ownedIds);
      return {
        ...prev,
        lineupIds: bestLineup,
        activeKickerCardId: bestLineup[4],
        activeGkCardId: bestLineup[0],
      };
    });
  };

  const handleClaimMission = (missionId: string) => {
    setClub((prev) => claimMissionReward(prev, missionId));
  };

  const handleClaimAllMissions = () => {
    setClub((prev) => claimAllMissionRewards(prev).nextState);
  };

  const handleClaimWinterDailyGift = (): {
    cards: FcPlayerCard[];
    coins: number;
    duplicateRefund: number;
  } | null => {
    const todayKey = getTodayDateKey();
    if (winterEvent.lastDailyGiftDate === todayKey) return null;
    const winterPool = Object.values(FC_PLAYERS).filter(
      (c) => c.rarity === 'winter',
    );
    const unowned = winterPool.filter((c) => !club.ownedIds.includes(c.id));
    const pickPool = unowned.length > 0 ? unowned : winterPool;
    const picked =
      pickPool[Math.floor(Math.random() * pickPool.length)] ??
      FC_PLAYERS['winter_quang_hai_138'];
    const isDup = club.ownedIds.includes(picked.id);
    const duplicateRefund = isDup ? 25_000 : 0;
    const coinsAward = 50_000;
    const adminUnlimited = isEffectiveAdmin;

    setWinterEvent((prev) => ({
      ...prev,
      lastDailyGiftDate: todayKey,
    }));
    setClub((prev) => ({
      ...prev,
      coins: adminUnlimited
        ? prev.coins
        : prev.coins + coinsAward + duplicateRefund,
      ownedIds: Array.from(new Set([...prev.ownedIds, picked.id])),
    }));

    return {
      cards: [picked],
      coins: coinsAward,
      duplicateRefund,
    };
  };

  const handleClaimWinterMilestone = (
    milestoneId: string,
  ): {
    cards: FcPlayerCard[];
    coins: number;
    duplicateRefund: number;
  } | null => {
    const milestone = WINTER_MILESTONES.find((m) => m.id === milestoneId);
    if (!milestone) return null;
    if (winterEvent.claimedMilestones.includes(milestone.id)) return null;
    if (!isWinterMilestoneUnlocked(club, milestone)) return null;

    const card =
      FC_PLAYERS[milestone.rewardCardId] ?? FC_PLAYERS['winter_quang_hai_138'];
    const isDup = club.ownedIds.includes(card.id);
    const duplicateRefund = isDup ? 35_000 : 0;
    const adminUnlimited = isEffectiveAdmin;

    setWinterEvent((prev) => ({
      ...prev,
      claimedMilestones: [...prev.claimedMilestones, milestone.id],
    }));
    setClub((prev) => ({
      ...prev,
      coins: adminUnlimited
        ? prev.coins
        : prev.coins + milestone.rewardCoins + duplicateRefund,
      ownedIds: Array.from(new Set([...prev.ownedIds, card.id])),
    }));

    return {
      cards: [card],
      coins: milestone.rewardCoins,
      duplicateRefund,
    };
  };

  const handleCreateTransferListing = async (cardId: string, price: number) => {
    if (!account) {
      throw new Error('Vui lòng đăng nhập để rao bán cầu thủ.');
    }
    const res = await createTransferListing(
      account.uid,
      account.username,
      cardId,
      price,
    );
    skipNextCloudSyncRef.current = true;
    setClub((prev) => ({ ...prev, ownedIds: res.nextOwnedIds }));
  };

  const handleCancelTransferListing = async (listingId: string) => {
    if (!account) {
      throw new Error('Vui lòng đăng nhập.');
    }
    const res = await cancelTransferListing(account.uid, listingId);
    skipNextCloudSyncRef.current = true;
    setClub((prev) => ({ ...prev, ownedIds: res.nextOwnedIds }));
  };

  const handleBuyTransferListing = async (listingId: string) => {
    if (!account) {
      throw new Error('Vui lòng đăng nhập để mua cầu thủ.');
    }
    const adminFree = isEffectiveAdmin;
    const res = await buyTransferListing(
      account.uid,
      account.username,
      listingId,
      adminFree,
    );
    lastSyncedCoinsRef.current = res.nextCoins;
    skipNextCloudSyncRef.current = true;
    setClub((prev) => ({
      ...prev,
      coins: adminFree ? prev.coins : res.nextCoins,
      ownedIds: res.nextOwnedIds,
    }));
  };

  const handleClaimSalePayouts = async () => {
    if (!account) {
      return { claimedCount: 0, totalCoinsReceived: 0 };
    }
    const adminUnlimited = isEffectiveAdmin;
    const res = await claimTransferSalePayouts(
      account.uid,
      adminUnlimited,
    );
    if (res.latestCoins !== null && !adminUnlimited) {
      lastSyncedCoinsRef.current = res.latestCoins;
      skipNextCloudSyncRef.current = true;
      setClub((prev) => ({ ...prev, coins: res.latestCoins! }));
    }
    return {
      claimedCount: res.claimedCount,
      totalCoinsReceived: res.totalCoinsReceived,
    };
  };

  const handleExitToMenu = () => {
    if (snapshot.mode === 'online_duel') {
      handleExitOnlineDuel();
      return;
    }
    setInMenu(true);
    engineRef.current?.setPaused(true);
  };

  const handleStartGame = () => {
    const targetMode =
      snapshot.mode === 'online_duel' ? 'challenge' : snapshot.mode;
    if (targetMode === 'impossible' && !chargeImpossibleAttempt(false)) {
      return;
    }
    if (!account) {
      markPlayedAsGuest();
    }
    setInMenu(false);
    setLastCoinsEarned(0);
    const engine = engineRef.current;
    if (engine) {
      engine.setPaused(false);
      engine.setMode(targetMode);
    }
    focusGameSurface();
  };

  const handleSelectCurveTraining = () => {
    if (!account) {
      markPlayedAsGuest();
    }
    setInMenu(false);
    setLastCoinsEarned(0);
    const engine = engineRef.current;
    if (engine) {
      engine.setPaused(false);
      engine.setPracticeFocus('curve_lab');
      engine.setMode('practice');
    }
    focusGameSurface();
  };

  const handleSelectPlayerSkin = useCallback((skinId: PlayerSkinId) => {
    try {
      localStorage.setItem(PLAYER_SKIN_STORAGE_KEY, skinId);
    } catch {
      // ignore storage errors
    }
    engineRef.current?.setPlayerSkin(skinId);
  }, []);

  const handleSelectRunningAura = useCallback((auraId: RunningAuraId) => {
    try {
      localStorage.setItem(RUNNING_AURA_STORAGE_KEY, auraId);
    } catch {
      // ignore storage errors
    }
    engineRef.current?.setRunningAura(auraId);
  }, []);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new FreeKickEngine(
      mountEl,
      (next) => handleStateUpdate(next),
      (lost) => setContextLost(lost),
    );
    engine.setPaused(true);
    engine.setImpossibleAttemptHandler(() =>
      chargeImpossibleAttemptRef.current(true),
    );
    engine.setLightningFlashCallback((intensity) => {
      if (lightningFlashRef.current) {
        lightningFlashRef.current.style.opacity = String(
          Math.min(0.86, Math.max(0, intensity * 0.86)),
        );
      }
    });
    engineRef.current = engine;
    engine.setAdmin(isEffectiveAdminRef.current);
    syncLineupToEngine(loadFcClubState().lineupIds);
    engine.setPlayerSkin(loadSavedPlayerSkin());
    engine.setRunningAura(loadSavedRunningAura());

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && !e.repeat) {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'Escape' && !e.repeat) {
        if (activeRoomRef.current) return;
        setStoreTab(null);
        setOnlineArenaTab(null);
        setInboxOpen(null);
        soundEngine.stopDiscoBeat();
        setSocialPlazaOpen(false);
        setInMenu((prev) => {
          const next = !prev;
          engineRef.current?.setPaused(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleStateUpdate, syncLineupToEngine]);

  const pendingMarketCoins = transferListings
    .filter(
      (l) =>
        account &&
        l.sellerUid === account.uid &&
        l.status === 'sold' &&
        !l.payoutClaimed,
    )
    .reduce((sum, l) => sum + l.price, 0);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#070d17]">
      {/* Dedicated Isolated 3D WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        tabIndex={0}
        className="w-full h-full cursor-crosshair outline-none"
        aria-label="Sân vận động đá phạt 3D"
      />

      {/* Full-screen Thunderstorm Lightning Flash Overlay */}
      <div
        ref={lightningFlashRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-[45] bg-sky-100"
        style={{ opacity: 0 }}
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070d17]/95 p-6 text-center">
          <div className="max-w-sm bg-[#0B1320] border border-white/15 rounded-xl p-6">
            <h2 className="font-display text-2xl font-bold text-white">
              Đang Khôi Phục Đồ Họa 3D
            </h2>
            <p className="text-xs text-slate-300 mt-2">
              Kết nối đồ họa WebGL tạm thời bị gián đoạn. Vui lòng tải lại trang
              nếu sân đấu không tự khôi phục.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
            >
              Tải Lại Sân Đấu
            </button>
          </div>
        </div>
      ) : null}

      {/* Lobby / Setup Menu Overlay */}
      {inMenu ? (
        <MainMenuOverlay
          snapshot={snapshot}
          club={club}
          winterEvent={winterEvent}
          lang={lang}
          account={account}
          isAdmin={isEffectiveAdmin}
          canToggleAdminMode={isAdmin}
          adminModeEnabled={adminModeEnabled}
          hasUnsavedGuestProgress={hasUnsavedGuestProgress}
          onlineCount={effectiveOnlineCount}
          pendingMarketCoins={pendingMarketCoins}
          onToggleLang={() => setLang((p) => (p === 'vi' ? 'en' : 'vi'))}
          onToggleAdminMode={() => {
            if (!isAdmin) return;
            setAdminModeEnabled((prev) => !prev);
          }}
          onOpenStore={handleOpenStore}
          onOpenOnlineArena={handleOpenOnlineArena}
          onOpenSocialPlaza={handleOpenSocialPlaza}
          onOpenInbox={() => handleOpenInbox('global')}
          onOpenAdmin={handleOpenAdmin}
          onOpenAuth={handleOpenAuth}
          onQuickGoogleLogin={() => void handleQuickGoogleLogin()}
          googleAuthBusy={googleLoginBusy}
          onLogout={handleLogout}
          onSelectMode={(mode) => engineRef.current?.setMode(mode)}
          onSelectMatchFormat={(format) =>
            engineRef.current?.setMatchFormat(format)
          }
          onSelectPracticeFocus={(focus) =>
            engineRef.current?.setPracticeFocus(focus)
          }
          onSelectDifficulty={(diff) => engineRef.current?.setDifficulty(diff)}
          onSelectKicker={(id) => engineRef.current?.setKicker(id)}
          onSelectGoalkeeper={(gkId) => engineRef.current?.setGoalkeeper(gkId)}
          onSelectPlayerSkin={handleSelectPlayerSkin}
          onSelectRunningAura={handleSelectRunningAura}
          onSelectTeams={(home, away) =>
            engineRef.current?.setTeams(home, away)
          }
          onStartGame={handleStartGame}
          onStartCurveTraining={handleSelectCurveTraining}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      ) : (
        <>
          {/* Top Match Scoreboard, Coins, OVR, Account, Online & Exit Button */}
          <TopHud
            snapshot={snapshot}
            club={club}
            lang={lang}
            account={account}
            isAdmin={isEffectiveAdmin}
            canToggleAdminMode={isAdmin}
            adminModeEnabled={adminModeEnabled}
            onlineCount={effectiveOnlineCount}
            pendingMarketCoins={pendingMarketCoins}
            onToggleLang={() => {
              setLang((p) => (p === 'vi' ? 'en' : 'vi'));
              focusGameSurface();
            }}
            onToggleAdminMode={() => {
              if (!isAdmin) return;
              setAdminModeEnabled((prev) => !prev);
              focusGameSurface();
            }}
            onOpenStore={handleOpenStore}
            onOpenOnlineArena={handleOpenOnlineArena}
            onOpenSocialPlaza={handleOpenSocialPlaza}
            onOpenInbox={() => handleOpenInbox('global')}
            onOpenAdmin={handleOpenAdmin}
            onOpenAuth={handleOpenAuth}
            onQuickGoogleLogin={() => void handleQuickGoogleLogin()}
            googleAuthBusy={googleLoginBusy}
            onSetMode={(mode) => {
              if (
                mode === 'impossible' &&
                snapshot.mode !== 'impossible' &&
                !chargeImpossibleAttempt(false)
              ) {
                return;
              }
              engineRef.current?.setMode(mode);
              focusGameSurface();
            }}
            onRestart={() => {
              if (snapshot.mode === 'online_duel') return;
              setLastCoinsEarned(0);
              engineRef.current?.startNewChallenge();
              focusGameSurface();
            }}
            onToggleMute={() => {
              engineRef.current?.toggleMute();
              focusGameSurface();
            }}
            onExit={handleExitToMenu}
          />

          {/* Online 1v1 Live Duel HUD */}
          {snapshot.mode === 'online_duel' && activeRoom ? (
            <OnlineDuelOverlay
              lang={lang}
              room={activeRoom}
              yourSlot={yourSlot}
              snapshot={snapshot}
              shotAlertDeadlineMs={shotAlertDeadlineMs}
              waitingShotSync={waitingShotSync}
              lastTurnMessage={lastTurnMessage}
              lastEmote={lastEmote}
              matchCoinsEarned={onlineMatchCoins}
              matchReason={onlineMatchReason}
              onSendEmote={(emote) =>
                onlineMatchClient.sendEmote(activeRoom.roomId, emote)
              }
              onRematch={handleRematchOnline}
              onExitDuel={handleExitOnlineDuel}
            />
          ) : null}

          {/* Stadium Broadcast Goal Celebration Banner */}
          <GoalCelebrationBanner event={goalCelebration} lang={lang} />

          {/* Post-Shot Result / Slow-Mo Replay / Match Summary */}
          <ShotResultOverlay
            snapshot={snapshot}
            lang={lang}
            lastCoinsEarned={lastCoinsEarned}
            isAdmin={isEffectiveAdmin}
            clubCoins={club.coins}
            onOpenPacks={() => handleOpenStore('packs')}
            onNextTurn={() => engineRef.current?.nextTurn()}
            onTakeCornerKick={(side) =>
              engineRef.current?.takeAwardedCornerKick(side)
            }
            onReplay={() => engineRef.current?.playReplay()}
            onRestartMatch={() => {
              setLastCoinsEarned(0);
              engineRef.current?.startNewChallenge();
            }}
            onExit={handleExitToMenu}
          />

          {/* Collapsible Bottom Control Dock + Floating SÚT BÓNG Button */}
          <BottomDock
            snapshot={snapshot}
            lang={lang}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
            onSpinChange={(spin) => engineRef.current?.setSpin(spin)}
            onPowerChange={(power) => engineRef.current?.setPower(power)}
            onNudgeAim={(dx, dy) => engineRef.current?.nudgeAim(dx, dy)}
            onQuickShoot={() => engineRef.current?.quickShoot()}
            onBeginCharge={() => engineRef.current?.beginCharge()}
            onBeginCurveCharge={(dir) =>
              engineRef.current?.beginCurveCharge(dir)
            }
            onBeginHorizontalCurve={(dir) =>
              engineRef.current?.beginHorizontalCurveCharge(dir)
            }
            onShootCrossHeader={() => engineRef.current?.shootCrossHeader()}
            onReleaseCharge={() => engineRef.current?.releaseChargeAndShoot()}
            onSelectSpot={(spotId) =>
              engineRef.current?.selectPracticeSpot(spotId)
            }
            onSetPracticeFocus={(focus) =>
              engineRef.current?.setPracticeFocus(focus)
            }
            onSetDifficulty={(diff) => engineRef.current?.setDifficulty(diff)}
            onSetKicker={(kickerId) => engineRef.current?.setKicker(kickerId)}
            onSetGoalkeeper={(gkId) => engineRef.current?.setGoalkeeper(gkId)}
            onSetPlayerSkin={handleSelectPlayerSkin}
            onSetRunningAura={handleSelectRunningAura}
            onSetMatchFormat={(format) =>
              engineRef.current?.setMatchFormat(format)
            }
            onSetWeather={(weather) => engineRef.current?.setWeather(weather)}
            onSetCustomWind={(wind: WindState) =>
              engineRef.current?.setCustomWind(wind)
            }
            onResetCustomWind={() => engineRef.current?.resetCustomWind()}
            onSetShotSkill={(skill) => engineRef.current?.setShotSkill(skill)}
            onBeginSkillCharge={(skill) => engineRef.current?.beginSkillCharge(skill)}
            onGkDive={(dir) => engineRef.current?.diveGoalkeeper(dir)}
            onSetCamera={(preset) => engineRef.current?.setCameraPreset(preset)}
            onToggleCameraOrbit={() =>
              engineRef.current?.setCameraOrbitMode(!snapshot.cameraOrbitMode)
            }
            onResetCameraOrbit={() => engineRef.current?.resetCameraOrbit()}
            onNudgeCameraOrbit={(dYaw, dPitch) =>
              engineRef.current?.nudgeCameraOrbit(dYaw, dPitch)
            }
            onRetrySpot={() => engineRef.current?.retryCurrentSpot()}
            onMatchPass={() => engineRef.current?.matchPass()}
            onMatchLobPass={() => engineRef.current?.matchLobPass()}
            onMatchShoot={() => engineRef.current?.matchShoot()}
            onMatchSwitchPlayer={() => engineRef.current?.matchSwitchPlayer()}
            onMatchMoveInput={(x, z) =>
              engineRef.current?.setMatchMoveInput(x, z)
            }
            onMatchSprintChange={(active) =>
              engineRef.current?.setMatchSprint(active)
            }
            onMatchAutoAssistChange={(active) =>
              engineRef.current?.setMatchAutoAssist(active)
            }
            onMatchDribbleSkill={(skill) =>
              engineRef.current?.triggerMatchDribbleSkill(skill)
            }
            onMatchSlideTackle={() =>
              engineRef.current?.triggerMatchSlideTackle()
            }
            onSkipMatchGoal={() => {
              if (goalBannerTimerRef.current) {
                window.clearTimeout(goalBannerTimerRef.current);
                goalBannerTimerRef.current = null;
              }
              setGoalCelebration(null);
              engineRef.current?.skipMatchGoalCelebration();
              focusGameSurface();
            }}
          />
        </>
      )}

      {/* FC Pack Store, Squad, Transfer Market & Missions Modal */}
      {storeTab ? (
        <FcStoreModal
          club={club}
          winterEvent={winterEvent}
          lang={lang}
          isAdmin={isEffectiveAdmin}
          account={account}
          listings={transferListings}
          initialTab={storeTab}
          onClose={handleCloseStore}
          onOpenAuth={() => {
            setStoreTab(null);
            handleOpenAuth('login');
          }}
          onBuyPack={handleBuyPack}
          onAssignLineupSlot={handleAssignLineupSlot}
          onAutoBestLineup={handleAutoBestLineup}
          onClaimMission={handleClaimMission}
          onClaimAllMissions={handleClaimAllMissions}
          onClaimWinterDailyGift={handleClaimWinterDailyGift}
          onClaimWinterMilestone={handleClaimWinterMilestone}
          onCreateListing={handleCreateTransferListing}
          onCancelListing={handleCancelTransferListing}
          onBuyListing={handleBuyTransferListing}
          onClaimSalePayouts={handleClaimSalePayouts}
        />
      ) : null}

      {/* Online 1v1 PvP Matchmaking & Global Leaderboard Modal */}
      {onlineArenaTab ? (
        <OnlineArenaModal
          lang={lang}
          club={club}
          account={account}
          currentPlayerId={currentPlayerId}
          displayUsername={displayUsername}
          wsConnected={wsConnected}
          presence={presence}
          cloudPresencePlayers={cloudPresencePlayers}
          inQueue={inQueue}
          waitingRoom={
            activeRoom && activeRoom.status === 'waiting' ? activeRoom : null
          }
          roomError={roomError}
          initialTab={onlineArenaTab}
          onQuickMatch={() => {
            setRoomError(null);
            onlineMatchClient.joinQuickMatch();
          }}
          onCreateRoom={() => {
            setRoomError(null);
            onlineMatchClient.createRoom();
          }}
          onJoinRoom={(code) => {
            setRoomError(null);
            onlineMatchClient.joinRoom(code);
          }}
          onChallengePlayer={(targetPlayerId) => {
            setRoomError(null);
            onlineMatchClient.sendChallenge(targetPlayerId);
          }}
          onOpenInboxDm={(playerId, username) => {
            setOnlineArenaTab(null);
            handleOpenInbox('dm', { id: playerId, name: username });
          }}
          onRefreshPresence={() => onlineMatchClient.requestPresenceSync()}
          onCancelWait={() => {
            onlineMatchClient.leaveQueueOrRoom(activeRoom?.roomId);
            setInQueue(false);
            setActiveRoom(null);
          }}
          onOpenAuthUpgrade={() => {
            setOnlineArenaTab(null);
            handleOpenAuth('upgrade_guest');
          }}
          onUpdateGuestName={handleUpdateGuestName}
          onClose={handleCloseOnlineArena}
        />
      ) : null}

      {/* Online Inbox Chat, DMs & Live Voice Mic Modal */}
      {inboxOpen ? (
        <InboxModal
          lang={lang}
          account={account}
          currentPlayerId={currentPlayerId}
          displayUsername={displayUsername}
          wsConnected={wsConnected}
          onlinePlayers={mergedOnlinePlayers}
          initialChannel={inboxOpen.channel}
          initialRecipient={inboxOpen.recipient ?? null}
          onClose={handleCloseInbox}
        />
      ) : null}

      {/* Online Social Chat & Entertainment Resort Plaza */}
      <SocialPlazaModal
        open={socialPlazaOpen}
        onClose={handleCloseSocialPlaza}
        playerId={currentPlayerId}
        username={displayUsername}
        initialKickerId={snapshot.kickerId}
        initialSkinId={snapshot.playerSkinId}
        initialAuraId={snapshot.runningAuraId}
      />

      {/* Admin Moderation Modal (strictly restricted to bot522409@gmail.com) */}
      {isAdmin && account && adminPanelOpen ? (
        <AdminPanelModal
          lang={lang}
          currentAdminUid={account.uid}
          onlinePlayers={mergedOnlinePlayers}
          onAdminCoinsAdjusted={handleAdminCoinsAdjusted}
          onKickOnlinePlayer={handleAdminKickOnlinePlayer}
          onEnterImpossible={handleEnterImpossibleFromAdmin}
          onClose={handleCloseAdmin}
        />
      ) : null}

      {/* Auth Gate Modal: 1. Tạo tài khoản / 2. Đăng nhập / Tạo tài khoản với nick này */}
      {authInitialized && authModalView ? (
        <AuthGateModal
          lang={lang}
          club={club}
          hasUnsavedGuestProgress={hasUnsavedGuestProgress}
          initialView={authModalView}
          initialError={authInitialError}
          canDismissToGuest={true}
          onSuccess={handleAuthSuccess}
          onContinueAsGuest={handleContinueAsGuest}
          onClose={handleContinueAsGuest}
        />
      ) : null}

      {/* Direct 1v1 Challenge Incoming Toast */}
      {incomingChallenge ? (
        <div className="fixed top-20 right-4 sm:right-6 z-[72] w-[min(380px,92vw)]">
          <div className="p-4 rounded-2xl bg-[#0B1320]/96 border-2 border-emerald-400/70 shadow-2xl space-y-3">
            <div>
              <div className="text-[11px] font-extrabold text-emerald-300">
                {lang === 'vi'
                  ? 'LỜI MỜI THÁCH ĐẤU 1v1 TRỰC TIẾP!'
                  : 'INCOMING 1v1 CHALLENGE!'}
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5">
                @{incomingChallenge.from.username}{' '}
                <span className="font-mono-tabular text-xs text-amber-300">
                  (OVR {incomingChallenge.from.squadOvr} ·{' '}
                  {incomingChallenge.from.elo} ELO)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'vi'
                  ? 'Muốn rủ bạn vào trận Đấu Online 1v1 ngay lập tức.'
                  : 'Wants to play a live 1v1 Online Duel with you right now.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onlineMatchClient.acceptChallenge(
                    incomingChallenge.challengeId,
                    incomingChallenge.from.playerId,
                  );
                  setIncomingChallenge(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                {lang === 'vi' ? 'Chấp Nhận Đấu' : 'Accept Duel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onlineMatchClient.declineChallenge(
                    incomingChallenge.challengeId,
                    incomingChallenge.from.playerId,
                  );
                  setIncomingChallenge(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {lang === 'vi' ? 'Từ Chối' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Admin Kick Notice Banner */}
      {kickNotice ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#050a14]/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1320] border-2 border-rose-500/70 p-6 shadow-2xl space-y-3 text-center">
            <h3 className="font-display text-2xl font-extrabold text-rose-400">
              {lang === 'vi'
                ? 'BẠN ĐÃ BỊ KICK KHỎI PHÒNG CHƠI'
                : 'REMOVED BY ADMINISTRATOR'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {kickNotice}
            </p>
            <button
              type="button"
              onClick={() => setKickNotice(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-sm cursor-pointer"
            >
              {lang === 'vi' ? 'Đã hiểu' : 'Dismiss'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Impossible Mode Entry / Fee Notice Toast */}
      {impossibleNotice ? (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[min(520px,92vw)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0B1320]/96 border border-amber-400/60 shadow-2xl text-xs sm:text-sm font-semibold text-amber-200">
            <span>{impossibleNotice}</span>
            <button
              type="button"
              onClick={() => setImpossibleNotice(null)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer shrink-0"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
