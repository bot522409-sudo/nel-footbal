import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  computeSquadOvr,
  createFreshMissionsState,
  DEFAULT_FC_CLUB_STATE,
  ensureFreshMissions,
  FC_CLUB_STORAGE_KEY,
  FC_PLAYERS,
  FcClubState,
} from '../game/fcData';
import {
  auth,
  db,
  FIREBASE_PROJECT_ID,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebaseClient';

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
export const ADMIN_EMAIL = 'bot522409@gmail.com';
export const MAX_CLUB_COINS = Number.MAX_SAFE_INTEGER;
const GUEST_PLAYED_FLAG_KEY = 'sut_phat_3d_guest_played_v1';
const BEST_SCORE_STORAGE_KEY = 'sut_phat_3d_best_score_v1';

export function isCurrentUserAdmin(): boolean {
  const fbUser = auth.currentUser;
  return Boolean(
    fbUser &&
      fbUser.email?.toLowerCase() === ADMIN_EMAIL &&
      fbUser.emailVerified === true,
  );
}

export interface AdminPlayerSummary {
  uid: string;
  username: string;
  usernameLower: string;
  coins: number;
  squadOvr: number;
  elo: number;
  onlineWins: number;
  onlineDraws: number;
  onlineLosses: number;
  onlineGoals: number;
  bestScore: number;
  ownedCount: number;
  packsOpened: number;
}

export interface OnlineRecordStats {
  onlineWins: number;
  onlineDraws: number;
  onlineLosses: number;
  onlineGoals: number;
  elo: number;
  bestScore: number;
}

export interface OnlineAccountProfile {
  uid: string;
  username: string;
  usernameLower: string;
  club: FcClubState;
  stats: OnlineRecordStats;
}

export interface LeaderboardPlayerEntry {
  uid: string;
  username: string;
  squadOvr: number;
  elo: number;
  onlineWins: number;
  onlineGoals: number;
  bestScore: number;
  topCardName: string;
  topCardOvr: number;
}

export interface DirectoryPlayerEntry {
  uid: string;
  username: string;
  squadOvr: number;
  elo: number;
}

export interface AuthActionError {
  code: string;
  messageVi: string;
  messageEn: string;
  needsEmailProviderEnable?: boolean;
  consoleUrl?: string;
}

export const DEFAULT_ONLINE_STATS: OnlineRecordStats = {
  onlineWins: 0,
  onlineDraws: 0,
  onlineLosses: 0,
  onlineGoals: 0,
  elo: 1000,
  bestScore: 0,
};

export function normalizeUsername(raw: string): {
  display: string;
  lower: string;
  valid: boolean;
} {
  const display = raw.trim();
  const valid = USERNAME_REGEX.test(display);
  return {
    display,
    lower: display.toLowerCase(),
    valid,
  };
}

function usernameToSyntheticEmail(usernameLower: string): string {
  return `${usernameLower}@sutphat3d.app`;
}

export function markPlayedAsGuest(): void {
  try {
    localStorage.setItem(GUEST_PLAYED_FLAG_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export function loadLocalBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
  } catch {
    return 0;
  }
}

export function hasLocalUnsavedProgress(club: FcClubState): boolean {
  try {
    const guestFlag = localStorage.getItem(GUEST_PLAYED_FLAG_KEY) === '1';
    const hasSavedBlob = Boolean(localStorage.getItem(FC_CLUB_STORAGE_KEY));
    const coinsChanged = club.coins !== DEFAULT_FC_CLUB_STATE.coins;
    const extraCards = club.ownedIds.length > DEFAULT_FC_CLUB_STATE.ownedIds.length;
    const packsChanged = club.packsOpened > 0;
    const missionChanged =
      Object.keys(club.missions.dailyProgress).length > 0 ||
      Object.keys(club.missions.weeklyProgress).length > 0;
    const hasScore = loadLocalBestScore() > 0;
    return (
      guestFlag ||
      hasSavedBlob ||
      coinsChanged ||
      extraCards ||
      packsChanged ||
      missionChanged ||
      hasScore
    );
  } catch {
    return false;
  }
}

function sanitizeClubForCloud(club: FcClubState): FcClubState {
  const validOwned = club.ownedIds
    .filter((id) => Boolean(FC_PLAYERS[id]))
    .slice(0, 250);
  const ownedIds =
    validOwned.length >= 5 ? validOwned : [...DEFAULT_FC_CLUB_STATE.ownedIds];
  const fallbackLineup = DEFAULT_FC_CLUB_STATE.lineupIds;
  const lineupIds: [string, string, string, string, string] = [
    FC_PLAYERS[club.lineupIds[0]] ? club.lineupIds[0] : fallbackLineup[0],
    FC_PLAYERS[club.lineupIds[1]] ? club.lineupIds[1] : fallbackLineup[1],
    FC_PLAYERS[club.lineupIds[2]] ? club.lineupIds[2] : fallbackLineup[2],
    FC_PLAYERS[club.lineupIds[3]] ? club.lineupIds[3] : fallbackLineup[3],
    FC_PLAYERS[club.lineupIds[4]] ? club.lineupIds[4] : fallbackLineup[4],
  ];
  return {
    coins: Math.max(0, Math.min(MAX_CLUB_COINS, Math.round(club.coins))),
    ownedIds,
    lineupIds,
    activeKickerCardId: FC_PLAYERS[club.activeKickerCardId]
      ? club.activeKickerCardId
      : lineupIds[4],
    activeGkCardId: FC_PLAYERS[club.activeGkCardId]
      ? club.activeGkCardId
      : lineupIds[0],
    packsOpened: Math.max(0, Math.min(1000000, Math.round(club.packsOpened))),
    missions: ensureFreshMissions(club.missions),
  };
}

function getTopOwnedCardInfo(club: FcClubState): { name: string; ovr: number } {
  let best = FC_PLAYERS[club.lineupIds[4]] ?? FC_PLAYERS['silver_st_1'];
  for (const id of club.ownedIds) {
    const card = FC_PLAYERS[id];
    if (card && card.ovr > (best?.ovr ?? 0)) {
      best = card;
    }
  }
  return {
    name: (best?.shortName || 'Starter').slice(0, 48),
    ovr: Math.max(1, Math.min(200, Math.round(best?.ovr ?? 79))),
  };
}

function mapFirebaseAuthError(error: unknown): AuthActionError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code ?? 'auth/unknown')
      : 'auth/unknown';
  const consoleUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`;

  switch (code) {
    case 'auth/operation-not-allowed':
      return {
        code,
        needsEmailProviderEnable: true,
        consoleUrl,
        messageVi:
          'Dự án Firebase chưa bật phương thức Email/Mật khẩu. Hãy bật "Email/Password" trong Firebase Console (mục Authentication → Sign-in method) hoặc đăng nhập bằng Google ngay bên dưới.',
        messageEn:
          'Email/Password provider is not enabled yet in Firebase Console. Enable Email/Password in Authentication → Sign-in method, or use Google Sign-In below.',
      };
    case 'auth/email-already-in-use':
      return {
        code,
        messageVi: 'Tên tài khoản này đã được đăng ký. Hãy chọn tên khác hoặc chuyển sang Đăng nhập.',
        messageEn: 'This username is already taken. Choose another or log in.',
      };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        code,
        messageVi: 'Sai tên tài khoản hoặc mật khẩu. Vui lòng kiểm tra lại.',
        messageEn: 'Incorrect username or password. Please try again.',
      };
    case 'auth/weak-password':
      return {
        code,
        messageVi: 'Mật khẩu quá yếu. Vui lòng nhập ít nhất 6 ký tự.',
        messageEn: 'Password must be at least 6 characters.',
      };
    case 'auth/popup-closed-by-user':
      return {
        code,
        messageVi: 'Bạn đã đóng cửa sổ đăng nhập Google.',
        messageEn: 'Google sign-in popup was closed.',
      };
    case 'auth/network-request-failed':
      return {
        code,
        messageVi: 'Lỗi mạng. Vui lòng kiểm tra kết nối Internet và thử lại.',
        messageEn: 'Network error. Please check your connection and try again.',
      };
    default:
      return {
        code,
        messageVi:
          error instanceof Error
            ? `Không thể xác thực (${error.message})`
            : 'Đăng nhập thất bại. Vui lòng thử lại.',
        messageEn:
          error instanceof Error
            ? `Authentication failed (${error.message})`
            : 'Authentication failed. Please try again.',
      };
  }
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { lower, valid } = normalizeUsername(username);
  if (!valid) return false;
  const path = `usernames/${lower}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', lower));
    return !snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

async function writeNewAccountDocuments(
  uid: string,
  username: string,
  usernameLower: string,
  club: FcClubState,
  stats: OnlineRecordStats,
): Promise<void> {
  const safeClub = sanitizeClubForCloud(club);
  const squadOvr = Math.max(1, Math.min(200, computeSquadOvr(safeClub.lineupIds)));
  const topCard = getTopOwnedCardInfo(safeClub);

  const batch = writeBatch(db);
  batch.set(doc(db, 'usernames', usernameLower), {
    uid,
    username,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', uid), {
    uid,
    username,
    usernameLower,
    coins: safeClub.coins,
    ownedIds: safeClub.ownedIds,
    lineupIds: safeClub.lineupIds,
    activeKickerCardId: safeClub.activeKickerCardId,
    activeGkCardId: safeClub.activeGkCardId,
    packsOpened: safeClub.packsOpened,
    missions: safeClub.missions,
    onlineWins: stats.onlineWins,
    onlineDraws: stats.onlineDraws,
    onlineLosses: stats.onlineLosses,
    onlineGoals: stats.onlineGoals,
    elo: stats.elo,
    bestScore: stats.bestScore,
    squadOvr,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'leaderboard', uid), {
    uid,
    username,
    isPublic: true,
    squadOvr,
    elo: stats.elo,
    onlineWins: stats.onlineWins,
    onlineGoals: stats.onlineGoals,
    bestScore: stats.bestScore,
    topCardName: topCard.name,
    topCardOvr: topCard.ovr,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function registerWithUsername(
  rawUsername: string,
  password: string,
  seedClub?: FcClubState,
): Promise<{ ok: true; profile: OnlineAccountProfile } | { ok: false; error: AuthActionError }> {
  const { display, lower, valid } = normalizeUsername(rawUsername);
  if (!valid) {
    return {
      ok: false,
      error: {
        code: 'validation/username',
        messageVi:
          'Tên tài khoản cần 3–24 ký tự gồm chữ cái không dấu, số hoặc dấu gạch dưới (_).',
        messageEn:
          'Username must be 3–24 characters using letters, numbers, or underscores (_).',
      },
    };
  }
  if (password.length < 6) {
    return {
      ok: false,
      error: {
        code: 'validation/password',
        messageVi: 'Mật khẩu cần tối thiểu 6 ký tự.',
        messageEn: 'Password must be at least 6 characters.',
      },
    };
  }

  try {
    const available = await isUsernameAvailable(display);
    if (!available) {
      return {
        ok: false,
        error: {
          code: 'auth/username-taken',
          messageVi: `Tên "${display}" đã có người dùng. Hãy chọn tên khác hoặc đăng nhập.`,
          messageEn: `Username "${display}" is already taken.`,
        },
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: mapFirebaseAuthError(err),
    };
  }

  const email = usernameToSyntheticEmail(lower);
  let user: User;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
    await updateProfile(user, { displayName: display });
  } catch (err) {
    return { ok: false, error: mapFirebaseAuthError(err) };
  }

  const initialClub = sanitizeClubForCloud(
    seedClub ?? {
      ...DEFAULT_FC_CLUB_STATE,
      missions: createFreshMissionsState(),
    },
  );
  const initialStats: OnlineRecordStats = {
    ...DEFAULT_ONLINE_STATS,
    bestScore: loadLocalBestScore(),
  };

  await writeNewAccountDocuments(user.uid, display, lower, initialClub, initialStats);
  try {
    localStorage.removeItem(GUEST_PLAYED_FLAG_KEY);
  } catch {
    // ignore
  }

  return {
    ok: true,
    profile: {
      uid: user.uid,
      username: display,
      usernameLower: lower,
      club: initialClub,
      stats: initialStats,
    },
  };
}

export async function loginWithUsername(
  rawUsername: string,
  password: string,
): Promise<{ ok: true; profile: OnlineAccountProfile } | { ok: false; error: AuthActionError }> {
  const { display, lower, valid } = normalizeUsername(rawUsername);
  if (!valid || !password) {
    return {
      ok: false,
      error: {
        code: 'validation/login',
        messageVi: 'Vui lòng nhập đúng tên tài khoản và mật khẩu.',
        messageEn: 'Please enter a valid username and password.',
      },
    };
  }

  const email = usernameToSyntheticEmail(lower);
  let user: User;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    user = cred.user;
  } catch (err) {
    return { ok: false, error: mapFirebaseAuthError(err) };
  }

  const loaded = await fetchUserAccountProfile(user.uid);
  if (loaded) {
    return { ok: true, profile: loaded };
  }

  // Fallback recovery if Auth user exists without Firestore profile
  const fallbackClub = sanitizeClubForCloud({
    ...DEFAULT_FC_CLUB_STATE,
    missions: createFreshMissionsState(),
  });
  const fallbackStats = { ...DEFAULT_ONLINE_STATS };
  await writeNewAccountDocuments(user.uid, display, lower, fallbackClub, fallbackStats);
  return {
    ok: true,
    profile: {
      uid: user.uid,
      username: display,
      usernameLower: lower,
      club: fallbackClub,
      stats: fallbackStats,
    },
  };
}

function buildSafeUsernameFromGoogleUser(user: User, suffix = ''): string {
  const baseRaw = (user.displayName || user.email?.split('@')[0] || 'Player')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');
  const trimmed = (baseRaw.length >= 3 ? baseRaw : `Player_${user.uid.slice(0, 5)}`).slice(
    0,
    24 - suffix.length,
  );
  return `${trimmed}${suffix}`;
}

export async function loginWithGoogle(
  seedClub?: FcClubState,
): Promise<{ ok: true; profile: OnlineAccountProfile } | { ok: false; error: AuthActionError }> {
  let user: User;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    user = cred.user;
  } catch (err) {
    return { ok: false, error: mapFirebaseAuthError(err) };
  }

  const existingProfile = await fetchUserAccountProfile(user.uid);
  if (existingProfile) {
    return { ok: true, profile: existingProfile };
  }

  let candidate = buildSafeUsernameFromGoogleUser(user);
  for (let i = 0; i < 4; i++) {
    const available = await isUsernameAvailable(candidate);
    if (available) break;
    candidate = buildSafeUsernameFromGoogleUser(
      user,
      `_${Math.floor(100 + Math.random() * 899)}`,
    );
  }

  const { display, lower } = normalizeUsername(candidate);
  const initialClub = sanitizeClubForCloud(
    seedClub ?? {
      ...DEFAULT_FC_CLUB_STATE,
      missions: createFreshMissionsState(),
    },
  );
  const initialStats: OnlineRecordStats = {
    ...DEFAULT_ONLINE_STATS,
    bestScore: loadLocalBestScore(),
  };
  await writeNewAccountDocuments(user.uid, display, lower, initialClub, initialStats);
  return {
    ok: true,
    profile: {
      uid: user.uid,
      username: display,
      usernameLower: lower,
      club: initialClub,
      stats: initialStats,
    },
  };
}

export async function logoutAccount(): Promise<void> {
  await signOut(auth);
}

export async function fetchUserAccountProfile(
  uid: string,
): Promise<OnlineAccountProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const club = sanitizeClubForCloud({
      coins: typeof data.coins === 'number' ? data.coins : 1200,
      ownedIds: Array.isArray(data.ownedIds)
        ? data.ownedIds
        : DEFAULT_FC_CLUB_STATE.ownedIds,
      lineupIds: Array.isArray(data.lineupIds) && data.lineupIds.length === 5
        ? (data.lineupIds as [string, string, string, string, string])
        : DEFAULT_FC_CLUB_STATE.lineupIds,
      activeKickerCardId:
        typeof data.activeKickerCardId === 'string'
          ? data.activeKickerCardId
          : DEFAULT_FC_CLUB_STATE.activeKickerCardId,
      activeGkCardId:
        typeof data.activeGkCardId === 'string'
          ? data.activeGkCardId
          : DEFAULT_FC_CLUB_STATE.activeGkCardId,
      packsOpened: typeof data.packsOpened === 'number' ? data.packsOpened : 0,
      missions: ensureFreshMissions(data.missions),
    });
    return {
      uid,
      username: typeof data.username === 'string' ? data.username : 'Player',
      usernameLower:
        typeof data.usernameLower === 'string' ? data.usernameLower : 'player',
      club,
      stats: {
        onlineWins: typeof data.onlineWins === 'number' ? data.onlineWins : 0,
        onlineDraws: typeof data.onlineDraws === 'number' ? data.onlineDraws : 0,
        onlineLosses: typeof data.onlineLosses === 'number' ? data.onlineLosses : 0,
        onlineGoals: typeof data.onlineGoals === 'number' ? data.onlineGoals : 0,
        elo: typeof data.elo === 'number' ? data.elo : 1000,
        bestScore: typeof data.bestScore === 'number' ? data.bestScore : 0,
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function syncAccountProgressToCloud(
  uid: string,
  username: string,
  club: FcClubState,
  stats: OnlineRecordStats,
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeClub = sanitizeClubForCloud(club);
  const squadOvr = Math.max(1, Math.min(200, computeSquadOvr(safeClub.lineupIds)));
  const topCard = getTopOwnedCardInfo(safeClub);

  const userPath = `users/${uid}`;
  const lbPath = `leaderboard/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      coins: safeClub.coins,
      ownedIds: safeClub.ownedIds,
      lineupIds: safeClub.lineupIds,
      activeKickerCardId: safeClub.activeKickerCardId,
      activeGkCardId: safeClub.activeGkCardId,
      packsOpened: safeClub.packsOpened,
      missions: safeClub.missions,
      onlineWins: Math.max(0, Math.round(stats.onlineWins)),
      onlineDraws: Math.max(0, Math.round(stats.onlineDraws)),
      onlineLosses: Math.max(0, Math.round(stats.onlineLosses)),
      onlineGoals: Math.max(0, Math.round(stats.onlineGoals)),
      elo: Math.max(0, Math.min(10000, Math.round(stats.elo))),
      bestScore: Math.max(0, Math.round(stats.bestScore)),
      squadOvr,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }

  try {
    await setDoc(
      doc(db, 'leaderboard', uid),
      {
        uid,
        username,
        isPublic: true,
        squadOvr,
        elo: Math.max(0, Math.min(10000, Math.round(stats.elo))),
        onlineWins: Math.max(0, Math.round(stats.onlineWins)),
        onlineGoals: Math.max(0, Math.round(stats.onlineGoals)),
        bestScore: Math.max(0, Math.round(stats.bestScore)),
        topCardName: topCard.name,
        topCardOvr: topCard.ovr,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, lbPath);
  }
}

export function subscribeLeaderboard(
  onUpdate: (entries: LeaderboardPlayerEntry[]) => void,
): () => void {
  const path = 'leaderboard';
  const q = query(
    collection(db, path),
    where('isPublic', '==', true),
    orderBy('elo', 'desc'),
    limit(25),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: LeaderboardPlayerEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: String(data.uid ?? d.id),
          username: String(data.username ?? 'Player'),
          squadOvr: Number(data.squadOvr ?? 79),
          elo: Number(data.elo ?? 1000),
          onlineWins: Number(data.onlineWins ?? 0),
          onlineGoals: Number(data.onlineGoals ?? 0),
          bestScore: Number(data.bestScore ?? 0),
          topCardName: String(data.topCardName ?? 'Starter'),
          topCardOvr: Number(data.topCardOvr ?? 79),
        };
      });
      entries.sort((a, b) => b.elo - a.elo || b.squadOvr - a.squadOvr);
      onUpdate(entries);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeDirectoryPlayers(
  onUpdate: (entries: DirectoryPlayerEntry[]) => void,
): () => void {
  const path = 'leaderboard';
  const q = query(
    collection(db, path),
    where('isPublic', '==', true),
    limit(120),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: DirectoryPlayerEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: String(data.uid ?? d.id),
          username: String(data.username ?? 'Player'),
          squadOvr: Number(data.squadOvr ?? 79),
          elo: Number(data.elo ?? 1000),
        };
      });
      entries.sort(
        (a, b) =>
          b.elo - a.elo ||
          b.squadOvr - a.squadOvr ||
          a.username.localeCompare(b.username),
      );
      onUpdate(entries);
    },
    (error) => {
      console.warn('Directory list warning:', error);
      onUpdate([]);
    },
  );
}

export interface CloudAccountSnapshotUpdate {
  coins?: number;
  kickedAtMs?: number;
  kickReason?: string;
}

export function subscribeMyCloudAccount(
  uid: string,
  onRemoteUpdate: (update: CloudAccountSnapshotUpdate) => void,
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      const data = snap.data();
      const update: CloudAccountSnapshotUpdate = {};
      if (typeof data.coins === 'number') {
        update.coins = Math.max(0, Math.min(MAX_CLUB_COINS, Math.round(data.coins)));
      }
      if (data.kickedAt instanceof Timestamp) {
        update.kickedAtMs = data.kickedAt.toMillis();
        update.kickReason =
          typeof data.kickReason === 'string' && data.kickReason.trim().length > 0
            ? data.kickReason
            : 'Bạn đã bị Quản Trị Viên mời khỏi phiên chơi.';
      }
      onRemoteUpdate(update);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export async function fetchAllPlayersForAdmin(): Promise<AdminPlayerSummary[]> {
  if (!isCurrentUserAdmin()) {
    throw new Error('Chỉ tài khoản quản trị viên bot522409@gmail.com mới được phép.');
  }
  const path = 'users';
  try {
    const q = query(collection(db, path), orderBy('coins', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid ?? d.id),
        username: String(data.username ?? 'Player'),
        usernameLower: String(data.usernameLower ?? ''),
        coins: typeof data.coins === 'number' ? data.coins : 0,
        squadOvr: typeof data.squadOvr === 'number' ? data.squadOvr : 79,
        elo: typeof data.elo === 'number' ? data.elo : 1000,
        onlineWins: typeof data.onlineWins === 'number' ? data.onlineWins : 0,
        onlineDraws: typeof data.onlineDraws === 'number' ? data.onlineDraws : 0,
        onlineLosses: typeof data.onlineLosses === 'number' ? data.onlineLosses : 0,
        onlineGoals: typeof data.onlineGoals === 'number' ? data.onlineGoals : 0,
        bestScore: typeof data.bestScore === 'number' ? data.bestScore : 0,
        ownedCount: Array.isArray(data.ownedIds) ? data.ownedIds.length : 5,
        packsOpened: typeof data.packsOpened === 'number' ? data.packsOpened : 0,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function adminAdjustPlayerCoins(
  targetUid: string,
  nextCoins: number,
): Promise<number> {
  if (!isCurrentUserAdmin()) {
    throw new Error('Chỉ tài khoản quản trị viên bot522409@gmail.com mới được phép.');
  }
  const safeCoins = Math.max(0, Math.min(MAX_CLUB_COINS, Math.round(nextCoins)));
  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      coins: safeCoins,
      updatedAt: serverTimestamp(),
    });
    return safeCoins;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adminKickPlayer(
  targetUid: string,
  reason = 'Bạn đã bị Quản Trị Viên kick khỏi hệ thống.',
): Promise<void> {
  if (!isCurrentUserAdmin()) {
    throw new Error('Chỉ tài khoản quản trị viên bot522409@gmail.com mới được phép.');
  }
  if (auth.currentUser?.uid === targetUid) {
    throw new Error('Không thể tự kick tài khoản Quản Trị Viên.');
  }
  const safeReason =
    reason.trim().slice(0, 140) || 'Bạn đã bị Quản Trị Viên kick khỏi hệ thống.';
  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      kickedAt: serverTimestamp(),
      kickReason: safeReason,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export interface TransferListingRecord {
  listingId: string;
  sellerUid: string;
  sellerName: string;
  cardId: string;
  cardName: string;
  cardOvr: number;
  cardPosition: string;
  cardRarity: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  buyerUid: string | null;
  buyerName: string | null;
  payoutClaimed: boolean;
  createdAtMs: number;
}

export function subscribeTransferListings(
  onUpdate: (listings: TransferListingRecord[]) => void,
): () => void {
  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const path = 'transfer_listings';
  const q = query(
    collection(db, path),
    orderBy('createdAt', 'desc'),
    limit(120),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: TransferListingRecord[] = snap.docs
        .map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            listingId: String(data.listingId ?? d.id),
            sellerUid: String(data.sellerUid ?? ''),
            sellerName: String(data.sellerName ?? 'Player'),
            cardId: String(data.cardId ?? ''),
            cardName: String(data.cardName ?? ''),
            cardOvr: Number(data.cardOvr ?? 75),
            cardPosition: String(data.cardPosition ?? 'ST'),
            cardRarity: String(data.cardRarity ?? 'gold'),
            price: Number(data.price ?? 100),
            status:
              data.status === 'sold' || data.status === 'cancelled'
                ? data.status
                : ('active' as const),
            buyerUid: typeof data.buyerUid === 'string' ? data.buyerUid : null,
            buyerName: typeof data.buyerName === 'string' ? data.buyerName : null,
            payoutClaimed: Boolean(data.payoutClaimed),
            createdAtMs,
          };
        })
        .filter((item) => Boolean(FC_PLAYERS[item.cardId]));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function createTransferListing(
  uid: string,
  sellerName: string,
  cardId: string,
  rawPrice: number,
): Promise<{ listingId: string; nextOwnedIds: string[] }> {
  const card = FC_PLAYERS[cardId];
  if (!card) {
    throw new Error('Thẻ cầu thủ không hợp lệ.');
  }
  const price = Math.max(100, Math.min(MAX_CLUB_COINS, Math.round(rawPrice)));
  const listingId = `tr_${uid.slice(0, 8)}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const userRef = doc(db, 'users', uid);
  const listingRef = doc(db, 'transfer_listings', listingId);

  try {
    return await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('Không tìm thấy dữ liệu tài khoản.');
      }
      const data = userSnap.data();
      const ownedIds: string[] = Array.isArray(data.ownedIds)
        ? [...data.ownedIds]
        : [];
      const lineupIds: string[] = Array.isArray(data.lineupIds)
        ? [...data.lineupIds]
        : [];

      if (lineupIds.includes(cardId)) {
        throw new Error('Cầu thủ đang trong đội hình 5v5 ra sân. Hãy thay ra trước khi rao bán!');
      }
      const idx = ownedIds.indexOf(cardId);
      if (idx < 0) {
        throw new Error('Bạn không sở hữu thẻ cầu thủ này trong kho.');
      }
      if (ownedIds.length <= 5) {
        throw new Error('Câu lạc bộ cần giữ tối thiểu 5 cầu thủ, không thể bán thêm.');
      }

      ownedIds.splice(idx, 1);
      const safeSquadOvr = Math.max(1, Math.min(200, computeSquadOvr(lineupIds)));

      tx.update(userRef, {
        ownedIds,
        squadOvr: safeSquadOvr,
        updatedAt: serverTimestamp(),
      });
      tx.set(listingRef, {
        listingId,
        sellerUid: uid,
        sellerName: sellerName.slice(0, 24),
        cardId: card.id,
        cardName: card.shortName.slice(0, 48),
        cardOvr: Math.max(1, Math.min(200, card.ovr)),
        cardPosition: card.position,
        cardRarity: card.rarity,
        price,
        status: 'active',
        buyerUid: null,
        buyerName: null,
        payoutClaimed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { listingId, nextOwnedIds: ownedIds };
    });
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Firebase')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `transfer_listings/${listingId}`);
  }
}

export async function cancelTransferListing(
  uid: string,
  listingId: string,
): Promise<{ cardId: string; nextOwnedIds: string[] }> {
  const userRef = doc(db, 'users', uid);
  const listingRef = doc(db, 'transfer_listings', listingId);

  try {
    return await runTransaction(db, async (tx) => {
      const [listingSnap, userSnap] = await Promise.all([
        tx.get(listingRef),
        tx.get(userRef),
      ]);
      if (!listingSnap.exists() || !userSnap.exists()) {
        throw new Error('Không tìm thấy giao dịch rao bán này.');
      }
      const l = listingSnap.data();
      if (l.sellerUid !== uid || l.status !== 'active') {
        throw new Error('Thẻ này đã được mua hoặc đã bị hủy trước đó.');
      }
      const cardId = String(l.cardId);
      const u = userSnap.data();
      const ownedIds: string[] = Array.isArray(u.ownedIds) ? [...u.ownedIds] : [];
      if (!ownedIds.includes(cardId) && ownedIds.length < 250) {
        ownedIds.push(cardId);
      }
      tx.update(userRef, {
        ownedIds,
        updatedAt: serverTimestamp(),
      });
      tx.update(listingRef, {
        status: 'cancelled',
        payoutClaimed: true,
        updatedAt: serverTimestamp(),
      });
      return { cardId, nextOwnedIds: ownedIds };
    });
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Firebase')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `transfer_listings/${listingId}`);
  }
}

export async function buyTransferListing(
  buyerUid: string,
  buyerName: string,
  listingId: string,
  isAdminBuyer: boolean,
): Promise<{
  cardId: string;
  pricePaid: number;
  nextCoins: number;
  nextOwnedIds: string[];
}> {
  const userRef = doc(db, 'users', buyerUid);
  const listingRef = doc(db, 'transfer_listings', listingId);

  try {
    return await runTransaction(db, async (tx) => {
      const [listingSnap, userSnap] = await Promise.all([
        tx.get(listingRef),
        tx.get(userRef),
      ]);
      if (!listingSnap.exists() || !userSnap.exists()) {
        throw new Error('Không tìm thấy thẻ đang rao bán.');
      }
      const l = listingSnap.data();
      if (l.status !== 'active') {
        throw new Error('Thẻ cầu thủ này vừa được người khác mua mất rồi!');
      }
      if (l.sellerUid === buyerUid) {
        throw new Error('Bạn không thể tự mua lại thẻ do chính mình rao bán.');
      }
      const cardId = String(l.cardId);
      const price = Number(l.price ?? 0);

      const u = userSnap.data();
      const currentCoins = typeof u.coins === 'number' ? u.coins : 0;
      const ownedIds: string[] = Array.isArray(u.ownedIds) ? [...u.ownedIds] : [];

      if (ownedIds.includes(cardId)) {
        throw new Error('Bạn đã sở hữu thẻ cầu thủ này trong kho rồi.');
      }
      if (ownedIds.length >= 250) {
        throw new Error('Kho cầu thủ đã đầy tối đa 250 thẻ.');
      }
      if (!isAdminBuyer && currentCoins < price) {
        throw new Error(`Không đủ Xu! Cần ${price.toLocaleString()} Xu để mua thẻ này.`);
      }

      const nextCoins = isAdminBuyer
        ? currentCoins
        : Math.max(0, currentCoins - price);
      ownedIds.push(cardId);

      tx.update(userRef, {
        coins: nextCoins,
        ownedIds,
        updatedAt: serverTimestamp(),
      });
      tx.update(listingRef, {
        status: 'sold',
        buyerUid,
        buyerName: buyerName.slice(0, 24),
        payoutClaimed: false,
        updatedAt: serverTimestamp(),
      });
      return {
        cardId,
        pricePaid: isAdminBuyer ? 0 : price,
        nextCoins,
        nextOwnedIds: ownedIds,
      };
    });
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Firebase')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `transfer_listings/${listingId}`);
  }
}

export async function claimTransferSalePayouts(
  sellerUid: string,
  isAdminSeller: boolean,
): Promise<{
  claimedCount: number;
  totalCoinsReceived: number;
  latestCoins: number | null;
}> {
  if (!auth.currentUser || auth.currentUser.uid !== sellerUid) {
    return { claimedCount: 0, totalCoinsReceived: 0, latestCoins: null };
  }
  const q = query(
    collection(db, 'transfer_listings'),
    where('sellerUid', '==', sellerUid),
    where('status', '==', 'sold'),
    where('payoutClaimed', '==', false),
    limit(20),
  );
  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      return { claimedCount: 0, totalCoinsReceived: 0, latestCoins: null };
    }
    let claimedCount = 0;
    let totalCoinsReceived = 0;
    let latestCoins: number | null = null;
    const userRef = doc(db, 'users', sellerUid);

    for (const d of snap.docs) {
      const listingRef = doc(db, 'transfer_listings', d.id);
      const res = await runTransaction(db, async (tx) => {
        const [listingSnap, userSnap] = await Promise.all([
          tx.get(listingRef),
          tx.get(userRef),
        ]);
        if (!listingSnap.exists() || !userSnap.exists()) return null;
        const l = listingSnap.data();
        if (
          l.sellerUid !== sellerUid ||
          l.status !== 'sold' ||
          l.payoutClaimed === true
        ) {
          return null;
        }
        const price = Math.max(0, Math.round(Number(l.price ?? 0)));
        const currentCoins =
          typeof userSnap.data().coins === 'number' ? userSnap.data().coins : 0;
        const nextCoins = isAdminSeller
          ? currentCoins
          : Math.min(MAX_CLUB_COINS, currentCoins + price);

        tx.update(userRef, {
          coins: nextCoins,
          updatedAt: serverTimestamp(),
        });
        tx.update(listingRef, {
          payoutClaimed: true,
          updatedAt: serverTimestamp(),
        });
        return { price, nextCoins };
      });
      if (res) {
        claimedCount += 1;
        totalCoinsReceived += res.price;
        latestCoins = res.nextCoins;
      }
    }
    return { claimedCount, totalCoinsReceived, latestCoins };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'transfer_listings');
  }
}

