// audio.js — all sound is synthesized live with WebAudio: three radio stations
// (a step sequencer with a different groove each), police sirens, engine hum
// and one-shot effects. No audio files, no network.

const STATIONS = [
  {
    name: 'SUN FM 101', bpm: 112, wave: 'sawtooth',
    bass: [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 82.4, 0, 73.4, 0],
    lead: [220, 0, 261.6, 329.6, 0, 261.6, 220, 0, 196, 0, 246.9, 293.7, 0, 293.7, 329.6, 0],
  },
  {
    name: 'BAY 98 CHILL', bpm: 84, wave: 'triangle',
    bass: [65.4, 0, 0, 65.4, 0, 0, 49, 0, 0, 55, 0, 0, 58.3, 0, 0, 49],
    lead: [392, 0, 0, 440, 0, 0, 523.3, 0, 0, 440, 0, 0, 493.9, 0, 392, 0],
  },
  {
    name: 'STATIC X', bpm: 128, wave: 'square',
    bass: [41.2, 41.2, 0, 41.2, 0, 41.2, 49, 0, 41.2, 41.2, 0, 41.2, 55, 0, 61.7, 0],
    lead: [0, 164.8, 0, 196, 0, 0, 164.8, 0, 0, 146.8, 0, 174.6, 0, 0, 196, 0],
  },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.station = 0;
    this.muted = false;
    this.step = 0;
    this.nextTime = 0;
    this.musicGain = null;
    this.sirenOsc = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.started = false;
  }

  /** Must be called from a user gesture at least once. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.ctx.destination);
      this.started = true;
    } catch (e) {
      this.ctx = null;
    }
  }

  stationName() {
    return STATIONS[this.station].name;
  }

  nextStation() {
    this.station = (this.station + 1) % STATIONS.length;
    this.step = 0;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : 0.16;
    if (this.engineGain) this.engineGain.gain.value = this.muted ? 0 : 0.05;
  }

  /** Schedule the radio sequencer a little ahead of time. Call every frame. */
  updateMusic() {
    if (!this.ctx || this.muted) return;
    const st = STATIONS[this.station];
    const stepDur = 60 / st.bpm / 2;
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const i = this.step % 16;
      const bass = st.bass[i];
      const lead = st.lead[i];
      if (bass) this.note(bass, this.nextTime, stepDur * 1.8, 'triangle', 0.5);
      if (lead) this.note(lead, this.nextTime, stepDur * 0.9, st.wave, 0.22);
      if (i % 4 === 0) this.note(1200, this.nextTime, 0.03, 'square', 0.08);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  note(freq, when, dur, wave, vol) {
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = wave;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(when);
      o.stop(when + dur + 0.02);
    } catch (e) { /* audio is best-effort */ }
  }

  /** One-shot effect. Names: thud, pickup, checkpoint, pass, fail, mission, punch, shoot, crash, cash. */
  sfx(name) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g);
      g.connect(this.ctx.destination);
      const tones = {
        thud: [90, 0.12, 'sine', 0.3],
        pickup: [660, 0.12, 'sine', 0.25],
        checkpoint: [880, 0.1, 'square', 0.15],
        pass: [523.3, 0.35, 'triangle', 0.3],
        fail: [160, 0.4, 'sawtooth', 0.25],
        mission: [392, 0.25, 'triangle', 0.25],
        punch: [140, 0.08, 'square', 0.3],
        shoot: [900, 0.07, 'square', 0.3],
        crash: [70, 0.3, 'sawtooth', 0.35],
        cash: [1046.5, 0.2, 'sine', 0.25],
      };
      const [f, d, w, v] = tones[name] || tones.pickup;
      o.type = w;
      o.frequency.setValueAtTime(f, t);
      if (name === 'pass') o.frequency.setValueAtTime(523.3, t), o.frequency.setValueAtTime(659.3, t + 0.12), o.frequency.setValueAtTime(784, t + 0.24);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch (e) { /* ignore */ }
  }

  /** Continuous siren + engine hum while driving. */
  updateAmbience(wanted, speed, onFoot) {
    if (!this.ctx || this.muted) return;
    try {
      if (wanted > 0 && !this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sine';
        this.sirenOsc.frequency.value = 700;
        const g = this.ctx.createGain();
        g.gain.value = 0.03;
        this.sirenOsc.connect(g);
        g.connect(this.ctx.destination);
        this.sirenOsc.start();
        this.sirenGain = g;
      }
      if (wanted === 0 && this.sirenOsc) {
        this.sirenOsc.stop();
        this.sirenOsc = null;
      }
      if (this.sirenOsc) {
        this.sirenOsc.frequency.value = 620 + 240 * Math.sin(performance.now() / 420);
      }
      if (!onFoot) {
        if (!this.engineOsc) {
          this.engineOsc = this.ctx.createOscillator();
          this.engineOsc.type = 'sawtooth';
          this.engineOsc.frequency.value = 60;
          this.engineGain = this.ctx.createGain();
          this.engineGain.gain.value = 0.04;
          const filt = this.ctx.createBiquadFilter();
          filt.type = 'lowpass';
          filt.frequency.value = 400;
          this.engineOsc.connect(filt);
          filt.connect(this.engineGain);
          this.engineGain.connect(this.ctx.destination);
          this.engineOsc.start();
        }
        this.engineOsc.frequency.value = 55 + Math.abs(speed) * 0.25;
      } else if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc = null;
      }
    } catch (e) { /* ignore */ }
  }
}
