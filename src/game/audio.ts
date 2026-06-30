import { ZoneId } from './types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private musicPlaying: boolean = false;
  private currentZone: ZoneId = 0;
  private stepIndex: number = 0;
  private nextNoteTime: number = 0;
  private sequencerTimer: any = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Music scales and tempos
  // BPM: Town = 110, Woods = 90, Boss = 138
  private bpms: Record<number, number> = {
    0: 110,
    1: 90,
    2: 100,
    3: 138,
    4: 125
  };

  // MIDI note definitions
  // Zone 0: Town (C Major — cozy, warm)
  private townBass = [48, null, 48, null, 55, null, 55, null, 57, null, 57, null, 53, null, 53, null];
  private townMelody = [64, 67, 72, 67, 69, 72, 77, 76, 74, 71, 67, 71, 72, null, 72, null];

  // Zone 1: Woods (A Minor — eerie, mysterious)
  private woodsBass = [45, null, 52, null, 41, null, 48, null, 38, null, 45, null, 40, null, 52, null];
  private woodsMelody = [57, 60, 64, 67, 65, 64, 62, 57, 59, 62, 64, 59, 57, null, 57, null];

  // Zone 2: Desert (D Mixolydian — hot, exotic)
  private desertBass = [50, null, 50, null, 57, null, 57, null, 55, null, 55, null, 52, null, 48, null];
  private desertMelody = [62, 66, 69, 71, 69, 66, 64, 62, 66, 69, 74, 71, 69, null, 66, null];

  // Zone 3: Dungeon / Boss (Tense E Phrygian)
  private dungeonBass = [40, 40, 40, 40, 41, 41, 41, 41, 43, 43, 43, 43, 41, 41, 41, 41];
  private dungeonMelody = [64, 65, 68, 65, 68, 69, 72, 69, 72, 73, 76, 73, 72, 69, 68, 65];

  // Zone 4: Sanctum (B Diminished — dark, ominous, final)
  private sanctumBass = [47, null, 47, 47, 50, null, 50, 50, 53, null, 53, 53, 50, null, 47, null];
  private sanctumMelody = [71, 74, 77, 80, 77, 74, 71, 68, 71, 77, 80, 83, 80, null, 77, null];

  constructor() {
    try {
      this.muted = localStorage.getItem('pixHeroMuted') === 'true';
    } catch {
      this.muted = false;
    }
  }

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);

    // Warm up the white noise buffer
    this.createNoiseBuffer();

    // Start background music loop scheduling
    this.startMusicLoop();
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const size = this.ctx.sampleRate * 0.3; // 0.3s of noise
    this.noiseBuffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public isMuted() {
    return this.muted;
  }

  public toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('pixHeroMuted', String(this.muted));
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
    }
    // Return the current state
    return this.muted;
  }

  public playSfx(type: 'slash' | 'dash' | 'hit' | 'coin' | 'hurt' | 'levelup' | 'quest' | 'click' | 'shop') {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;

    switch (type) {
      case 'slash': {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(950, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

        gainNode.gain.setValueAtTime(0.4, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.13);
        break;
      }
      case 'dash': {
        if (!this.noiseBuffer) return;
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        source.buffer = this.noiseBuffer;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, t);
        filter.frequency.exponentialRampToValueAtTime(280, t + 0.16);
        filter.Q.setValueAtTime(2.2, t);

        gainNode.gain.setValueAtTime(0.3, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(t);
        source.stop(t + 0.18);
        break;
      }
      case 'hit': {
        // Bass hit
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(20, t + 0.09);

        gainNode.gain.setValueAtTime(0.4, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);

        // Noise crunch
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          const nGain = this.ctx.createGain();
          const nFilter = this.ctx.createBiquadFilter();

          noise.buffer = this.noiseBuffer;
          nFilter.type = 'highpass';
          nFilter.frequency.setValueAtTime(600, t);

          nGain.gain.setValueAtTime(0.12, t);
          nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

          noise.connect(nFilter);
          nFilter.connect(nGain);
          nGain.connect(this.masterGain);
          noise.start(t);
          noise.stop(t + 0.05);
        }
        break;
      }
      case 'coin': {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.setValueAtTime(1318.51, t + 0.06); // E6

        gainNode.gain.setValueAtTime(0.12, t);
        gainNode.gain.setValueAtTime(0.12, t + 0.06);
        gainNode.gain.exponentialRampToValueAtTime(0.005, t + 0.22);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.23);
        break;
      }
      case 'hurt': {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.linearRampToValueAtTime(60, t + 0.16);

        gainNode.gain.setValueAtTime(0.35, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.17);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.17);
        break;
      }
      case 'levelup': {
        // Fast upward arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gainNode = this.ctx!.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t + idx * 0.07);

          gainNode.gain.setValueAtTime(0.12, t + idx * 0.07);
          gainNode.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.07 + 0.15);

          osc.connect(gainNode);
          gainNode.connect(this.masterGain!);
          osc.start(t + idx * 0.07);
          osc.stop(t + idx * 0.07 + 0.16);
        });
        break;
      }
      case 'quest': {
        // Triumphant double chord
        const chord1 = [261.63, 329.63, 392.00]; // C4, E4, G4
        const chord2 = [349.23, 440.00, 523.25]; // F4, A4, C5
        const chord3 = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        chord1.forEach(freq => this.playTone(freq, 'triangle', t, 0.15, 0.12));
        chord2.forEach(freq => this.playTone(freq, 'triangle', t + 0.16, 0.15, 0.12));
        chord3.forEach(freq => this.playTone(freq, 'triangle', t + 0.32, 0.45, 0.12));
        break;
      }
      case 'click': {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680, t);
        osc.frequency.linearRampToValueAtTime(320, t + 0.04);

        gainNode.gain.setValueAtTime(0.15, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }
      case 'shop': {
        // G4 -> C5 -> E5 -> G5
        const notes = [392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          this.playTone(freq, 'sine', t + idx * 0.045, 0.28, 0.15);
        });
        break;
      }
    }
  }

  private playTone(freq: number, type: OscillatorType, start: number, duration: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gainNode.gain.setValueAtTime(vol, start);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration);
  }

  public setZoneMusic(zone: ZoneId) {
    this.init();
    if (this.currentZone !== zone) {
      this.currentZone = zone;
      this.stepIndex = 0;
      if (this.ctx) {
        this.nextNoteTime = this.ctx.currentTime + 0.05;
      }
    }
    this.musicPlaying = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public pauseMusic() {
    this.musicPlaying = false;
  }

  public resumeMusic() {
    this.musicPlaying = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private startMusicLoop() {
    if (this.sequencerTimer) return;
    this.nextNoteTime = this.ctx!.currentTime + 0.1;

    const lookahead = 25.0; // Poll every 25ms
    const scheduleAheadTime = 0.1; // Schedule notes 100ms in advance

    const tick = () => {
      if (!this.ctx || !this.musicPlaying) {
        this.sequencerTimer = setTimeout(tick, lookahead);
        return;
      }

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        this.scheduleNoteAtTime(this.stepIndex, this.nextNoteTime);
        this.advanceStep();
      }
      this.sequencerTimer = setTimeout(tick, lookahead);
    };

    tick();
  }

  private advanceStep() {
    const bpm = this.bpms[this.currentZone] ?? 110;
    const stepDuration = 60 / bpm / 2; // Eighth note duration
    this.nextNoteTime += stepDuration;
    this.stepIndex = (this.stepIndex + 1) % 16;
  }

  private scheduleNoteAtTime(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    let bassNote: number | null = null;
    let melNote: number | null = null;

    if (this.currentZone === 0) {
      bassNote = this.townBass[step];
      melNote = this.townMelody[step];
    } else if (this.currentZone === 1) {
      bassNote = this.woodsBass[step];
      melNote = this.woodsMelody[step];
    } else if (this.currentZone === 2) {
      bassNote = this.desertBass[step];
      melNote = this.desertMelody[step];
    } else if (this.currentZone === 3) {
      bassNote = this.dungeonBass[step];
      melNote = this.dungeonMelody[step];
    } else {
      bassNote = this.sanctumBass[step];
      melNote = this.sanctumMelody[step];
    }

    const bpm = this.bpms[this.currentZone] ?? 110;
    const stepDuration = 60 / bpm / 2;

    // Play Bass Note
    if (bassNote !== null) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.midiToFreq(bassNote), time);

      // Bass volume envelope
      gainNode.gain.setValueAtTime(0.18, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + stepDuration * 0.95);
    }

    // Play Melody Note
    if (melNote !== null) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = this.currentZone >= 3 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(this.midiToFreq(melNote), time);

      // Melody volume envelope - softer to not pierce ears
      const baseVol = this.currentZone === 2 ? 0.045 : 0.055;
      gainNode.gain.setValueAtTime(baseVol, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.85);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + stepDuration * 0.9);
    }
  }

  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }
}

export const audio = new AudioEngine();
