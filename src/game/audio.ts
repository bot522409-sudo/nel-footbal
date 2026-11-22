export type BuiltInTrackId =
  | 'y_que_fue'
  | 'montagem_favela'
  | 'danza_latina'
  | 'waka_stadium'
  | 'fc_glory_anthem'
  | 'samba_joga'
  | 'fc_vinahouse'
  | 'fc_festival_edm'
  | 'fc_phonk_strike'
  | 'fc_anthem'
  | 'fc_neon'
  | 'fc_sunset';

export type FcTrackId = BuiltInTrackId | (string & {});

export type FcTrackStyle =
  | 'vinahouse'
  | 'edm'
  | 'phonk'
  | 'brazilian_funk'
  | 'latin_dance'
  | 'chill'
  | 'custom';

export interface FcTrackMeta {
  id: FcTrackId;
  title: string;
  subtitle: string;
  tag: string;
  bpm: number;
  style: FcTrackStyle;
  isCustom?: boolean;
  sourceType?: 'url' | 'file';
  url?: string;
}

export const FC_SOUNDTRACK_TRACKS: FcTrackMeta[] = [
  {
    id: 'y_que_fue',
    title: 'Y Que Fue? (Don Miguelo Style)',
    subtitle: 'Dominican Dembow 118 BPM · Có thể tải MP3 bản gốc bên trên',
    tag: 'Dembow',
    bpm: 118,
    style: 'latin_dance',
  },
  {
    id: 'montagem_favela',
    title: 'Montagem Funk (Skill Edit)',
    subtitle: 'Phonk 808 & Cowbell · Highlight Cực Cháy',
    tag: 'Montagem',
    bpm: 134,
    style: 'phonk',
  },
  {
    id: 'danza_latina',
    title: 'Danza Kuduro (Stadium Mix)',
    subtitle: 'Latin Fiesta · Sân Vận Động Bùng Nổ',
    tag: 'Latin Mix',
    bpm: 128,
    style: 'latin_dance',
  },
  {
    id: 'waka_stadium',
    title: 'Waka Waka (World Cup Mix)',
    subtitle: 'Afro-Latin Anthem · Không Khí World Cup',
    tag: 'World Cup',
    bpm: 127,
    style: 'latin_dance',
  },
  {
    id: 'fc_glory_anthem',
    title: 'Champions Glory (UEFA Remix)',
    subtitle: 'Fanfare Cúp C1 · Big Room Drop',
    tag: 'Stadium',
    bpm: 130,
    style: 'edm',
  },
  {
    id: 'samba_joga',
    title: 'Joga Bonito (Samba Phonk)',
    subtitle: 'Samba Brazil · Rê Bóng Kỹ Thuật',
    tag: 'Samba Mix',
    bpm: 132,
    style: 'brazilian_funk',
  },
  {
    id: 'fc_vinahouse',
    title: 'Nel Arena (Vinahouse Remix)',
    subtitle: 'Bass đập cực căng · Club Drop',
    tag: 'Vinahouse',
    bpm: 136,
    style: 'vinahouse',
  },
  {
    id: 'fc_festival_edm',
    title: 'Champions Drop (EDM Remix)',
    subtitle: 'Big Room Supersaw · Sân Vận Động',
    tag: 'EDM Drop',
    bpm: 128,
    style: 'edm',
  },
  {
    id: 'fc_phonk_strike',
    title: 'Brazilian Phonk Strike',
    subtitle: 'Phonk Bóng Đá · Cowbell & 808',
    tag: 'Phonk',
    bpm: 132,
    style: 'phonk',
  },
  {
    id: 'fc_anthem',
    title: 'Champions Night (FC Remix)',
    subtitle: 'Anthem Sân Cỏ · Remix Sôi Động',
    tag: 'FC Remix',
    bpm: 126,
    style: 'edm',
  },
  {
    id: 'fc_neon',
    title: 'Midnight Pitch (Electro)',
    subtitle: 'Electro Club Groove',
    tag: 'Electro',
    bpm: 128,
    style: 'vinahouse',
  },
  {
    id: 'fc_sunset',
    title: 'Golden Trophy (Chill Remix)',
    subtitle: 'Indie Synth · Thư Giãn',
    tag: 'Chill',
    bpm: 118,
    style: 'chill',
  },
];

const BGM_ENABLED_KEY = 'nel_football_bgm_enabled_v1';
const BGM_TRACK_KEY = 'nel_football_bgm_track_v2';
const BGM_REMIX_KEY = 'nel_football_bgm_remix_v1';
const BGM_AUTONEXT_KEY = 'nel_football_bgm_autonext_v1';
const CUSTOM_TRACKS_STORAGE_KEY = 'nel_football_custom_tracks_v1';
const CUSTOM_MUSIC_DB_NAME = 'nel_football_custom_music_db';
const CUSTOM_MUSIC_STORE = 'tracks';

interface StoredCustomTrack {
  id: string;
  title: string;
  subtitle: string;
  sourceType: 'url' | 'file';
  url?: string;
  fileName?: string;
  createdAt: number;
}

function openCustomMusicDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(CUSTOM_MUSIC_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_MUSIC_STORE)) {
        db.createObjectStore(CUSTOM_MUSIC_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed opening IDB'));
  });
}

async function saveTrackBlob(id: string, blob: Blob): Promise<void> {
  const db = await openCustomMusicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOM_MUSIC_STORE, 'readwrite');
    tx.objectStore(CUSTOM_MUSIC_STORE).put(blob, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed saving audio file'));
    };
  });
}

async function loadTrackBlob(id: string): Promise<Blob | null> {
  const db = await openCustomMusicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOM_MUSIC_STORE, 'readonly');
    const req = tx.objectStore(CUSTOM_MUSIC_STORE).get(id);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as Blob | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Failed reading audio file'));
    };
  });
}

async function deleteTrackBlob(id: string): Promise<void> {
  try {
    const db = await openCustomMusicDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CUSTOM_MUSIC_STORE, 'readwrite');
      tx.objectStore(CUSTOM_MUSIC_STORE).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // ignore IDB cleanup error
  }
}

interface TrackScore {
  chords: number[][]; // 4 bars of chord frequencies
  bass: number[]; // 4 bars root bass Hz
  melody: number[]; // 64 sixteenth-note steps (0 = rest)
}