export interface CloudInboxMessageRecord {
  messageId: string;
  channel: 'global' | 'dm';
  senderUid: string;
  senderName: string;
  recipientUid: string | null;
  recipientName: string | null;
  participants: string[];
  text: string;
  createdAtMs: number;
}

function toValidInboxDisplayName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24);
  if (cleaned.length >= 3) return cleaned;
  return `${cleaned}___`.slice(0, 3);
}

export async function sendCloudInboxMessage(params: {
  senderUid: string;
  senderName: string;
  channel: 'global' | 'dm';
  recipientUid?: string | null;
  recipientName?: string | null;
  text: string;
}): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== params.senderUid) {
    return;
  }
  const cleanText = params.text.trim().slice(0, 500);
  if (!cleanText) return;

  const isValidRecipientId =
    typeof params.recipientUid === 'string' &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(params.recipientUid);

  const isDm =
    params.channel === 'dm' &&
    isValidRecipientId &&
    params.recipientUid !== params.senderUid &&
    Boolean(params.recipientName);

  const messageId = `msg_${params.senderUid.slice(0, 8)}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const path = `inbox_messages/${messageId}`;
  try {
    await setDoc(doc(db, 'inbox_messages', messageId), {
      messageId,
      channel: isDm ? 'dm' : 'global',
      senderUid: params.senderUid,
      senderName: toValidInboxDisplayName(params.senderName),
      recipientUid: isDm ? params.recipientUid! : null,
      recipientName: isDm ? toValidInboxDisplayName(params.recipientName!) : null,
      participants: isDm ? [params.senderUid, params.recipientUid!] : [],
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn(`Failed writing cloud inbox message (${path}):`, err);
  }
}

export function subscribeCloudGlobalInbox(
  onUpdate: (messages: CloudInboxMessageRecord[]) => void,
): () => void {
  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const path = 'inbox_messages';
  const q = query(
    collection(db, path),
    where('channel', '==', 'global'),
    limit(80),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: CloudInboxMessageRecord[] = snap.docs
        .map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            messageId: String(data.messageId ?? d.id),
            channel: 'global' as const,
            senderUid: String(data.senderUid ?? ''),
            senderName: String(data.senderName ?? 'Player'),
            recipientUid: null,
            recipientName: null,
            participants: [],
            text: String(data.text ?? ''),
            createdAtMs,
          };
        })
        .sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeCloudDmInbox(
  uid: string,
  onUpdate: (messages: CloudInboxMessageRecord[]) => void,
): () => void {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    onUpdate([]);
    return () => {};
  }
  const path = 'inbox_messages';
  const q = query(
    collection(db, path),
    where('participants', 'array-contains', uid),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: CloudInboxMessageRecord[] = snap.docs
        .map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            messageId: String(data.messageId ?? d.id),
            channel: 'dm' as const,
            senderUid: String(data.senderUid ?? ''),
            senderName: String(data.senderName ?? 'Player'),
            recipientUid: typeof data.recipientUid === 'string' ? data.recipientUid : null,
            recipientName: typeof data.recipientName === 'string' ? data.recipientName : null,
            participants: Array.isArray(data.participants)
              ? data.participants.map(String)
              : [],
            text: String(data.text ?? ''),
            createdAtMs,
          };
        })
        .sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export type CloudPresenceActivity = 'menu' | 'playing' | 'queue' | 'waiting' | 'duel';

export interface OnlinePresenceCloudRecord {
  uid: string;
  username: string;
  activity: CloudPresenceActivity;
  modeLabel: string;
  squadOvr: number;
  elo: number;
  kickerId: string;
  gkId: string;
  roomCode: string | null;
  lastSeenMs: number;
}

export async function updateCloudOnlinePresence(params: {
  uid: string;
  username: string;
  activity: CloudPresenceActivity;
  modeLabel: string;
  squadOvr: number;
  elo: number;
  kickerId: string;
  gkId: string;
  roomCode?: string | null;
}): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== params.uid) return;
  const path = `online_presence/${params.uid}`;
  try {
    await setDoc(doc(db, 'online_presence', params.uid), {
      uid: params.uid,
      username: params.username.slice(0, 24),
      activity: params.activity,
      modeLabel: params.modeLabel.slice(0, 48),
      squadOvr: Math.max(1, Math.min(200, Math.round(params.squadOvr))),
      elo: Math.max(0, Math.min(10000, Math.round(params.elo))),
      kickerId: params.kickerId.slice(0, 32),
      gkId: params.gkId.slice(0, 32),
      roomCode: params.roomCode ? params.roomCode.slice(0, 12) : null,
      lastSeenMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeCloudOnlinePresence(uid: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  try {
    await deleteDoc(doc(db, 'online_presence', uid));
  } catch {
    // ignore cleanup error on signout
  }
}

export function subscribeCloudOnlinePresence(
  onUpdate: (players: OnlinePresenceCloudRecord[]) => void,
): () => void {
  const path = 'online_presence';
  const q = query(collection(db, path), orderBy('lastSeenMs', 'desc'), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const rows: OnlinePresenceCloudRecord[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const lastSeenMs = Number(data.lastSeenMs ?? 0);
        if (now - lastSeenMs > 75_000) continue;
        const rawAct = String(data.activity ?? 'menu');
        const activity: CloudPresenceActivity =
          rawAct === 'playing' ||
          rawAct === 'queue' ||
          rawAct === 'waiting' ||
          rawAct === 'duel'
            ? rawAct
            : 'menu';
        rows.push({
          uid: String(data.uid ?? d.id),
          username: String(data.username ?? 'Player'),
          activity,
          modeLabel: String(data.modeLabel ?? 'Sảnh Chính'),
          squadOvr: Number(data.squadOvr ?? 79),
          elo: Number(data.elo ?? 1000),
          kickerId: String(data.kickerId ?? 'ronaldo'),
          gkId: String(data.gkId ?? 'courtois'),
          roomCode: typeof data.roomCode === 'string' ? data.roomCode : null,
          lastSeenMs,
        });
      }
      onUpdate(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}


