// Procedural Electronic Synthwave/Cyberpunk Background Music Engine

class SynthMusicEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isPlaying = false;
  private volume = 0.45;
  private tempo = 126; // BPM
  private currentStep = 0;
  private intervalId: number | null = null;
  private intensity = 1.0; // scales with player speed / flow combo

  // Synth wave chord progressions (Root frequencies)
  private scales = [
    [130.81, 155.56, 174.61, 196.00, 233.08, 261.63], // C minor pentatonic
    [116.54, 138.59, 155.56, 174.61, 207.65, 233.08], // Bb minor pentatonic
    [98.00, 116.54, 130.81, 146.83, 174.61, 196.00],  // G minor
    [146.83, 174.61, 196.00, 220.00, 261.63, 293.66], // D minor
  ];
  private scaleIndex = 0;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.volume;
      this.musicGain.connect(this.ctx.destination);
    } catch {
      // AudioContext delayed
    }
  }

  public setVolume(vol: number) {
    this.volume = vol;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  public setIntensity(intensity: number) {
    // scale from 1.0 to 2.5
    this.intensity = Math.max(1.0, Math.min(2.5, intensity));
  }

  public start() {
    if (this.isPlaying) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isPlaying = true;
    this.currentStep = 0;

    const stepTimeMs = (60 / this.tempo / 4) * 1000; // 16th notes
    this.intervalId = window.setInterval(() => {
      this.playStep();
    }, stepTimeMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private playStep() {
    if (!this.ctx || !this.musicGain || this.volume <= 0.01) return;
    const now = this.ctx.currentTime;
    const step = this.currentStep % 16;
    const bar = Math.floor(this.currentStep / 16);

    // Switch scale every 4 bars
    if (this.currentStep % 64 === 0) {
      this.scaleIndex = (this.scaleIndex + 1) % this.scales.length;
    }

    const currentScale = this.scales[this.scaleIndex];

    // 1. Kick Drum on 0, 4, 8, 12 (Four on the floor)
    if (step % 4 === 0) {
      this.triggerKick(now);
    }

    // 2. Snare / Clap on 4 and 12
    if (step === 4 || step === 12) {
      this.triggerSnare(now);
    }

    // 3. Hihat on off-beats (2, 6, 10, 14) or fast 16ths when high intensity
    if (step % 2 === 0 || (this.intensity > 1.4 && step % 1 === 0)) {
      this.triggerHihat(now, step % 4 === 2 ? 0.08 : 0.04);
    }

    // 4. Rolling Synth Bassline (16th note rolling arpeggio)
    const rootNote = currentScale[0] / 2; // Low bass octave
    const bassNoteOffset = (step % 4 === 0 || step % 4 === 3) ? 0 : 2;
    const bassFreq = (step % 8 === 6) ? currentScale[3] / 2 : rootNote * Math.pow(2, bassNoteOffset / 12);
    this.triggerBass(now, bassFreq);

    // 5. Arpeggiator Lead melody (adapts to intensity)
    if (this.intensity > 1.1) {
      const arpIndex = (step * 2 + bar) % currentScale.length;
      const arpFreq = currentScale[arpIndex] * (this.intensity > 1.8 ? 2 : 1);
      this.triggerLeadArp(now, arpFreq);
    }

    this.currentStep++;
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    gain.gain.setValueAtTime(0.4 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  private triggerSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    // White noise burst for snare
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.12);
  }

  private triggerHihat(time: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 7500;
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private triggerBass(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300 + (this.intensity - 1) * 300, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.18 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  private triggerLeadArp(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.value = 1800;

    gain.gain.setValueAtTime(0.12 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }
}

export const music = new SynthMusicEngine();