const TRACK_SCORES: Record<BuiltInTrackId, TrackScore> = {
  // 0a. Y Que Fue? (Don Miguelo Style) - Bm - G - A - F#m (118 BPM, iconic Dominican Dembow hook & bounce)
  y_que_fue: {
    chords: [
      [246.94, 293.66, 369.99, 493.88], // Bm
      [196.0, 246.94, 293.66, 392.0], // G
      [220.0, 277.18, 329.63, 440.0], // A
      [185.0, 220.0, 277.18, 369.99], // F#m
    ],
    bass: [123.47, 98.0, 110.0, 92.5],
    melody: [
      739.99, 0, 739.99, 587.33, 0, 739.99, 659.25, 0,
      587.33, 0, 659.25, 739.99, 0, 587.33, 493.88, 0,
      783.99, 0, 783.99, 659.25, 0, 587.33, 493.88, 0,
      587.33, 659.25, 783.99, 0, 659.25, 0, 587.33, 0,
      880.0, 0, 880.0, 739.99, 0, 659.25, 554.37, 0,
      659.25, 0, 739.99, 880.0, 0, 739.99, 659.25, 0,
      739.99, 0, 659.25, 0, 587.33, 0, 554.37, 0,
      493.88, 554.37, 587.33, 0, 739.99, 0, 493.88, 0,
    ],
  },
  // 0b. Montagem Funk (Skill Edit) - Dm - Dm - Bb - A (134 BPM, viral Montage cowbell & 808)
  montagem_favela: {
    chords: [
      [146.83, 174.61, 220.0, 293.66], // Dm
      [146.83, 174.61, 220.0, 293.66], // Dm
      [116.54, 146.83, 174.61, 233.08], // Bb
      [110.0, 138.59, 164.81, 220.0], // A
    ],
    bass: [73.42, 73.42, 58.27, 55.0],
    melody: [
      587.33, 0, 587.33, 698.46, 0, 587.33, 880.0, 0,
      587.33, 698.46, 0, 587.33, 523.25, 0, 587.33, 0,
      587.33, 0, 698.46, 0, 880.0, 0, 1046.5, 0,
      880.0, 698.46, 587.33, 0, 698.46, 587.33, 523.25, 0,
      466.16, 0, 587.33, 698.46, 0, 466.16, 932.33, 0,
      880.0, 0, 698.46, 587.33, 466.16, 0, 587.33, 0,
      554.37, 0, 659.25, 0, 880.0, 0, 1108.73, 0,
      880.0, 659.25, 554.37, 440.0, 554.37, 0, 659.25, 0,
    ],
  },
  // 0c. Danza Kuduro (Stadium Mix) - Am - F - C - G (128 BPM, explosive Latin stadium party)
  danza_latina: {
    chords: [
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [130.81, 164.81, 196.0, 261.63], // C
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    bass: [110.0, 87.31, 65.41, 98.0],
    melody: [
      880.0, 0, 783.99, 0, 659.25, 0, 783.99, 880.0,
      0, 659.25, 783.99, 0, 659.25, 0, 523.25, 0,
      698.46, 0, 659.25, 0, 587.33, 0, 659.25, 698.46,
      0, 587.33, 659.25, 0, 523.25, 0, 440.0, 0,
      783.99, 0, 659.25, 0, 523.25, 0, 659.25, 783.99,
      0, 880.0, 783.99, 0, 659.25, 0, 523.25, 0,
      587.33, 0, 659.25, 0, 783.99, 0, 880.0, 0,
      783.99, 659.25, 587.33, 0, 783.99, 0, 880.0, 0,
    ],
  },
  // 0d. Waka Waka (World Cup Mix) - D - A - Bm - G (127 BPM, sunny World Cup stadium anthem)
  waka_stadium: {
    chords: [
      [146.83, 185.0, 220.0, 293.66], // D
      [220.0, 277.18, 329.63, 440.0], // A
      [246.94, 293.66, 369.99, 493.88], // Bm
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    bass: [73.42, 110.0, 123.47, 98.0],
    melody: [
      587.33, 0, 587.33, 659.25, 739.99, 0, 587.33, 0,
      739.99, 0, 880.0, 0, 739.99, 659.25, 587.33, 0,
      659.25, 0, 659.25, 739.99, 880.0, 0, 659.25, 0,
      880.0, 0, 987.77, 0, 880.0, 739.99, 659.25, 0,
      739.99, 0, 739.99, 880.0, 987.77, 0, 739.99, 0,
      987.77, 0, 1174.66, 0, 987.77, 880.0, 739.99, 0,
      783.99, 0, 880.0, 0, 987.77, 0, 880.0, 0,
      739.99, 0, 659.25, 0, 587.33, 0, 739.99, 0,
    ],
  },
  // 0e. Champions Glory (UEFA Remix) - Cm - Ab - Bb - G (130 BPM, epic stadium anthem drop)
  fc_glory_anthem: {
    chords: [
      [130.81, 155.56, 196.0, 261.63], // Cm
      [207.65, 261.63, 311.13, 415.3], // Ab
      [116.54, 146.83, 174.61, 233.08], // Bb
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    bass: [65.41, 103.83, 116.54, 98.0],
    melody: [
      523.25, 0, 0, 0, 622.25, 0, 0, 0,
      783.99, 0, 0, 622.25, 587.33, 0, 523.25, 0,
      830.61, 0, 0, 0, 783.99, 0, 622.25, 0,
      523.25, 0, 622.25, 0, 783.99, 0, 0, 0,
      932.33, 0, 0, 0, 783.99, 0, 0, 0,
      698.46, 0, 783.99, 0, 932.33, 0, 1046.5, 0,
      783.99, 0, 0, 698.46, 622.25, 0, 587.33, 0,
      783.99, 0, 987.77, 0, 1046.5, 0, 783.99, 0,
    ],
  },
  // 0f. Joga Bonito (Samba Phonk) - Em - C - D - B7 (132 BPM, Brazilian skill-move groove)
  samba_joga: {
    chords: [
      [164.81, 196.0, 246.94, 329.63], // Em
      [130.81, 164.81, 196.0, 261.63], // C
      [146.83, 185.0, 220.0, 293.66], // D
      [123.47, 155.56, 185.0, 246.94], // B
    ],
    bass: [82.41, 65.41, 73.42, 61.74],
    melody: [
      659.25, 0, 783.99, 659.25, 0, 987.77, 0, 783.99,
      659.25, 0, 587.33, 659.25, 0, 783.99, 659.25, 0,
      523.25, 0, 659.25, 523.25, 0, 783.99, 0, 659.25,
      523.25, 659.25, 783.99, 0, 659.25, 0, 523.25, 0,
      587.33, 0, 739.99, 587.33, 0, 880.0, 0, 739.99,
      587.33, 0, 659.25, 739.99, 0, 880.0, 739.99, 0,
      493.88, 0, 622.25, 0, 739.99, 0, 987.77, 0,
      880.0, 783.99, 739.99, 622.25, 493.88, 0, 659.25, 0,
    ],
  },
  // 1. Nel Arena (Vinahouse Remix) - Em - C - G - D (136 BPM, super hype club hook)
  fc_vinahouse: {
    chords: [
      [164.81, 196.0, 246.94, 329.63], // Em
      [130.81, 164.81, 196.0, 261.63], // C
      [196.0, 246.94, 293.66, 392.0], // G
      [146.83, 185.0, 220.0, 293.66], // D
    ],
    bass: [82.41, 65.41, 98.0, 73.42],
    melody: [
      659.25, 0, 659.25, 0, 783.99, 0, 987.77, 0,
      783.99, 0, 659.25, 587.33, 659.25, 0, 783.99, 0,
      523.25, 0, 523.25, 0, 659.25, 0, 783.99, 0,
      987.77, 0, 783.99, 659.25, 587.33, 0, 659.25, 0,
      783.99, 0, 783.99, 0, 987.77, 0, 1174.66, 0,
      987.77, 0, 783.99, 659.25, 783.99, 0, 987.77, 0,
      880.0, 0, 783.99, 0, 739.99, 0, 587.33, 0,
      659.25, 739.99, 783.99, 0, 987.77, 0, 739.99, 0,
    ],
  },
  // 2. Champions Drop (EDM Remix) - Fm - Db - Ab - Eb (128 BPM, stadium big room supersaw)
  fc_festival_edm: {
    chords: [
      [174.61, 207.65, 261.63, 349.23], // Fm
      [138.59, 174.61, 207.65, 277.18], // Db
      [207.65, 261.63, 311.13, 415.3], // Ab
      [155.56, 196.0, 233.08, 311.13], // Eb
    ],
    bass: [87.31, 69.3, 103.83, 77.78],
    melody: [
      698.46, 0, 0, 698.46, 830.61, 0, 1046.5, 0,
      932.33, 0, 830.61, 0, 698.46, 0, 622.25, 0,
      554.37, 0, 0, 698.46, 830.61, 0, 932.33, 0,
      830.61, 0, 698.46, 0, 554.37, 0, 622.25, 0,
      830.61, 0, 0, 830.61, 1046.5, 0, 1244.51, 0,
      1046.5, 0, 932.33, 0, 830.61, 0, 698.46, 0,
      622.25, 0, 698.46, 0, 783.99, 0, 932.33, 0,
      1046.5, 0, 932.33, 830.61, 783.99, 0, 698.46, 0,
    ],
  },
  // 3. Brazilian Phonk Strike - Cm - Cm - Ab - G (132 BPM, aggressive football phonk cowbell)
  fc_phonk_strike: {
    chords: [
      [130.81, 155.56, 196.0, 261.63], // Cm
      [130.81, 155.56, 196.0, 261.63], // Cm
      [207.65, 261.63, 311.13, 415.3], // Ab
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    bass: [65.41, 65.41, 103.83, 98.0],
    melody: [
      523.25, 0, 622.25, 0, 523.25, 783.99, 0, 622.25,
      523.25, 0, 466.16, 0, 523.25, 0, 622.25, 783.99,
      523.25, 0, 622.25, 0, 783.99, 0, 932.33, 0,
      783.99, 622.25, 523.25, 0, 622.25, 0, 466.16, 0,
      415.3, 0, 523.25, 0, 622.25, 0, 830.61, 0,
      783.99, 0, 622.25, 0, 523.25, 622.25, 783.99, 0,
      783.99, 0, 783.99, 622.25, 587.33, 0, 493.88, 0,
      783.99, 622.25, 587.33, 493.88, 392.0, 0, 493.88, 0,
    ],
  },
  // 4. Champions Night (FC Remix) - Am - F - C - G (126 BPM)
  fc_anthem: {
    chords: [
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [196.0, 246.94, 293.66, 392.0], // G6
    ],
    bass: [110.0, 87.31, 130.81, 98.0],
    melody: [
      659.25, 0, 0, 0, 523.25, 0, 587.33, 0,
      659.25, 0, 0, 0, 783.99, 0, 659.25, 0,
      523.25, 0, 0, 0, 440.0, 0, 523.25, 0,
      587.33, 0, 0, 0, 659.25, 0, 523.25, 0,
      783.99, 0, 0, 0, 659.25, 0, 587.33, 0,
      523.25, 0, 0, 0, 659.25, 0, 783.99, 0,
      880.0, 0, 0, 0, 783.99, 0, 659.25, 0,
      587.33, 0, 659.25, 0, 587.33, 0, 493.88, 0,
    ],
  },
  // 5. Midnight Pitch (Electro) - F#m - D - A - E (128 BPM)
  fc_neon: {
    chords: [
      [185.0, 220.0, 277.18, 329.63], // F#m7
      [146.83, 185.0, 220.0, 277.18], // Dmaj7
      [220.0, 277.18, 329.63, 415.3], // Amaj7
      [164.81, 207.65, 246.94, 329.63], // E6
    ],
    bass: [92.5, 73.42, 110.0, 82.41],
    melody: [
      554.37, 0, 659.25, 0, 739.99, 0, 0, 0,
      659.25, 0, 554.37, 0, 440.0, 0, 554.37, 0,
      587.33, 0, 0, 0, 554.37, 0, 440.0, 0,
      369.99, 0, 440.0, 0, 554.37, 0, 0, 0,
      659.25, 0, 739.99, 0, 880.0, 0, 0, 0,
      739.99, 0, 659.25, 0, 554.37, 0, 659.25, 0,
      659.25, 0, 0, 0, 587.33, 0, 554.37, 0,
      493.88, 0, 554.37, 0, 659.25, 0, 0, 0,
    ],
  },
  // 6. Golden Trophy (Chill Remix) - Dm7 - Bbmaj7 - F - C (118 BPM)
  fc_sunset: {
    chords: [
      [146.83, 174.61, 220.0, 261.63], // Dm7
      [116.54, 146.83, 174.61, 220.0], // Bbmaj7
      [174.61, 220.0, 261.63, 349.23], // F
      [130.81, 164.81, 196.0, 261.63], // C
    ],
    bass: [73.42, 116.54, 87.31, 65.41],
    melody: [
      587.33, 0, 0, 0, 523.25, 0, 440.0, 0,
      523.25, 0, 587.33, 0, 0, 0, 698.46, 0,
      698.46, 0, 0, 0, 587.33, 0, 523.25, 0,
      466.16, 0, 523.25, 0, 587.33, 0, 0, 0,
      523.25, 0, 0, 0, 440.0, 0, 523.25, 0,
      659.25, 0, 0, 0, 698.46, 0, 783.99, 0,
      659.25, 0, 0, 0, 587.33, 0, 523.25, 0,
      440.0, 0, 523.25, 0, 587.33, 0, 523.25, 0,
    ],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private bgmMasterGain: GainNode | null = null;
  private bgmCompressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmEnabled = true;
  private bgmMode: 'menu' | 'match' = 'menu';
  private bgmTrackId: FcTrackId = 'fc_vinahouse';
  private remixBoost = true;
  private autoNext = false;
  private bgmListeners = new Set<() => void>();
  private customTracks: StoredCustomTrack[] = [];
  private customBlobUrls = new Map<string, string>();
  private customAudio: HTMLAudioElement | null = null;
  private customActiveSrc = '';
  private customAudioError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedEnabled = localStorage.getItem(BGM_ENABLED_KEY);
        if (savedEnabled === '0') this.bgmEnabled = false;
        const rawCustom = localStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY);
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom) as StoredCustomTrack[];
          if (Array.isArray(parsed)) {
            this.customTracks = parsed.filter(
              (t) => t && typeof t.id === 'string' && typeof t.title === 'string',
            );
          }
        }
        const savedTrack = localStorage.getItem(BGM_TRACK_KEY);
        if (
          savedTrack &&
          (savedTrack in TRACK_SCORES ||
            this.customTracks.some((c) => c.id === savedTrack))
        ) {
          this.bgmTrackId = savedTrack;
        }
        const savedRemix = localStorage.getItem(BGM_REMIX_KEY);
        if (savedRemix === '0') this.remixBoost = false;
        const savedAutoNext = localStorage.getItem(BGM_AUTONEXT_KEY);
        if (savedAutoNext === '1') this.autoNext = true;
      } catch {
        // ignore storage errors
      }
      void this.hydrateCustomFileBlobs();
    }
  }

  private async hydrateCustomFileBlobs(): Promise<void> {
    const fileTracks = this.customTracks.filter((t) => t.sourceType === 'file');
    if (fileTracks.length === 0) return;
    let changed = false;
    for (const ft of fileTracks) {
      if (this.customBlobUrls.has(ft.id)) continue;
      try {
        const blob = await loadTrackBlob(ft.id);
        if (blob) {
          const objUrl = URL.createObjectURL(blob);
          this.customBlobUrls.set(ft.id, objUrl);
          changed = true;
        }
      } catch {
        // ignore blob load failure
      }
    }
    if (changed) {
      if (
        this.bgmEnabled &&
        !this._muted &&
        this.bgmTrackId ===
          fileTracks.find((t) => t.id === this.bgmTrackId)?.id
      ) {
        this.startCustomAudioPlayback(this.bgmTrackId);
      }
      this.notifyBgmListeners();
    }
  }

  private persistCustomTracks(): void {
    try {
      localStorage.setItem(
        CUSTOM_TRACKS_STORAGE_KEY,
        JSON.stringify(this.customTracks),
      );
    } catch {
      // ignore storage quota errors
    }
  }

  public get muted(): boolean {
    return this._muted;
  }

  public set muted(val: boolean) {
    this._muted = val;
    this.syncBgmGain();
  }

  private notifyBgmListeners(): void {
    for (const cb of this.bgmListeners) {
      cb();
    }
  }

  public onBgmChange(cb: () => void): () => void {
    this.bgmListeners.add(cb);
    return () => {
      this.bgmListeners.delete(cb);
    };
  }

  private ensureContext(allowWhenMuted = false): AudioContext | null {
    if (this._muted && !allowWhenMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.ctx && !this.bgmMasterGain) {
      this.bgmCompressor = this.ctx.createDynamicsCompressor();
      this.bgmCompressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.bgmCompressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.bgmCompressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.bgmCompressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.bgmCompressor.release.setValueAtTime(0.16, this.ctx.currentTime);

      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.bgmMasterGain.connect(this.bgmCompressor);
      this.bgmCompressor.connect(this.ctx.destination);
    }
    if (this.ctx && !this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 1.0);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx) {
      this.syncBgmGain();
      if (this.bgmEnabled && this.discoTimer === null) {
        if (this.isCustomTrackSelected()) {
          this.startCustomAudioPlayback(this.bgmTrackId);
        } else if (this.bgmTimer === null) {
          this.startFcBgm();
        }
      }
    }
  }

  public playWhistle(double = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const triggerBlast = (startOffset: number, duration: number) => {
      const t0 = ctx.currentTime + startOffset;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(2850, t0);
      osc2.frequency.setValueAtTime(2980, t0);

      // Pea-whistle trill
      lfo.frequency.setValueAtTime(38, t0);
      lfoGain.gain.setValueAtTime(140, t0);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.02);
      gain.gain.setValueAtTime(0.1, t0 + duration - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t0);
      osc2.start(t0);
      lfo.start(t0);
      osc1.stop(t0 + duration + 0.01);
      osc2.stop(t0 + duration + 0.01);
      lfo.stop(t0 + duration + 0.01);
    };

    triggerBlast(0, double ? 0.16 : 0.28);
    if (double) {
      triggerBlast(0.22, 0.34);
    }
  }

  public playKick(power01: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const gain = ctx.createGain();

    // Deep leather thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = 135 + power01 * 55;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.14);

    gain.gain.setValueAtTime(0.35 * (0.55 + 0.45 * power01), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.17);

    // Crisp boot impact transient
    const bufferSize = Math.floor(ctx.sampleRate * 0.06);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900 + power01 * 700, t0);
    filter.Q.setValueAtTime(1.2, t0);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28 * (0.5 + 0.5 * power01), t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t0);
  }

  public playPostClang(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const freqs = [415, 622, 988, 1480];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.985, t0 + 0.65);

      const amp = 0.12 / (idx + 1);
      gain.gain.setValueAtTime(amp, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7 - idx * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.75);
    });
  }

  public playGloveSave(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.11);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
  }

  public playNetRipple(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t0);
    filter.Q.setValueAtTime(0.9, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
  }

  public playCrowdCheer(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const duration = 2.0;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, t0);
    filter.frequency.linearRampToValueAtTime(1050, t0 + 0.45);
    filter.frequency.linearRampToValueAtTime(750, t0 + duration);
    filter.Q.setValueAtTime(0.7, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.22);
    gain.gain.setValueAtTime(0.2, t0 + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
  }

  public playCrowdGasp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const duration = 0.85;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, t0);
    filter.frequency.exponentialRampToValueAtTime(340, t0 + duration);
    filter.Q.setValueAtTime(1.1, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.14, t0 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
  }

  public playGoalCelebration(isSuper = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Stadium brass fanfare chord swell
    const chord = isSuper ? [196, 246.94, 293.66, 392] : [196, 246.94, 293.66];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.linearRampToValueAtTime(freq * 1.008, t0 + 0.55);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, t0);
      filter.frequency.exponentialRampToValueAtTime(isSuper ? 2200 : 1650, t0 + 0.16);
      filter.frequency.exponentialRampToValueAtTime(650, t0 + 0.95);

      const amp = (isSuper ? 0.065 : 0.05) / (1 + idx * 0.2);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(amp, t0 + 0.06);
      gain.gain.setValueAtTime(amp * 0.85, t0 + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.1);
    });

    // 2. Celebratory sparkle chime arpeggio
    const notes = isSuper
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
      : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = t0 + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(isSuper ? 0.095 : 0.075, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  public playThunder(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Master dynamics compressor so loud boom hits hard without digital clipping
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-10, t0);
    comp.knee.setValueAtTime(12, t0);
    comp.ratio.setValueAtTime(6, t0);
    comp.attack.setValueAtTime(0.003, t0);
    comp.release.setValueAtTime(0.25, t0);
    comp.connect(ctx.destination);

    // 1. Sharp initial lightning snap/crack at t0
    const crackDur = 0.22;
    const crackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * crackDur), ctx.sampleRate);
    const crackData = crackBuf.getChannelData(0);
    for (let i = 0; i < crackData.length; i++) {
      crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crackData.length * 0.22));
    }
    const crackNoise = ctx.createBufferSource();
    crackNoise.buffer = crackBuf;

    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(1650, t0);
    crackFilter.frequency.exponentialRampToValueAtTime(320, t0 + crackDur);
    crackFilter.Q.setValueAtTime(0.65, t0);

    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.95, t0);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t0 + crackDur);

    crackNoise.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(comp);
    crackNoise.start(t0);

    // 2. Massive booming "ĐÙNG" sub-bass shockwave
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(115, t0);
    subOsc.frequency.exponentialRampToValueAtTime(32, t0 + 0.42);
    subOsc.frequency.exponentialRampToValueAtTime(22, t0 + 1.15);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, t0);
    subGain.gain.linearRampToValueAtTime(0.95, t0 + 0.035);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

    subOsc.connect(subGain);
    subGain.connect(comp);
    subOsc.start(t0);
    subOsc.stop(t0 + 1.25);

    // 3. Heavy low-end blast + rolling thunder rumble across the stadium
    const dur = 2.85;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      const flutter = 0.72 + 0.28 * Math.sin(p * Math.PI * 11) * Math.cos(p * Math.PI * 5.3);
      data[i] = (Math.random() * 2 - 1) * flutter;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, t0);
    filter.frequency.exponentialRampToValueAtTime(160, t0 + 0.45);
    filter.frequency.exponentialRampToValueAtTime(58, t0 + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.92, t0 + 0.055);
    gain.gain.setValueAtTime(0.68, t0 + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(comp);
    noise.start(t0);
  }

  public playSkillWhip(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t0);
    osc.frequency.exponentialRampToValueAtTime(760, t0 + 0.12);
    osc.frequency.exponentialRampToValueAtTime(190, t0 + 0.24);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.11, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.26);
  }

  public playSlideTackle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const dur = 0.36;
    const bufSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const p = i / bufSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.85;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t0);
    filter.frequency.exponentialRampToValueAtTime(340, t0 + dur);
    filter.Q.setValueAtTime(0.85, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.34, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);

    // Body turf thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(98, t0 + 0.04);
    thump.frequency.exponentialRampToValueAtTime(36, t0 + 0.22);
    thumpGain.gain.setValueAtTime(0.26, t0 + 0.04);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.23);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(t0 + 0.04);
    thump.stop(t0 + 0.24);
  }

  public playPowerShot(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playKick(1.0);

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, t0);
    osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.28);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t0);
    filter.frequency.exponentialRampToValueAtTime(220, t0 + 0.28);

    gain.gain.setValueAtTime(0.24, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.31);
  }

  private discoTimer: number | null = null;
  private discoStep = 0;

  private ensureCustomAudioElement(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (!this.customAudio) {
      const el = new Audio();
      el.preload = 'auto';
      el.addEventListener('ended', () => {
        if (!this.bgmEnabled) return;
        if (this.autoNext) {
          this.nextFcTrack();
        } else {
          el.currentTime = 0;
          void el.play().catch(() => {
            // ignore autoplay block
          });
        }
      });
      el.addEventListener('error', () => {
        const cur = this.getCustomTrackById(this.bgmTrackId);
        if (cur) {
          this.customAudioError =
            cur.sourceType === 'url'
              ? 'Không phát được link nhạc này (link không phải file âm thanh trực tiếp hoặc bị chặn).'
              : 'Không thể đọc tệp nhạc này.';
          this.notifyBgmListeners();
        }
      });
      this.customAudio = el;
    }
    return this.customAudio;
  }

  private getCustomTrackById(id: string): StoredCustomTrack | undefined {
    return this.customTracks.find((t) => t.id === id);
  }

  private isCustomTrackSelected(): boolean {
    return this.customTracks.some((t) => t.id === this.bgmTrackId);
  }

  private resolveCustomTrackSrc(track: StoredCustomTrack): string | null {
    if (track.sourceType === 'url') {
      return track.url ?? null;
    }
    return this.customBlobUrls.get(track.id) ?? null;
  }

  private startCustomAudioPlayback(trackId: string): void {
    const track = this.getCustomTrackById(trackId);
    if (!track) return;
    const src = this.resolveCustomTrackSrc(track);
    if (!src) return;
    const el = this.ensureCustomAudioElement();
    if (!el) return;

    this.customAudioError = null;
    if (this.customActiveSrc !== src) {
      this.customActiveSrc = src;
      el.src = src;
      el.load();
    }
    this.syncBgmGain();
    if (!this._muted && this.bgmEnabled && this.discoTimer === null) {
      void el.play().catch(() => {
        // browser may wait for first user interaction
      });
    }
  }

  private stopCustomAudioPlayback(): void {
    if (this.customAudio && !this.customAudio.paused) {
      this.customAudio.pause();
    }
  }

  private syncBgmGain(): void {
    const customSelected = this.isCustomTrackSelected();
    const shouldSilenceBgm =
      this._muted || !this.bgmEnabled || this.discoTimer !== null;

    if (this.ctx && this.bgmMasterGain) {
      const baseMenu = this.remixBoost ? 0.36 : 0.27;
      const baseMatch = this.remixBoost ? 0.14 : 0.1;
      const target =
        shouldSilenceBgm || customSelected
          ? 0.0001
          : this.bgmMode === 'menu'
          ? baseMenu
          : baseMatch;
      this.bgmMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    }

    if (this.customAudio) {
      const targetVol = shouldSilenceBgm
        ? 0
        : this.bgmMode === 'menu'
        ? this.remixBoost
          ? 0.68
          : 0.48
        : this.remixBoost
        ? 0.25
        : 0.16;
      this.customAudio.volume = targetVol;
      if (shouldSilenceBgm || !customSelected) {
        if (!this.customAudio.paused) {
          this.customAudio.pause();
        }
      } else if (this.customActiveSrc && this.customAudio.paused) {
        void this.customAudio.play().catch(() => {
          // ignore autoplay restriction
        });
      }
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    try {
      localStorage.setItem(BGM_ENABLED_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    if (enabled) {
      this.startFcBgm();
    } else {
      this.stopFcBgm();
    }
    this.syncBgmGain();
    this.notifyBgmListeners();
  }

  public isRemixBoost(): boolean {
    return this.remixBoost;
  }

  public setRemixBoost(enabled: boolean): void {
    this.remixBoost = enabled;
    try {
      localStorage.setItem(BGM_REMIX_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    this.syncBgmGain();
    this.notifyBgmListeners();
  }

  public isAutoNext(): boolean {
    return this.autoNext;
  }

  public setAutoNext(enabled: boolean): void {
    this.autoNext = enabled;
    try {
      localStorage.setItem(BGM_AUTONEXT_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    this.notifyBgmListeners();
  }

  public setBgmMode(mode: 'menu' | 'match'): void {
    if (this.bgmMode === mode) return;
    this.bgmMode = mode;
    this.syncBgmGain();
  }

  public getCustomAudioError(): string | null {
    return this.customAudioError;
  }

  public getCustomTracks(): FcTrackMeta[] {
    return this.customTracks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      tag: t.sourceType === 'file' ? 'Tệp MP3' : 'Link URL',
      bpm: 120,
      style: 'custom',
      isCustom: true,
      sourceType: t.sourceType,
      url: t.url,
    }));
  }

  public getAllTracks(): FcTrackMeta[] {
    return [...this.getCustomTracks(), ...FC_SOUNDTRACK_TRACKS];
  }

  public addCustomUrlTrack(rawUrl: string, customTitle?: string): FcTrackMeta {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      throw new Error('Vui lòng dán đường link file nhạc (.mp3, .m4a, .wav, .ogg).');
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error('Đường link không hợp lệ. Cần bắt đầu bằng https:// hoặc http://.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Chỉ hỗ trợ đường link http:// hoặc https://.');
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('open.spotify.com') ||
      host.includes('tiktok.com')
    ) {
      throw new Error(
        'Link trang web YouTube/Spotify/TikTok không phát trực tiếp được trên trình duyệt. Hãy dán link file .mp3/.m4a trực tiếp hoặc bấm "Tải Tệp Nhạc" bên dưới!',
      );
    }

    const rawFile = decodeURIComponent(
      parsed.pathname.split('/').filter(Boolean).pop() || '',
    ).replace(/\.[a-z0-9]{2,5}$/i, '');
    const title =
      customTitle?.trim() ||
      (rawFile.length >= 2 ? rawFile.replace(/[-_]+/g, ' ') : `Nhạc Link (${host})`);

    const id = `custom_url_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const entry: StoredCustomTrack = {
      id,
      title: title.slice(0, 64),
      subtitle: `Link ngoài · ${host}`,
      sourceType: 'url',
      url: parsed.toString(),
      createdAt: Date.now(),
    };
    this.customTracks = [entry, ...this.customTracks];
    this.persistCustomTracks();
    return this.selectFcTrack(id);
  }

  public async addCustomFileTracks(
    files: FileList | File[],
  ): Promise<FcTrackMeta[]> {
    const list = Array.from(files);
    if (list.length === 0) return [];
    const added: StoredCustomTrack[] = [];

    for (const file of list) {
      const looksAudio =
        file.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(file.name);
      if (!looksAudio) {
        throw new Error(
          `Tệp "${file.name}" không phải định dạng âm thanh (.mp3, .wav, .m4a, .ogg).`,
        );
      }
      const id = `custom_file_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      await saveTrackBlob(id, file);
      const objUrl = URL.createObjectURL(file);
      this.customBlobUrls.set(id, objUrl);
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      added.push({
        id,
        title: cleanName.slice(0, 64) || 'Nhạc Tải Lên',
        subtitle: `Tệp từ máy · ${sizeMb} MB`,
        sourceType: 'file',
        fileName: file.name,
        createdAt: Date.now(),
      });
    }

    this.customTracks = [...added, ...this.customTracks];
    this.persistCustomTracks();
    if (added[0]) {
      this.selectFcTrack(added[0].id);
    } else {
      this.notifyBgmListeners();
    }
    return added.map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.subtitle,
      tag: 'Tệp MP3',
      bpm: 120,
      style: 'custom',
      isCustom: true,
      sourceType: 'file',
    }));
  }

  public async removeCustomTrack(trackId: string): Promise<void> {
    const existed = this.customTracks.some((t) => t.id === trackId);
    if (!existed) return;
    this.customTracks = this.customTracks.filter((t) => t.id !== trackId);
    const objUrl = this.customBlobUrls.get(trackId);
    if (objUrl) {
      URL.revokeObjectURL(objUrl);
      this.customBlobUrls.delete(trackId);
    }
    await deleteTrackBlob(trackId);
    this.persistCustomTracks();
    this.customAudioError = null;
    if (this.bgmTrackId === trackId) {
      this.stopCustomAudioPlayback();
      this.customActiveSrc = '';
      this.selectFcTrack('y_que_fue');
    } else {
      this.notifyBgmListeners();
    }
  }

  public getCurrentTrack(): FcTrackMeta {
    const custom = this.getCustomTracks().find((t) => t.id === this.bgmTrackId);
    if (custom) return custom;
    return (
      FC_SOUNDTRACK_TRACKS.find((t) => t.id === this.bgmTrackId) ??
      FC_SOUNDTRACK_TRACKS[0]
    );
  }

  public selectFcTrack(trackId: FcTrackId): FcTrackMeta {
    this.bgmTrackId = trackId;
    this.customAudioError = null;
    try {
      localStorage.setItem(BGM_TRACK_KEY, trackId);
    } catch {
      // ignore storage errors
    }
    if (!this.bgmEnabled) {
      this.bgmEnabled = true;
      try {
        localStorage.setItem(BGM_ENABLED_KEY, '1');
      } catch {
        // ignore storage errors
      }
    }
    this.stopFcBgm();
    this.startFcBgm();
    this.notifyBgmListeners();
    return this.getCurrentTrack();
  }

  public nextFcTrack(): FcTrackMeta {
    const all = this.getAllTracks();
    const idx = all.findIndex((t) => t.id === this.bgmTrackId);
    const next = all[(idx + 1) % all.length];
    return this.selectFcTrack(next.id);
  }

  public startFcBgm(): void {
    if (!this.bgmEnabled) return;
    if (this.isCustomTrackSelected()) {
      if (this.bgmTimer !== null) {
        window.clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      this.startCustomAudioPlayback(this.bgmTrackId);
      return;
    }

    this.stopCustomAudioPlayback();
    if (this.bgmTimer !== null) return;
    const ctx = this.ensureContext(true);
    if (!ctx) return;

    this.bgmStep = 0;
    this.syncBgmGain();
    const meta = this.getCurrentTrack();
    const sixteenthMs = Math.round((60 / meta.bpm / 4) * 1000);

    const scheduleStep = () => {
      if (
        this._muted ||
        !this.bgmEnabled ||
        this.discoTimer !== null ||
        this.isCustomTrackSelected()
      ) {
        return;
      }
      const audio = this.ctx;
      const master = this.bgmMasterGain;
      if (!audio || !master || audio.state === 'suspended') return;

      // Optional auto-advance after 2 full 64-step 4-bar loops when autoNext is enabled
      if (this.autoNext && this.bgmStep > 0 && this.bgmStep % 128 === 0) {
        this.nextFcTrack();
        return;
      }

      const trackMeta = this.getCurrentTrack();
      const score =
        TRACK_SCORES[trackMeta.id as BuiltInTrackId] ?? TRACK_SCORES.y_que_fue;
      const step = this.bgmStep % 64;
      const bar = Math.floor(step / 16);
      const stepInBar = step % 16;
      const beatInBar = stepInBar % 4;
      const isRemix = this.remixBoost;
      const isBuildUp = isRemix && step >= 56;
      this.bgmStep += 1;
      const t0 = audio.currentTime + 0.012;
      const stepSec = sixteenthMs / 1000;

      // 0. Crash Cymbal Drop Sweep on Bar 1 Start (step === 0)
      if (step === 0 && this.noiseBuffer) {
        const crash = audio.createBufferSource();
        crash.buffer = this.noiseBuffer;
        const chpf = audio.createBiquadFilter();
        chpf.type = 'highpass';
        chpf.frequency.setValueAtTime(3400, t0);
        const cGain = audio.createGain();
        cGain.gain.setValueAtTime(isRemix ? 0.16 : 0.08, t0);
        cGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
        crash.connect(chpf);
        chpf.connect(cGain);
        cGain.connect(master);
        crash.start(t0);
        crash.stop(t0 + 0.68);
      }

      // 1. Sidechained Supersaw / Pad Chords on start of each bar
      if (stepInBar === 0) {
        const chord = score.chords[bar];
        const padFilter = audio.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(isRemix ? 620 : 950, t0);
        padFilter.frequency.exponentialRampToValueAtTime(
          isRemix ? 2100 : 1250,
          t0 + stepSec * 4,
        );
        padFilter.frequency.exponentialRampToValueAtTime(
          680,
          t0 + stepSec * 15,
        );
        padFilter.connect(master);

        chord.forEach((freq, i) => {
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.type =
            isRemix && trackMeta.style !== 'chill'
              ? i % 2 === 0
                ? 'sawtooth'
                : 'triangle'
              : i % 2 === 0
              ? 'triangle'
              : 'sine';
          osc.frequency.setValueAtTime(freq, t0);
          if (isRemix && i % 2 === 0) {
            osc.detune.setValueAtTime(i === 0 ? -7 : 7, t0);
          }
          const amp = (isRemix ? 0.068 : 0.055) / (1 + i * 0.25);
          // Slight sidechain dip on beat 1 so kick punches cleanly
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.linearRampToValueAtTime(amp, t0 + stepSec * 1.4);
          gain.gain.setValueAtTime(amp * 0.8, t0 + stepSec * 12);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 15.6);
          osc.connect(gain);
          gain.connect(padFilter);
          osc.start(t0);
          osc.stop(t0 + stepSec * 15.8);
        });
      }

      // 2. Hard Punchy Club Kick on quarter beats (skip last 2 kicks during build-up roll for drop impact)
      const skipKickForDrop = isBuildUp && step >= 60;
      if (beatInBar === 0 && !skipKickForDrop) {
        const kick = audio.createOscillator();
        const kGain = audio.createGain();
        kick.type = 'sine';
        const punchTop = isRemix ? 165 : 122;
        const subBottom = trackMeta.style === 'phonk' ? 38 : 44;
        kick.frequency.setValueAtTime(punchTop, t0);
        kick.frequency.exponentialRampToValueAtTime(subBottom, t0 + 0.085);
        kGain.gain.setValueAtTime(isRemix ? 0.38 : 0.25, t0);
        kGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.145);
        kick.connect(kGain);
        kGain.connect(master);
        kick.start(t0);
        kick.stop(t0 + 0.16);

        // Crisp beater click transient so kick hits hard on small speakers
        if (isRemix) {
          const click = audio.createOscillator();
          const clGain = audio.createGain();
          click.type = 'triangle';
          click.frequency.setValueAtTime(320, t0);
          click.frequency.exponentialRampToValueAtTime(95, t0 + 0.022);
          clGain.gain.setValueAtTime(0.14, t0);
          clGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
          click.connect(clGain);
          clGain.connect(master);
          click.start(t0);
          click.stop(t0 + 0.03);
        }
      }

      // 3. Vinahouse / EDM / Brazilian Funk / Latin Bass Groove
      const rootBass = score.bass[bar];
      const isFunkBassHit =
        trackMeta.style === 'brazilian_funk' &&
        (stepInBar === 0 ||
          stepInBar === 3 ||
          stepInBar === 6 ||
          stepInBar === 10 ||
          stepInBar === 12);
      const isLatinBassHit =
        trackMeta.style === 'latin_dance' &&
        (stepInBar === 0 ||
          stepInBar === 3 ||
          stepInBar === 6 ||
          stepInBar === 8 ||
          stepInBar === 11 ||
          stepInBar === 14);
      if ((beatInBar === 2 || isFunkBassHit || isLatinBassHit) && !skipKickForDrop) {
        // Signature offbeat or syncopated funk/latin bass punch
        const bassOsc = audio.createOscillator();
        const bassFilter = audio.createBiquadFilter();
        const bGain = audio.createGain();
        bassOsc.type =
          trackMeta.style === 'brazilian_funk'
            ? 'triangle'
            : isRemix
            ? 'sawtooth'
            : 'triangle';
        bassOsc.frequency.setValueAtTime(
          trackMeta.style === 'brazilian_funk' && stepInBar === 10
            ? rootBass * 1.5
            : rootBass,
          t0,
        );

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(
          trackMeta.style === 'brazilian_funk'
            ? 740
            : isRemix
            ? 920
            : 420,
          t0,
        );
        bassFilter.frequency.exponentialRampToValueAtTime(
          160,
          t0 + stepSec * 1.6,
        );

        const bassAmp =
          trackMeta.style === 'brazilian_funk'
            ? isRemix
              ? 0.25
              : 0.17
            : isRemix
            ? 0.22
            : 0.14;
        bGain.gain.setValueAtTime(0.0001, t0);
        bGain.gain.linearRampToValueAtTime(bassAmp, t0 + 0.008);
        bGain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 1.65);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bGain);
        bGain.connect(master);
        bassOsc.start(t0);
        bassOsc.stop(t0 + stepSec * 1.75);

        // Deep sub-octave anchor on offbeat
        if (isRemix) {
          const subBass = audio.createOscillator();
          const sbGain = audio.createGain();
          subBass.type = 'sine';
          subBass.frequency.setValueAtTime(rootBass, t0);
          sbGain.gain.setValueAtTime(0.18, t0);
          sbGain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 1.5);
          subBass.connect(sbGain);
          sbGain.connect(master);
          subBass.start(t0);
          subBass.stop(t0 + stepSec * 1.6);
        }
      } else if (
        isRemix &&
        beatInBar === 3 &&
        (trackMeta.style === 'vinahouse' || trackMeta.style === 'phonk') &&
        !skipKickForDrop
      ) {
        // Bouncy octave bass pickup on the 16th before next kick
        const bounceOsc = audio.createOscillator();
        const bounceGain = audio.createGain();
        bounceOsc.type = 'triangle';
        bounceOsc.frequency.setValueAtTime(rootBass * 2, t0);
        bounceGain.gain.setValueAtTime(0.095, t0);
        bounceGain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 0.85);
        bounceOsc.connect(bounceGain);
        bounceGain.connect(master);
        bounceOsc.start(t0);
        bounceOsc.stop(t0 + stepSec * 0.9);
      }

      // 4. Crisp 16th-Note Hi-Hats & Brazilian Tamborzão / Dembow Syncopation
      if (this.noiseBuffer) {
        if (beatInBar === 2) {
          const hat = audio.createBufferSource();
          hat.buffer = this.noiseBuffer;
          const hpf = audio.createBiquadFilter();
          hpf.type = 'highpass';
          hpf.frequency.setValueAtTime(7200, t0);
          const hGain = audio.createGain();
          hGain.gain.setValueAtTime(isRemix ? 0.085 : 0.055, t0);
          hGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.065);
          hat.connect(hpf);
          hpf.connect(hGain);
          hGain.connect(master);
          hat.start(t0);
          hat.stop(t0 + 0.075);
        } else if (isRemix && (beatInBar === 1 || beatInBar === 3)) {
          const tick = audio.createBufferSource();
          tick.buffer = this.noiseBuffer;
          const thpf = audio.createBiquadFilter();
          thpf.type = 'highpass';
          thpf.frequency.setValueAtTime(9200, t0);
          const tGain = audio.createGain();
          tGain.gain.setValueAtTime(0.036, t0);
          tGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
          tick.connect(thpf);
          thpf.connect(tGain);
          tGain.connect(master);
          tick.start(t0);
          tick.stop(t0 + 0.03);
        }

        // Signature Baile Funk / Dembow syncopated rim snare ("Tum-ta-tum-ta")
        const isSyncRim =
          (trackMeta.style === 'brazilian_funk' ||
            trackMeta.style === 'latin_dance') &&
          (stepInBar === 3 ||
            stepInBar === 6 ||
            stepInBar === 11 ||
            stepInBar === 14);
        if (isSyncRim && !skipKickForDrop) {
          const rimOsc = audio.createOscillator();
          const rimGain = audio.createGain();
          rimOsc.type = 'triangle';
          rimOsc.frequency.setValueAtTime(
            stepInBar === 6 || stepInBar === 14 ? 410 : 285,
            t0,
          );
          rimOsc.frequency.exponentialRampToValueAtTime(115, t0 + 0.045);
          rimGain.gain.setValueAtTime(isRemix ? 0.13 : 0.085, t0);
          rimGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
          rimOsc.connect(rimGain);
          rimGain.connect(master);
          rimOsc.start(t0);
          rimOsc.stop(t0 + 0.06);
        }
      }

      // 5. Layered Club Clap / Snare on Beat 2 & 4 + Bar-4 Build-Up Snare Roll
      const hitClap = stepInBar === 4 || stepInBar === 12;
      if ((hitClap || isBuildUp) && this.noiseBuffer) {
        const buildProgress = isBuildUp ? (step - 56) / 7 : 0;
        const clap = audio.createBufferSource();
        clap.buffer = this.noiseBuffer;
        const bpf = audio.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(
          isBuildUp ? 1200 + buildProgress * 1500 : 1850,
          t0,
        );
        bpf.Q.setValueAtTime(0.9, t0);
        const cGain = audio.createGain();
        const clapAmp = isBuildUp
          ? 0.08 + buildProgress * 0.11
          : isRemix
          ? 0.115
          : 0.075;
        cGain.gain.setValueAtTime(clapAmp, t0);
        cGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
        clap.connect(bpf);
        bpf.connect(cGain);
        cGain.connect(master);
        clap.start(t0);
        clap.stop(t0 + 0.095);

        // Tight snare body punch
        if (isRemix) {
          const snOsc = audio.createOscillator();
          const snGain = audio.createGain();
          snOsc.type = 'triangle';
          snOsc.frequency.setValueAtTime(
            isBuildUp ? 180 + buildProgress * 190 : 195,
            t0,
          );
          snOsc.frequency.exponentialRampToValueAtTime(95, t0 + 0.055);
          snGain.gain.setValueAtTime(
            isBuildUp ? 0.08 + buildProgress * 0.07 : 0.085,
            t0,
          );
          snGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
          snOsc.connect(snGain);
          snGain.connect(master);
          snOsc.start(t0);
          snOsc.stop(t0 + 0.065);
        }
      }

      // 6. Lead Hook: Detuned Supersaw / Metallic Cowbell (Phonk) / Pluck Brass (Funk & Latin)
      const leadFreq = score.melody[step];
      if (leadFreq > 0) {
        if (trackMeta.style === 'phonk') {
          // Classic Brazilian Phonk 808 Cowbell timbre
          const cow1 = audio.createOscillator();
          const cow2 = audio.createOscillator();
          const cowFilter = audio.createBiquadFilter();
          const cowGain = audio.createGain();

          cow1.type = 'square';
          cow2.type = 'triangle';
          cow1.frequency.setValueAtTime(leadFreq, t0);
          cow2.frequency.setValueAtTime(leadFreq * 1.49, t0);

          cowFilter.type = 'bandpass';
          cowFilter.frequency.setValueAtTime(leadFreq * 1.55, t0);
          cowFilter.Q.setValueAtTime(1.6, t0);

          cowGain.gain.setValueAtTime(0.0001, t0);
          cowGain.gain.linearRampToValueAtTime(isRemix ? 0.13 : 0.09, t0 + 0.008);
          cowGain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 1.45);

          cow1.connect(cowFilter);
          cow2.connect(cowFilter);
          cowFilter.connect(cowGain);
          cowGain.connect(master);
          cow1.start(t0);
          cow2.start(t0);
          cow1.stop(t0 + stepSec * 1.5);
          cow2.stop(t0 + stepSec * 1.5);
        } else if (
          trackMeta.style === 'brazilian_funk' ||
          trackMeta.style === 'latin_dance'
        ) {
          // Punchy Latin Brass / Funk Marimba-Synth Hook
          const leadFilter = audio.createBiquadFilter();
          const leadGain = audio.createGain();
          leadFilter.type = 'lowpass';
          leadFilter.frequency.setValueAtTime(
            trackMeta.style === 'brazilian_funk' ? 3800 : 4600,
            t0,
          );
          leadFilter.frequency.exponentialRampToValueAtTime(
            980,
            t0 + stepSec * 1.55,
          );
          leadFilter.Q.setValueAtTime(1.5, t0);

          const amp = isRemix ? 0.088 : 0.065;
          leadGain.gain.setValueAtTime(0.0001, t0);
          leadGain.gain.linearRampToValueAtTime(amp, t0 + 0.008);
          leadGain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 1.65);

          leadFilter.connect(leadGain);
          leadGain.connect(master);

          const osc1 = audio.createOscillator();
          const osc2 = audio.createOscillator();
          osc1.type =
            trackMeta.style === 'brazilian_funk' ? 'square' : 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.setValueAtTime(leadFreq, t0);
          osc2.frequency.setValueAtTime(leadFreq, t0);
          osc2.detune.setValueAtTime(isRemix ? 11 : 6, t0);
          osc1.connect(leadFilter);
          osc2.connect(leadFilter);
          osc1.start(t0);
          osc2.start(t0);
          osc1.stop(t0 + stepSec * 1.7);
          osc2.stop(t0 + stepSec * 1.7);
        } else {
          // Detuned Supersaw Lead Hook
          const leadFilter = audio.createBiquadFilter();
          const leadGain = audio.createGain();
          leadFilter.type = 'lowpass';
          leadFilter.frequency.setValueAtTime(isRemix ? 4200 : 2500, t0);
          leadFilter.frequency.exponentialRampToValueAtTime(
            900,
            t0 + stepSec * 1.75,
          );
          leadFilter.Q.setValueAtTime(isRemix ? 1.8 : 0.8, t0);

          const amp = isRemix ? 0.075 : 0.058;
          leadGain.gain.setValueAtTime(0.0001, t0);
          leadGain.gain.linearRampToValueAtTime(amp, t0 + 0.01);
          leadGain.gain.exponentialRampToValueAtTime(0.0001, t0 + stepSec * 1.85);

          leadFilter.connect(leadGain);
          leadGain.connect(master);

          const detunes = isRemix ? [-9, 9] : [0];
          detunes.forEach((det) => {
            const osc = audio.createOscillator();
            osc.type = trackMeta.style === 'chill' && !isRemix ? 'triangle' : 'sawtooth';
            osc.frequency.setValueAtTime(leadFreq, t0);
            if (det !== 0) osc.detune.setValueAtTime(det, t0);
            osc.connect(leadFilter);
            osc.start(t0);
            osc.stop(t0 + stepSec * 1.9);
          });
        }
      }
    };

    scheduleStep();
    this.bgmTimer = window.setInterval(scheduleStep, sixteenthMs);
  }

  public stopFcBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.stopCustomAudioPlayback();
    this.syncBgmGain();
  }

  public startDiscoBeat(): void {
    if (this.discoTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.discoStep = 0;
    this.syncBgmGain();

    const bassNotes = [110, 110, 146.83, 130.81, 98, 98, 130.81, 164.81];
    const leadNotes = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25];

    this.discoTimer = window.setInterval(() => {
      if (this._muted) return;
      const audio = this.ensureContext();
      if (!audio) return;
      const t0 = audio.currentTime;
      const step = this.discoStep % 8;
      this.discoStep += 1;

      // Kick on even beats
      if (step % 2 === 0) {
        const kick = audio.createOscillator();
        const kGain = audio.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(132, t0);
        kick.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
        kGain.gain.setValueAtTime(0.16, t0);
        kGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        kick.connect(kGain);
        kGain.connect(audio.destination);
        kick.start(t0);
        kick.stop(t0 + 0.17);
      }

      // Funky octave bass
      const bass = audio.createOscillator();
      const bGain = audio.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(bassNotes[step], t0);
      bGain.gain.setValueAtTime(0.08, t0);
      bGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.19);
      bass.connect(bGain);
      bGain.connect(audio.destination);
      bass.start(t0);
      bass.stop(t0 + 0.2);

      // Disco synth stab on offbeats
      if (step % 2 === 1) {
        const lead = audio.createOscillator();
        const lGain = audio.createGain();
        lead.type = 'sine';
        lead.frequency.setValueAtTime(leadNotes[step], t0);
        lGain.gain.setValueAtTime(0.045, t0);
        lGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
        lead.connect(lGain);
        lGain.connect(audio.destination);
        lead.start(t0);
        lead.stop(t0 + 0.15);
      }
    }, 245);
  }

  public stopDiscoBeat(): void {
    if (this.discoTimer !== null) {
      window.clearInterval(this.discoTimer);
      this.discoTimer = null;
    }
    this.syncBgmGain();
  }
}

export const soundEngine = new SoundEngine();
