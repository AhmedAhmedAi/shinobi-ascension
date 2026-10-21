/* ============================================================
   SHINOBI ASCENSION — audio engine
   Synthesized SFX + original procedural music. No audio files.
   ============================================================ */

const MUSIC = {
  dojo: {
    bpm: 74, root: 57, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [-2, 2, 5], [-5, -1, 3], [0, 3, 7]],
    arp: [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 11, 7, 4, 2, 4],
    arpType: 'triangle', padType: 'sine', bassType: 'sine',
    drums: 'soft', arpVol: 0.075, padVol: 0.035, bassVol: 0.11, swing: 0.02,
  },
  forest: {
    bpm: 86, root: 57, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [-2, 2, 5], [-5, -1, 3], [0, 3, 7]],
    arp: [0, 2, 4, 7, 4, 2, 0, -3, 0, 4, 7, 9, 7, 4, 2, 0],
    arpType: 'triangle', padType: 'sine', bassType: 'sine',
    drums: 'light', arpVol: 0.085, padVol: 0.038, bassVol: 0.12, swing: 0.015,
  },
  village: {
    bpm: 96, root: 50, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [-3, 0, 4], [-5, -1, 3], [-3, 0, 4]],
    arp: [0, 3, 7, 3, 0, -2, 2, 5, 0, 3, 7, 10, 7, 3, 0, -2],
    arpType: 'sawtooth', padType: 'triangle', bassType: 'square',
    drums: 'light', arpVol: 0.055, padVol: 0.03, bassVol: 0.1, swing: 0.01,
  },
  caverns: {
    bpm: 72, root: 52, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [-2, 2, 5], [-5, -1, 3], [0, 3, 7]],
    arp: [0, 4, 7, 11, 7, 4, 2, 7, 0, 4, 9, 11, 9, 4, 2, 0],
    arpType: 'sine', padType: 'sine', bassType: 'sine',
    drums: 'soft', arpVol: 0.07, padVol: 0.04, bassVol: 0.1, swing: 0,
  },
  volcano: {
    bpm: 116, root: 48, scale: [0, 1, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [-1, 3, 6], [-5, -1, 3], [0, 3, 7]],
    arp: [0, 3, 7, 3, 0, 1, 5, 8, 0, 3, 7, 10, 7, 3, 1, 0],
    arpType: 'sawtooth', padType: 'triangle', bassType: 'square',
    drums: 'heavy', arpVol: 0.05, padVol: 0.03, bassVol: 0.12, swing: 0,
  },
  fortress: {
    bpm: 100, root: 54, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [-3, 0, 4], [-5, -1, 3], [-1, 2, 6]],
    arp: [0, 4, 7, 4, 0, 3, 8, 12, 0, 4, 7, 11, 7, 4, 3, 0],
    arpType: 'triangle', padType: 'sawtooth', bassType: 'sine',
    drums: 'heavy', arpVol: 0.06, padVol: 0.028, bassVol: 0.11, swing: 0,
  },
  boss: {
    bpm: 138, root: 45, scale: [0, 1, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [0, 1, 6], [-4, 0, 3], [0, 3, 7]],
    arp: [0, 3, 7, 3, 0, 1, 6, 10, 0, 3, 7, 12, 10, 7, 3, 1],
    arpType: 'square', padType: 'sawtooth', bassType: 'square',
    drums: 'boss', arpVol: 0.05, padVol: 0.028, bassVol: 0.14, swing: 0,
  },
};

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = true;
    this._noise = null;
    this._lastHit = 0;
    this._lastCoin = 0;
    this.music = { theme: null, timer: 0, step: 0, next: 0, playing: false, ducked: false };
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.enabled && this.music.theme && !this.music.playing) this.startMusic(this.music.theme);
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.62 : 0;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.28;
    this.musicGain.connect(this.master);

    this._buildNoise();
    if (this.enabled && this.music.theme) this.startMusic(this.music.theme);
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.enabled ? 0.62 : 0, t, 0.02);
    if (!this.enabled) {
      this._stopScheduler();
    } else if (this.music.theme && !this.music.playing) {
      this.startMusic(this.music.theme);
    }
  }

  _buildNoise() {
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.94 * last + 0.06 * white;
      data[i] = last * 3.2;
    }
    this._noise = buffer;
  }

  _tone({ freq, to, dur = 0.12, type = 'sine', vol = 0.4, delay = 0 }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  _noiseBurst({ dur = 0.1, freq = 1500, q = 0.8, vol = 0.35, type = 'bandpass', delay = 0 }) {
    if (!this.enabled || !this.ctx || !this._noise) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /* ---------------- SFX ---------------- */

  hit(crit = false) {
    const now = performance.now();
    if (now - this._lastHit < 26) return;
    this._lastHit = now;
    this._noiseBurst({ dur: 0.06, freq: crit ? 3000 : 1800, q: 0.7, vol: 0.5 });
    this._tone({ freq: crit ? 210 : 130, to: 55, dur: 0.09, type: 'square', vol: 0.26 });
    if (crit) this._tone({ freq: 1800, to: 2600, dur: 0.09, type: 'triangle', vol: 0.12 });
  }

  blade() {
    this._noiseBurst({ dur: 0.11, freq: 4200, q: 1.1, vol: 0.32, type: 'highpass' });
    this._tone({ freq: 780, to: 320, dur: 0.08, type: 'sawtooth', vol: 0.06 });
  }

  slash() {
    this._noiseBurst({ dur: 0.1, freq: 3400, q: 1.2, vol: 0.24, type: 'highpass' });
  }

  coin() {
    const now = performance.now();
    if (now - this._lastCoin < 45) return;
    this._lastCoin = now;
    this._tone({ freq: 1040, to: 1560, dur: 0.08, type: 'sine', vol: 0.2 });
    this._tone({ freq: 1560, to: 2090, dur: 0.07, type: 'sine', vol: 0.12, delay: 0.045 });
  }

  xp() {
    this._tone({ freq: 620, to: 830, dur: 0.07, type: 'triangle', vol: 0.14 });
  }

  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.2, delay: i * 0.07 });
    });
  }

  unlock() {
    this._tone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.18 });
    this._tone({ freq: 1175, dur: 0.18, type: 'sine', vol: 0.15, delay: 0.08 });
  }

  dash() {
    this._noiseBurst({ dur: 0.16, freq: 2600, q: 1.4, vol: 0.28, type: 'bandpass' });
    this._tone({ freq: 220, to: 880, dur: 0.14, type: 'sawtooth', vol: 0.12 });
  }

  cast() {
    this._tone({ freq: 320, to: 950, dur: 0.14, type: 'triangle', vol: 0.18 });
  }

  chain() {
    this._noiseBurst({ dur: 0.16, freq: 4800, q: 2, vol: 0.3, type: 'highpass' });
    this._tone({ freq: 1400, to: 420, dur: 0.18, type: 'square', vol: 0.12 });
  }

  storm() {
    this._noiseBurst({ dur: 0.4, freq: 950, q: 0.6, vol: 0.42, type: 'lowpass' });
    this._tone({ freq: 95, to: 40, dur: 0.46, type: 'sine', vol: 0.32 });
  }

  ultimate() {
    this.storm();
    [660, 880, 1100, 1320].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.24, type: 'triangle', vol: 0.16, delay: 0.06 + i * 0.05 });
    });
  }

  hurt() {
    this._tone({ freq: 170, to: 65, dur: 0.18, type: 'square', vol: 0.28 });
    this._noiseBurst({ dur: 0.2, freq: 500, q: 0.5, vol: 0.2, type: 'lowpass' });
  }

  boss() {
    this._tone({ freq: 68, to: 34, dur: 1.0, type: 'sawtooth', vol: 0.28 });
    this._noiseBurst({ dur: 0.8, freq: 280, q: 0.4, vol: 0.26, type: 'lowpass' });
  }

  wave() {
    this._tone({ freq: 440, dur: 0.12, type: 'sine', vol: 0.14 });
    this._tone({ freq: 660, dur: 0.2, type: 'sine', vol: 0.13, delay: 0.1 });
  }

  ui() {
    this._tone({ freq: 520, to: 620, dur: 0.045, type: 'sine', vol: 0.12 });
  }

  error() {
    this._tone({ freq: 190, to: 120, dur: 0.12, type: 'square', vol: 0.12 });
  }

  death() {
    [440, 330, 247, 165].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.24, type: 'triangle', vol: 0.18, delay: i * 0.11 });
    });
  }

  victory() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.09 });
    });
  }

  /* ---------------- MUSIC ---------------- */

  playMusic(themeId) {
    if (!MUSIC[themeId]) return;
    this.music.theme = themeId;
    if (!this.ctx || !this.enabled) return;
    this.startMusic(themeId);
  }

  startMusic(themeId) {
    if (!this.ctx || !this.enabled || !MUSIC[themeId]) return;
    if (this.music.playing && this.music.theme === themeId) return;
    this._stopScheduler();
    this.music.theme = themeId;
    this.music.step = 0;
    this.music.next = this.ctx.currentTime + 0.15;
    this.music.playing = true;
    this.music.timer = setInterval(() => this._schedule(), 80);
    this._schedule();
  }

  stopMusic(clearTheme = true) {
    this._stopScheduler();
    if (clearTheme) this.music.theme = null;
  }

  _stopScheduler() {
    if (this.music.timer) clearInterval(this.music.timer);
    this.music.timer = 0;
    this.music.playing = false;
  }

  duckMusic(on) {
    if (!this.ctx) return;
    this.music.ducked = !!on;
    this.musicGain.gain.setTargetAtTime(on ? 0.08 : 0.28, this.ctx.currentTime, 0.15);
  }

  _schedule() {
    if (!this.ctx || !this.enabled || !this.music.playing) return;
    const theme = MUSIC[this.music.theme];
    if (!theme) return;
    const stepDur = 60 / theme.bpm / 4;
    while (this.music.next < this.ctx.currentTime + 0.35) {
      this._playStep(theme, this.music.step, this.music.next, stepDur);
      this.music.next += stepDur;
      this.music.step = (this.music.step + 1) % 32;
    }
  }

  _musicTone(freq, t, dur, type, vol, detune = 0, attack = 0.012) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _musicNoise(t, dur, freq, vol, type = 'highpass') {
    if (!this.ctx || !this._noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  _playStep(theme, step, t, stepDur) {
    const chordIndex = Math.floor(step / 8) % theme.chords.length;
    const chord = theme.chords[chordIndex];
    const root = theme.root + chord[0];
    const degrees = theme.arp;
    const degree = degrees[step % degrees.length];
    const scale = theme.scale;
    const octave = Math.floor(degree / scale.length);
    const semitone = scale[((degree % scale.length) + scale.length) % scale.length] + octave * 12;
    const arpNote = theme.root + chord[0] + semitone;

    // Bass pulse
    if (step % 4 === 0) {
      this._musicTone(
        midiToFreq(root - 12), t, stepDur * 3.2,
        theme.bassType, theme.bassVol, 0, 0.02,
      );
    }

    // Arpeggio
    if (step % 2 === 0) {
      this._musicTone(midiToFreq(arpNote), t, stepDur * 1.6, theme.arpType, theme.arpVol, 0, 0.015);
      if (theme.bpm > 110) {
        this._musicTone(midiToFreq(arpNote + 12), t, stepDur * 0.9, theme.arpType, theme.arpVol * 0.35, 6, 0.01);
      }
    }

    // Pad / chord
    if (step % 8 === 0) {
      for (let i = 0; i < chord.length; i++) {
        this._musicTone(
          midiToFreq(theme.root + chord[i] - 12), t, stepDur * 7,
          theme.padType, theme.padVol, (i - 1) * 6, 0.35,
        );
      }
    }

    // Drums
    const drums = theme.drums;
    if (step === 0 || step === 8) {
      this._musicTone(92, t, 0.2, 'sine', drums === 'boss' ? 0.34 : 0.2, 0, 0.005);
      this._musicTone(48, t, 0.18, 'sine', drums === 'boss' ? 0.26 : 0.16, 0, 0.005);
    }
    if (step === 3 || step === 11) {
      if (drums === 'heavy' || drums === 'boss') {
        this._musicTone(70, t, 0.13, 'sine', 0.12, 0, 0.004);
      }
    }
    if (step === 4 || step === 12) {
      this._musicNoise(t, 0.13, 1800, drums === 'soft' ? 0.02 : 0.07, 'bandpass');
    }
    if (step % 2 === 1 && drums !== 'soft') {
      this._musicNoise(t, 0.035, 7200, drums === 'boss' ? 0.045 : 0.03, 'highpass');
    }
    if (drums === 'boss' && (step === 2 || step === 6 || step === 10 || step === 14)) {
      this._musicNoise(t, 0.06, 5000, 0.035, 'highpass');
    }
    if (drums === 'boss' && step === 0) {
      this._musicNoise(t, 0.35, 380, 0.06, 'lowpass');
      this._musicTone(midiToFreq(root + 1), t, 0.32, 'sawtooth', 0.035, 0, 0.01);
    }
  }
}

export const audio = new AudioEngine();
