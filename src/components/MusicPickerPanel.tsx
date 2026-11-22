import {
  Check,
  Disc3,
  FileAudio,
  Flame,
  Link2,
  Music,
  Pause,
  Play,
  Repeat,
  SkipForward,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  FC_SOUNDTRACK_TRACKS,
  FcTrackMeta,
  soundEngine,
} from '../game/audio';
import { Language } from '../game/fcData';

interface MusicPickerPanelProps {
  lang: Language;
  muted: boolean;
  onClose: () => void;
}

export function MusicPickerPanel({
  lang,
  muted,
  onClose,
}: MusicPickerPanelProps) {
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(() =>
    soundEngine.isBgmEnabled(),
  );
  const [remixBoost, setRemixBoost] = useState<boolean>(() =>
    soundEngine.isRemixBoost(),
  );
  const [autoNext, setAutoNext] = useState<boolean>(() =>
    soundEngine.isAutoNext(),
  );
  const [currentTrack, setCurrentTrack] = useState<FcTrackMeta>(() =>
    soundEngine.getCurrentTrack(),
  );
  const [customTracks, setCustomTracks] = useState<FcTrackMeta[]>(() =>
    soundEngine.getCustomTracks(),
  );
  const [audioError, setAudioError] = useState<string | null>(() =>
    soundEngine.getCustomAudioError(),
  );
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  useEffect(() => {
    return soundEngine.onBgmChange(() => {
      setBgmEnabled(soundEngine.isBgmEnabled());
      setRemixBoost(soundEngine.isRemixBoost());
      setAutoNext(soundEngine.isAutoNext());
      setCurrentTrack(soundEngine.getCurrentTrack());
      setCustomTracks(soundEngine.getCustomTracks());
      setAudioError(soundEngine.getCustomAudioError());
    });
  }, []);

  const isVi = lang === 'vi';

  const handleAddUrl = (e: FormEvent) => {
    e.preventDefault();
    setAudioError(null);
    setUploadNotice(null);
    try {
      soundEngine.unlock();
      const added = soundEngine.addCustomUrlTrack(urlInput, titleInput);
      setUrlInput('');
      setTitleInput('');
      setUploadNotice(
        isVi
          ? `Đã thêm & đang phát: ${added.title}`
          : `Added & playing: ${added.title}`,
      );
    } catch (err) {
      setAudioError(
        err instanceof Error
          ? err.message
          : isVi
          ? 'Không thêm được link nhạc.'
          : 'Failed to add audio link.',
      );
    }
  };

  const handleUploadFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAudioError(null);
    setUploadNotice(null);
    try {
      soundEngine.unlock();
      const added = await soundEngine.addCustomFileTracks(files);
      if (added.length > 0) {
        setUploadNotice(
          isVi
            ? `Đã tải lên ${added.length} tệp nhạc & đang phát "${added[0].title}"!`
            : `Uploaded ${added.length} track(s) & playing "${added[0].title}"!`,
        );
      }
    } catch (err) {
      setAudioError(
        err instanceof Error
          ? err.message
          : isVi
          ? 'Không thể tải tệp nhạc này.'
          : 'Failed to load audio file.',
      );
    } finally {
      e.target.value = '';
    }
  };

  const getTagStyle = (tag: string) => {
    switch (tag) {
      case 'Tệp MP3':
        return 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200';
      case 'Link URL':
        return 'bg-sky-500/25 border-sky-400/60 text-sky-200';
      case 'Dembow':
      case 'Viral Funk':
        return 'bg-pink-500/25 border-pink-400/60 text-pink-200';
      case 'Montagem':
        return 'bg-rose-500/25 border-rose-400/60 text-rose-200';
      case 'Latin Mix':
        return 'bg-orange-500/25 border-orange-400/55 text-orange-200';
      case 'World Cup':
        return 'bg-yellow-500/25 border-yellow-400/55 text-yellow-200';
      case 'Stadium':
        return 'bg-cyan-500/25 border-cyan-400/55 text-cyan-200';
      case 'Samba Mix':
        return 'bg-lime-500/25 border-lime-400/55 text-lime-200';
      case 'Vinahouse':
        return 'bg-fuchsia-500/25 border-fuchsia-400/50 text-fuchsia-200';
      case 'EDM Drop':
        return 'bg-sky-500/25 border-sky-400/50 text-sky-200';
      case 'Phonk':
        return 'bg-rose-500/25 border-rose-400/50 text-rose-200';
      case 'FC Remix':
        return 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200';
      case 'Electro':
        return 'bg-violet-500/25 border-violet-400/50 text-violet-200';
      default:
        return 'bg-amber-500/20 border-amber-400/45 text-amber-200';
    }
  };

  return (
    <div
      className="w-80 sm:w-[420px] bg-[#0B1320]/98 border border-pink-400/40 rounded-2xl shadow-2xl p-3.5 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-amber-500 text-slate-950 flex items-center justify-center shrink-0">
            <Disc3 size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-white truncate">
              {isVi ? 'Chọn Nhạc & Thêm Bài Hát 🔥' : 'FC Soundtrack & Custom Music 🔥'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {muted
                ? isVi
                  ? 'Đang tắt tiếng tổng (Bật loa để nghe)'
                  : 'Master audio is muted'
                : bgmEnabled
                ? currentTrack.isCustom
                  ? `${currentTrack.title} · ${currentTrack.tag}`
                  : `${currentTrack.title} · ${currentTrack.bpm} BPM`
                : isVi
                ? 'Nhạc nền đang tạm dừng'
                : 'Music paused'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onClose();
          }}
          aria-label={isVi ? 'Đóng bảng nhạc' : 'Close music picker'}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Mode Toggles */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.unlock();
            soundEngine.setBgmEnabled(!bgmEnabled);
          }}
          className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
            bgmEnabled
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
              : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          {bgmEnabled ? <Pause size={12} /> : <Play size={12} />}
          <span>{bgmEnabled ? (isVi ? 'Đang Bật' : 'On') : isVi ? 'Đang Tắt' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.unlock();
            soundEngine.setRemixBoost(!remixBoost);
          }}
          title={
            isVi
              ? 'Tăng bass Vinahouse, Supersaw & âm lượng nhạc nền'
              : 'Boost Vinahouse bass, Supersaw leads & BGM punch'
          }
          className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
            remixBoost
              ? 'bg-gradient-to-r from-pink-500/30 to-amber-500/25 border-pink-400 text-amber-200'
              : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          <Flame size={12} />
          <span>{isVi ? 'Remix Cháy' : 'Remix Max'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.setAutoNext(!autoNext);
          }}
          title={
            isVi
              ? 'Tự động chuyển bài khác khi hết bài'
              : 'Auto-switch to next track when finished'
          }
          className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
            autoNext
              ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
              : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          <Repeat size={12} />
          <span>{isVi ? 'Tự Chuyển' : 'Auto Next'}</span>
        </button>
      </div>

      {/* Add Custom Music by Direct Audio Link or Local File */}
      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-sky-400/25 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-sky-200 flex items-center gap-1.5">
            <Upload size={12} className="text-sky-400" />
            {isVi
              ? 'Thêm Nhạc Của Bạn (Link MP3 / Tệp Từ Máy)'
              : 'Add Custom Music (URL or Audio File)'}
          </span>
          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold cursor-pointer transition-colors shrink-0">
            <FileAudio size={11} />
            <span>{isVi ? 'Tải Tệp Nhạc' : 'Upload File'}</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
              multiple
              onChange={handleUploadFiles}
              className="hidden"
            />
          </label>
        </div>

        <form onSubmit={handleAddUrl} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={
                isVi
                  ? 'Dán link file nhạc (.mp3, .m4a, .ogg)...'
                  : 'Paste direct audio URL (.mp3, .m4a, .ogg)...'
              }
              className="flex-1 min-w-0 bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-extrabold cursor-pointer shrink-0"
            >
              <Link2 size={11} />
              <span>{isVi ? 'Thêm Link' : 'Add'}</span>
            </button>
          </div>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            maxLength={60}
            placeholder={
              isVi
                ? 'Tên bài hát (tùy chọn, VD: Y Que Fue - Don Miguelo)'
                : 'Track title (optional, e.g. Y Que Fue - Don Miguelo)'
            }
            className="w-full bg-slate-950/75 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400/70"
          />
        </form>

        <p className="text-[10px] text-slate-400 leading-snug">
          {isVi
            ? 'Mẹo: Muốn nghe nguyên bài gốc Y Que Fue - Don Miguelo, tải file MP3 về máy rồi bấm "Tải Tệp Nhạc" (lưu vĩnh viễn trên trình duyệt).'
            : 'Tip: Upload any MP3/M4A/WAV file from your device — stored offline in your browser.'}
        </p>

        {audioError ? (
          <div className="text-[10px] font-semibold text-rose-200 bg-rose-500/15 border border-rose-400/40 rounded-lg px-2 py-1.5">
            {audioError}
          </div>
        ) : null}
        {uploadNotice ? (
          <div className="text-[10px] font-semibold text-emerald-200 bg-emerald-500/15 border border-emerald-400/40 rounded-lg px-2 py-1.5">
            {uploadNotice}
          </div>
        ) : null}
      </div>

      {/* Track List */}
      <div className="mt-2.5 space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
        {customTracks.map((track) => {
          const isSelected = track.id === currentTrack.id;
          return (
            <div
              key={track.id}
              className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border text-left transition-colors ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500/20 via-sky-500/15 to-slate-900 border-emerald-400 text-white'
                  : 'bg-slate-900/85 border-emerald-400/25 text-slate-200 hover:border-emerald-400/50'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  soundEngine.unlock();
                  soundEngine.selectFcTrack(track.id);
                }}
                className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
              >
                <span
                  className={`w-6 h-6 rounded-md text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-emerald-300'
                  }`}
                >
                  {track.sourceType === 'file' ? (
                    <FileAudio size={12} />
                  ) : (
                    <Link2 size={12} />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">
                    {track.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {track.subtitle}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold ${getTagStyle(
                    track.tag,
                  )}`}
                >
                  {track.tag}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void soundEngine.removeCustomTrack(track.id);
                  }}
                  title={isVi ? 'Xóa bài này' : 'Remove track'}
                  aria-label={isVi ? 'Xóa bài nhạc' : 'Remove track'}
                  className="w-6 h-6 rounded-md bg-rose-500/15 hover:bg-rose-500/35 text-rose-300 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}

        {FC_SOUNDTRACK_TRACKS.map((track, idx) => {
          const isSelected = track.id === currentTrack.id;
          return (
            <button
              key={track.id}
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                soundEngine.unlock();
                soundEngine.selectFcTrack(track.id);
              }}
              className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-pink-500/22 via-fuchsia-500/15 to-amber-500/10 border-pink-400 text-white'
                  : 'bg-slate-900/80 border-white/10 text-slate-200 hover:border-white/25 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-6 h-6 rounded-md text-[11px] font-mono-tabular font-extrabold flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isSelected && bgmEnabled ? <Music size={12} /> : idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">
                    {track.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {track.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold ${getTagStyle(
                    track.tag,
                  )}`}
                >
                  {track.tag}
                </span>
                <span className="font-mono-tabular text-[10px] text-slate-400 flex items-center gap-1">
                  {isSelected ? (
                    <Check size={10} className="text-emerald-400" />
                  ) : null}
                  {track.bpm} BPM
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Quick Skip */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          {isVi
            ? 'Bấm vào bài bất kỳ để phát ngay'
            : 'Click any track to play immediately'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.unlock();
            soundEngine.nextFcTrack();
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer shrink-0"
        >
          <SkipForward size={11} />
          <span>{isVi ? 'Bài Kế' : 'Next'}</span>
        </button>
      </div>
    </div>
  );
}
