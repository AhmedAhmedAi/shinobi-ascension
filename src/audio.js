/* ============================================================
   Tiny WebAudio SFX engine. All sounds are synthesized.
   No external audio files.
   ============================================================ */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._lastHit = 0;
    this._noise = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.2;
    this.master.connect(this.ctx.destination);
    this._buildNoise();
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

  setEnabled(on) {
    this.enabled = !!on;
    if (this.master) this.master.gain.value = on ? 0.2 : 0;
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
    gain.connect(this.master);
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
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  hit(crit = false) {
    const now = performance.now();
    if (now - this._lastHit < 28) return;
    this._lastHit = now;
    this._noiseBurst({ dur: 0.055, freq: crit ? 2600 : 1500, q: 0.7, vol: 0.32 });
    this._tone({ freq: crit ? 180 : 120, to: 60, dur: 0.08, type: 'square', vol: 0.16 });
  }

  slash() {
    this._noiseBurst({ dur: 0.09, freq: 3200, q: 1.2, vol: 0.18, type: 'highpass' });
  }

  coin() {
    this._tone({ freq: 1040, to: 1560, dur: 0.08, type: 'sine', vol: 0.14 });
    this._tone({ freq: 1560, to: 2090, dur: 0.07, type: 'sine', vol: 0.08, delay: 0.045 });
  }

  xp() {
    this._tone({ freq: 620, to: 830, dur: 0.07, type: 'triangle', vol: 0.1 });
  }

  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.16, delay: i * 0.07 });
    });
  }

  unlock() {
    this._tone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.14 });
    this._tone({ freq: 1175, dur: 0.16, type: 'sine', vol: 0.12, delay: 0.08 });
  }

  dash() {
    this._noiseBurst({ dur: 0.14, freq: 2400, q: 1.4, vol: 0.16, type: 'bandpass' });
    this._tone({ freq: 240, to: 720, dur: 0.12, type: 'sawtooth', vol: 0.07 });
  }

  cast() {
    this._tone({ freq: 320, to: 900, dur: 0.13, type: 'triangle', vol: 0.14 });
  }

  chain() {
    this._noiseBurst({ dur: 0.14, freq: 4200, q: 2, vol: 0.2, type: 'highpass' });
    this._tone({ freq: 1300, to: 480, dur: 0.16, type: 'square', vol: 0.08 });
  }

  storm() {
    this._noiseBurst({ dur: 0.35, freq: 900, q: 0.6, vol: 0.3, type: 'lowpass' });
    this._tone({ freq: 90, to: 42, dur: 0.42, type: 'sine', vol: 0.24 });
  }

  ultimate() {
    this.storm();
    [660, 880, 1100, 1320].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.12, delay: 0.08 + i * 0.05 });
    });
  }

  hurt() {
    this._tone({ freq: 170, to: 70, dur: 0.16, type: 'square', vol: 0.2 });
    this._noiseBurst({ dur: 0.18, freq: 500, q: 0.5, vol: 0.12, type: 'lowpass' });
  }

  boss() {
    this._tone({ freq: 70, to: 38, dur: 0.9, type: 'sawtooth', vol: 0.2 });
    this._noiseBurst({ dur: 0.7, freq: 300, q: 0.4, vol: 0.18, type: 'lowpass' });
  }

  wave() {
    this._tone({ freq: 440, dur: 0.12, type: 'sine', vol: 0.1 });
    this._tone({ freq: 660, dur: 0.18, type: 'sine', vol: 0.1, delay: 0.1 });
  }

  ui() {
    this._tone({ freq: 520, to: 620, dur: 0.045, type: 'sine', vol: 0.08 });
  }

  error() {
    this._tone({ freq: 190, to: 120, dur: 0.12, type: 'square', vol: 0.08 });
  }

  death() {
    [440, 330, 247, 165].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.14, delay: i * 0.11 });
    });
  }

  victory() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      this._tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.14, delay: i * 0.09 });
    });
  }
}

export const audio = new AudioEngine();
