// Solara City — synthetic sound with WebAudio, no audio files.
//
// Every effect is an oscillator or a filtered noise burst built on the fly.
// The context is created on the first user gesture (or the first call that
// has one); headless screenshot runs never gesture, so everything here is
// a no-op when there is no context.

SC.audio = {
  ctx: null,
  muted: false,
  disabled: false,
  engineOsc: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenLfo: null,
};

SC.audio.ensure = () => {
  const a = SC.audio;
  if (a.ctx || a.disabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      a.disabled = true;
      return;
    }
    a.ctx = new AC();
  } catch {
    a.disabled = true;
  }
};

SC.audio.toggleMute = () => {
  SC.audio.muted = !SC.audio.muted;
  return SC.audio.muted;
};

// One short tone: frequency slide from f0 to f1 over `dur` seconds.
SC.audio.tone = (f0, f1, dur, type, vol, when) => {
  const a = SC.audio;
  if (!a.ctx || a.muted || a.disabled) return;
  try {
    const t = a.ctx.currentTime + (when || 0);
    const osc = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(a.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* sound is decoration; never break the game */
  }
};

// A burst of white noise through a lowpass filter (shots, thuds, crashes).
SC.audio.noise = (dur, vol, freq) => {
  const a = SC.audio;
  if (!a.ctx || a.muted || a.disabled) return;
  try {
    const t = a.ctx.currentTime;
    const len = Math.max(1, Math.floor(a.ctx.sampleRate * dur));
    const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    const f = a.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq || 1200;
    const g = a.ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f).connect(g).connect(a.ctx.destination);
    src.start(t);
  } catch {
    /* ignore */
  }
};

SC.audio.shoot = () => {
  SC.audio.noise(0.09, 0.25, 3000);
  SC.audio.tone(900, 180, 0.08, 'square', 0.1);
};
SC.audio.punch = () => SC.audio.noise(0.08, 0.2, 500);
SC.audio.pickup = () => {
  SC.audio.tone(660, 660, 0.07, 'sine', 0.15);
  SC.audio.tone(990, 990, 0.1, 'sine', 0.15, 0.07);
};
SC.audio.crash = () => SC.audio.noise(0.25, 0.3, 700);
SC.audio.busted = () => {
  SC.audio.tone(392, 392, 0.18, 'triangle', 0.2);
  SC.audio.tone(311, 311, 0.3, 'triangle', 0.2, 0.18);
};
SC.audio.missionDone = () => {
  [523, 659, 784, 1047].forEach((f, i) => SC.audio.tone(f, f, 0.12, 'triangle', 0.16, i * 0.09));
};
SC.audio.missionStart = () => {
  SC.audio.tone(440, 440, 0.1, 'triangle', 0.14);
  SC.audio.tone(587, 587, 0.14, 'triangle', 0.14, 0.1);
};

// Engine hum while driving: pitch follows speed.
SC.audio.engineStart = () => {
  const a = SC.audio;
  if (!a.ctx || a.muted || a.disabled || a.engineOsc) return;
  try {
    a.engineOsc = a.ctx.createOscillator();
    a.engineOsc.type = 'sawtooth';
    a.engineOsc.frequency.value = 55;
    const f = a.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    a.engineGain = a.ctx.createGain();
    a.engineGain.gain.value = 0.05;
    a.engineOsc.connect(f).connect(a.engineGain).connect(a.ctx.destination);
    a.engineOsc.start();
  } catch {
    /* ignore */
  }
};

SC.audio.engineSet = (speedFrac) => {
  const a = SC.audio;
  if (!a.engineOsc || !a.ctx) return;
  try {
    a.engineOsc.frequency.setTargetAtTime(55 + speedFrac * 130, a.ctx.currentTime, 0.05);
    a.engineGain.gain.setTargetAtTime(0.03 + speedFrac * 0.05, a.ctx.currentTime, 0.05);
  } catch {
    /* ignore */
  }
};

SC.audio.engineStop = () => {
  const a = SC.audio;
  if (!a.engineOsc) return;
  try {
    a.engineOsc.stop();
  } catch {
    /* ignore */
  }
  a.engineOsc = null;
  a.engineGain = null;
};

// Two-tone siren while the player is wanted.
SC.audio.sirenStart = () => {
  const a = SC.audio;
  if (!a.ctx || a.muted || a.disabled || a.sirenOsc) return;
  try {
    a.sirenOsc = a.ctx.createOscillator();
    a.sirenOsc.type = 'triangle';
    a.sirenOsc.frequency.value = 750;
    a.sirenLfo = a.ctx.createOscillator();
    a.sirenLfo.type = 'square';
    a.sirenLfo.frequency.value = 1.4;
    const lfoGain = a.ctx.createGain();
    lfoGain.gain.value = 220;
    a.sirenLfo.connect(lfoGain).connect(a.sirenOsc.frequency);
    a.sirenGain = a.ctx.createGain();
    a.sirenGain.gain.value = 0.035;
    a.sirenOsc.connect(a.sirenGain).connect(a.ctx.destination);
    a.sirenOsc.start();
    a.sirenLfo.start();
  } catch {
    /* ignore */
  }
};

SC.audio.sirenStop = () => {
  const a = SC.audio;
  if (!a.sirenOsc) return;
  try {
    a.sirenOsc.stop();
    a.sirenLfo.stop();
  } catch {
    /* ignore */
  }
  a.sirenOsc = null;
  a.sirenLfo = null;
  a.sirenGain = null;
};
