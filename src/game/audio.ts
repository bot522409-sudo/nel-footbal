class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
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
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
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

  public startDiscoBeat(): void {
    if (this.discoTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.discoStep = 0;

    const bassNotes = [110, 110, 146.83, 130.81, 98, 98, 130.81, 164.81];
    const leadNotes = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25];

    this.discoTimer = window.setInterval(() => {
      if (this.muted) return;
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
  }
}

export const soundEngine = new SoundEngine();
