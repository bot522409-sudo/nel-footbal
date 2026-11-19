import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  KeyRound,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { computeSquadOvr, FcClubState, Language } from '../game/fcData';
import {
  AuthActionError,
  loginWithGoogle,
  loginWithUsername,
  OnlineAccountProfile,
  registerWithUsername,
} from '../services/onlineClubService';

export type AuthModalInitialView = 'choice' | 'register' | 'login' | 'upgrade_guest';

interface AuthGateModalProps {
  lang: Language;
  club: FcClubState;
  hasUnsavedGuestProgress: boolean;
  initialView: AuthModalInitialView;
  canDismissToGuest: boolean;
  onSuccess: (profile: OnlineAccountProfile) => void;
  onContinueAsGuest: () => void;
  onClose?: () => void;
}

export function AuthGateModal({
  lang,
  club,
  hasUnsavedGuestProgress,
  initialView,
  canDismissToGuest,
  onSuccess,
  onContinueAsGuest,
  onClose,
}: AuthGateModalProps) {
  const [view, setView] = useState<AuthModalInitialView>(initialView);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preserveLocalProgress, setPreserveLocalProgress] = useState(
    hasUnsavedGuestProgress || initialView === 'upgrade_guest',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthActionError | null>(null);

  const squadOvr = computeSquadOvr(club.lineupIds);
  const isVi = lang === 'vi';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (view === 'register' || view === 'upgrade_guest') {
      if (password !== confirmPassword) {
        setError({
          code: 'validation/confirm',
          messageVi: 'Mật khẩu xác nhận chưa trùng khớp.',
          messageEn: 'Confirmation password does not match.',
        });
        return;
      }
      setSubmitting(true);
      const seedClub = preserveLocalProgress ? club : undefined;
      const res = await registerWithUsername(username, password, seedClub);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess(res.profile);
      return;
    }

    if (view === 'login') {
      setSubmitting(true);
      const res = await loginWithUsername(username, password);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess(res.profile);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    const seedClub = hasUnsavedGuestProgress ? club : undefined;
    const res = await loginWithGoogle(seedClub);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess(res.profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a14]/88 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#0B1320] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <ShieldCheck size={14} />
              <span>
                {isVi
                  ? 'Tài Khoản Online · Đồng Bộ Đa Thiết Bị'
                  : 'Online Account · Cross-Device Cloud Sync'}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {view === 'upgrade_guest'
                ? isVi
                  ? 'TẠO TÀI KHOẢN VỚI NICK NÀY'
                  : 'SAVE THIS PROFILE TO ACCOUNT'
                : view === 'register'
                ? isVi
                  ? '1. TẠO TÀI KHOẢN MỚI'
                  : '1. CREATE ACCOUNT'
                : view === 'login'
                ? isVi
                  ? '2. ĐĂNG NHẬP TÀI KHOẢN'
                  : '2. LOG IN'
                : isVi
                ? 'SÚT PHẠT 3D ONLINE'
                : 'FREE KICK FC ONLINE'}
            </h2>
          </div>

          {canDismissToGuest && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* Highlight Banner when guest already played without logging in */}
        {hasUnsavedGuestProgress && view !== 'login' ? (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-400/45 text-left">
            <div className="flex items-start gap-2.5">
              <CloudUpload size={18} className="text-amber-300 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-amber-200">
                  {isVi
                    ? 'Nick đang chơi trên máy này chưa có tài khoản!'
                    : 'Current local profile is not linked yet!'}
                </div>
                <p className="text-[11px] text-amber-100/85 mt-0.5 leading-snug">
                  {isVi
                    ? `Đang có ${club.coins.toLocaleString()} Xu · ${club.ownedIds.length} thẻ · OVR ${squadOvr}. Tạo tài khoản với nick này để lưu lại và đăng nhập trên mọi thiết bị.`
                    : `Found ${club.coins.toLocaleString()} Coins · ${club.ownedIds.length} cards · OVR ${squadOvr}. Create an account with this profile to log in on any device.`}
                </p>
                {view === 'choice' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPreserveLocalProgress(true);
                      setError(null);
                      setView('upgrade_guest');
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>
                      {isVi
                        ? 'Tạo tài khoản với nick này'
                        : 'Create account with this profile'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Two Main Lines: 1. Tạo tài khoản / 2. Đăng nhập */}
        {view === 'choice' ? (
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setPreserveLocalProgress(hasUnsavedGuestProgress);
                setError(null);
                setView(hasUnsavedGuestProgress ? 'upgrade_guest' : 'register');
              }}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/55 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-display font-extrabold text-lg shrink-0">
                  1
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-white">
                    {isVi ? '1. Tạo tài khoản' : '1. Create Account'}
                  </div>
                  <div className="text-xs text-slate-300 truncate">
                    {isVi
                      ? 'Đặt tên tài khoản & mật khẩu để chơi online'
                      : 'Choose a username & password for online play'}
                  </div>
                </div>
              </div>
              <UserPlus size={18} className="text-emerald-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setView('login');
              }}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/55 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-400 text-slate-950 font-display font-extrabold text-lg shrink-0">
                  2
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-white">
                    {isVi ? '2. Đăng nhập' : '2. Log In'}
                  </div>
                  <div className="text-xs text-slate-300 truncate">
                    {isVi
                      ? 'Đã có tài khoản? Nhập tên & mật khẩu để đồng bộ'
                      : 'Already have an account? Sign in across devices'}
                  </div>
                </div>
              </div>
              <LogIn size={18} className="text-sky-300 shrink-0" />
            </button>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <div className="flex-1 h-px bg-white/10" />
              <span>{isVi ? 'Hoặc' : 'Or'}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-slate-100 transition-colors cursor-pointer disabled:opacity-60"
            >
              <KeyRound size={14} className="text-amber-300" />
              <span>
                {isVi ? 'Đăng nhập nhanh bằng Google' : 'Quick Sign In with Google'}
              </span>
            </button>

            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {isVi
                ? 'Chơi thử chưa đăng nhập (Có thể tạo tài khoản sau)'
                : 'Play as Guest first (Link account anytime)'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setView('choice');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>
                {isVi ? 'Quay lại 2 lựa chọn' : 'Back to Create / Log In'}
              </span>
            </button>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isVi ? 'Tên tài khoản' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isVi ? 'Ví dụ: ronaldo_vn7' : 'e.g. ronaldo_fc7'}
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {isVi
                  ? '3–24 ký tự gồm chữ cái không dấu, số hoặc dấu "_"'
                  : '3–24 characters: letters, numbers, or "_"'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isVi ? 'Mật khẩu' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  view === 'login' ? 'current-password' : 'new-password'
                }
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {view === 'register' || view === 'upgrade_guest' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isVi ? 'Nhập lại mật khẩu' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {hasUnsavedGuestProgress ? (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveLocalProgress}
                      onChange={(e) =>
                        setPreserveLocalProgress(e.target.checked)
                      }
                      className="mt-0.5 accent-emerald-400"
                    />
                    <span className="text-[11px] text-slate-200 leading-snug">
                      {isVi
                        ? `Giữ nguyên tiến trình đang chơi (${club.coins.toLocaleString()} Xu · ${club.ownedIds.length} thẻ · OVR ${squadOvr}) đưa vào tài khoản mới`
                        : `Keep current progress (${club.coins.toLocaleString()} Coins · ${club.ownedIds.length} cards · OVR ${squadOvr})`}
                    </span>
                  </label>
                ) : null}
              </>
            ) : null}

            {error ? (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/45 text-xs text-rose-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-300" />
                  <span>{isVi ? error.messageVi : error.messageEn}</span>
                </div>
                {error.needsEmailProviderEnable && error.consoleUrl ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={error.consoleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-400 text-slate-950 font-bold text-[11px]"
                    >
                      <ExternalLink size={12} />
                      <span>
                        {isVi
                          ? 'Mở Firebase Console bật Email/Password'
                          : 'Open Firebase Console'}
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] cursor-pointer"
                    >
                      {isVi ? 'Hoặc dùng Google' : 'Use Google Sign-In'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              <span>
                {submitting
                  ? isVi
                    ? 'Đang xử lý...'
                    : 'Please wait...'
                  : view === 'login'
                  ? isVi
                    ? 'Đăng Nhập Ngay'
                    : 'Log In Now'
                  : view === 'upgrade_guest'
                  ? isVi
                    ? 'Lưu Nick Này & Tạo Tài Khoản'
                    : 'Save Profile & Create Account'
                  : isVi
                  ? 'Tạo Tài Khoản Ngay'
                  : 'Create Account'}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              {view === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView(
                      hasUnsavedGuestProgress ? 'upgrade_guest' : 'register',
                    );
                  }}
                  className="text-emerald-300 hover:underline font-semibold cursor-pointer"
                >
                  {isVi
                    ? 'Chưa có tài khoản? Tạo tài khoản'
                    : 'Need an account? Sign up'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView('login');
                  }}
                  className="text-sky-300 hover:underline font-semibold cursor-pointer"
                >
                  {isVi
                    ? 'Đã có tài khoản? Đăng nhập'
                    : 'Already have an account? Log in'}
                </button>
              )}

              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {isVi ? 'Chơi thử' : 'Guest'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
