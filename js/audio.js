// Procedural audio engine. Everything is synthesized — no external samples.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.started = false;
    this.noise = null;
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.noise = this.makeNoise(2.6);
    this.startAmbience();
    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.62, this.ctx.currentTime + 0.08);
    }
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.92 + white * 0.08;
      data[i] = white * 0.5 + last * 1.8;
    }
    return buffer;
  }

  startAmbience() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Desert wind.
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 360;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.028;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.master);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(windGain.gain);
    lfo.start(now);
    wind.start(now);

    // Low electrical drone.
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 49;
    const drone2 = ctx.createOscillator();
    drone2.type = 'triangle';
    drone2.frequency.value = 73.5;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.008;
    const drone2Gain = ctx.createGain();
    drone2Gain.gain.value = 0.0025;
    drone.connect(droneGain);
    drone2.connect(drone2Gain);
    droneGain.connect(this.master);
    drone2Gain.connect(this.master);
    drone.start(now);
    drone2.start(now);
  }

  env(node, time, peak, attack, decay, sustain = 0) {
    node.gain.cancelScheduledValues(time);
    node.gain.setValueAtTime(0.0001, time);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), time + attack + decay);
  }

  burst({ duration = 0.12, volume = 0.2, type = 'bandpass', freq = 900, q = 0.7, attack = 0.002, pan = 0, delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.25;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.35), t + duration);
    filter.Q.value = q;
    const gain = ctx.createGain();
    this.env(gain, t, volume, attack, duration, 0.0001);
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    src.start(t);
    src.stop(t + duration + 0.06);
  }

  tone({ freq = 440, endFreq = null, duration = 0.12, volume = 0.09, type = 'sine', pan = 0, delay = 0, attack = 0.003 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
    const gain = ctx.createGain();
    this.env(gain, t, volume, attack, duration, 0.0001);
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  shot(kind = 'rifle', pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (kind === 'rifle') {
      this.burst({ duration: 0.16, volume: 0.31, freq: 1850, q: 0.7, pan });
      this.burst({ duration: 0.035, volume: 0.2, type: 'highpass', freq: 3000, pan });
      this.tone({ freq: 105, endFreq: 38, duration: 0.17, volume: 0.35, type: 'triangle', pan });
      this.tone({ freq: 68, endFreq: 32, duration: 0.22, volume: 0.24, type: 'sine', pan });
    } else if (kind === 'pistol') {
      this.burst({ duration: 0.1, volume: 0.24, freq: 2400, q: 0.9, pan });
      this.tone({ freq: 150, endFreq: 52, duration: 0.13, volume: 0.23, type: 'triangle', pan });
    } else if (kind === 'heavy') {
      this.burst({ duration: 0.22, volume: 0.4, freq: 900, q: 0.5, pan });
      this.tone({ freq: 70, endFreq: 28, duration: 0.3, volume: 0.44, type: 'sine', pan });
    } else if (kind === 'enemy') {
      this.burst({ duration: 0.12, volume: 0.12, freq: 1300, q: 0.8, pan });
      this.tone({ freq: 120, endFreq: 45, duration: 0.15, volume: 0.13, type: 'triangle', pan });
    }
    // A short tail/echo keeps the gun feeling physical.
    if (kind !== 'enemy') {
      this.burst({ duration: 0.35, volume: 0.055, type: 'lowpass', freq: 700, delay: 0.035, pan });
      this.burst({ duration: 0.5, volume: 0.028, type: 'lowpass', freq: 380, delay: 0.11, pan: -pan * 0.4 });
    }
  }

  enemyShot(distance = 20, pan = 0) {
    const near = Math.max(0.12, 1 - distance / 70);
    if (!this.ctx) return;
    this.burst({ duration: 0.13, volume: 0.16 * near, type: 'lowpass', freq: 1700, q: 0.7, pan });
    this.tone({ freq: 110, endFreq: 42, duration: 0.16, volume: 0.16 * near, type: 'triangle', pan });
  }

  explosion(pan = 0) {
    if (!this.ctx) return;
    this.burst({ duration: 1.2, volume: 0.55, type: 'lowpass', freq: 460, q: 0.5, attack: 0.005, pan });
    this.burst({ duration: 0.18, volume: 0.34, type: 'lowpass', freq: 1100, pan });
    this.tone({ freq: 62, endFreq: 21, duration: 1.1, volume: 0.48, type: 'sine', pan });
    this.tone({ freq: 110, endFreq: 34, duration: 0.55, volume: 0.26, type: 'triangle', pan });
  }

  impact(pan = 0) {
    this.burst({ duration: 0.07, volume: 0.09, type: 'highpass', freq: 2400, pan });
    this.tone({ freq: 2400, endFreq: 1200, duration: 0.05, volume: 0.025, type: 'square', pan });
  }

  hitmarker(headshot = false) {
    if (!this.ctx) return;
    if (headshot) {
      this.tone({ freq: 2350, duration: 0.045, volume: 0.06, type: 'square' });
      this.tone({ freq: 3150, duration: 0.07, volume: 0.035, type: 'sine', delay: 0.025 });
    } else {
      this.tone({ freq: 1750, duration: 0.035, volume: 0.042, type: 'square' });
    }
  }

  reload(seconds = 1.8) {
    if (!this.ctx) return;
    const taps = [0, seconds * 0.28, seconds * 0.58, seconds * 0.88];
    taps.forEach((delay, i) => {
      this.burst({ duration: 0.035, volume: i === 0 ? 0.09 : 0.065, type: 'bandpass', freq: i === 2 ? 900 : 1700, q: 1.1, delay });
      this.tone({ freq: i === 2 ? 280 : 620, duration: 0.03, volume: 0.026, type: 'square', delay });
    });
  }

  empty() {
    this.burst({ duration: 0.025, volume: 0.05, type: 'highpass', freq: 2500 });
    this.tone({ freq: 400, duration: 0.03, volume: 0.02, type: 'square' });
  }

  switchWeapon() {
    this.burst({ duration: 0.04, volume: 0.045, type: 'bandpass', freq: 1400, q: 1 });
    this.tone({ freq: 520, endFreq: 380, duration: 0.06, volume: 0.02, type: 'square' });
  }

  footstep(sprint = false) {
    this.burst({ duration: sprint ? 0.08 : 0.11, volume: sprint ? 0.048 : 0.033, type: 'lowpass', freq: sprint ? 300 : 240, q: 0.6 });
    this.tone({ freq: sprint ? 82 : 68, endFreq: 40, duration: 0.07, volume: 0.018, type: 'sine' });
  }

  playerHit() {
    if (!this.ctx) return;
    this.tone({ freq: 160, endFreq: 55, duration: 0.17, volume: 0.2, type: 'triangle' });
    this.burst({ duration: 0.18, volume: 0.1, type: 'lowpass', freq: 700 });
  }

  nearMiss(pan = 0) {
    this.burst({ duration: 0.15, volume: 0.06, type: 'bandpass', freq: 2800, q: 2, pan });
  }

  pickup(kind = 'ammo') {
    if (!this.ctx) return;
    const base = kind === 'health' ? 620 : 520;
    this.tone({ freq: base, duration: 0.07, volume: 0.05, type: 'sine' });
    this.tone({ freq: base * 1.5, duration: 0.08, volume: 0.04, type: 'sine', delay: 0.07 });
  }

  waveAlarm() {
    if (!this.ctx) return;
    this.tone({ freq: 180, endFreq: 135, duration: 0.55, volume: 0.12, type: 'sawtooth', attack: 0.04 });
    this.tone({ freq: 180, endFreq: 135, duration: 0.55, volume: 0.1, type: 'sawtooth', delay: 0.7, attack: 0.04 });
    this.burst({ duration: 0.4, volume: 0.04, type: 'lowpass', freq: 500, delay: 0.1 });
  }

  waveClear() {
    if (!this.ctx) return;
    [440, 554, 659].forEach((f, i) => {
      this.tone({ freq: f, duration: 0.35, volume: 0.045, type: 'sine', delay: i * 0.11, attack: 0.02 });
      this.tone({ freq: f * 0.5, duration: 0.35, volume: 0.022, type: 'triangle', delay: i * 0.11, attack: 0.02 });
    });
  }

  missionComplete() {
    if (!this.ctx) return;
    [392, 523, 659, 784].forEach((f, i) => {
      this.tone({ freq: f, duration: 0.75, volume: 0.055, type: 'sine', delay: i * 0.16, attack: 0.03 });
    });
    this.tone({ freq: 98, duration: 1.5, volume: 0.09, type: 'triangle', delay: 0.05, attack: 0.2 });
  }

  gameOver() {
    if (!this.ctx) return;
    this.tone({ freq: 220, endFreq: 55, duration: 1.8, volume: 0.12, type: 'sine', attack: 0.05 });
    this.burst({ duration: 1.2, volume: 0.06, type: 'lowpass', freq: 240, delay: 0.1 });
  }

  ui() {
    this.tone({ freq: 1100, endFreq: 800, duration: 0.045, volume: 0.025, type: 'square' });
  }

  radio() {
    if (!this.ctx) return;
    this.burst({ duration: 0.16, volume: 0.03, type: 'highpass', freq: 1800 });
    this.tone({ freq: 1400, duration: 0.05, volume: 0.018, type: 'square' });
  }
}
