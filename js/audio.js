/* audio.js -- synthesized sound effects (WebAudio, no files). */
(function () {
  'use strict';
  const S = { vol: 0.6 };
  let ctx = null, master = null, noiseBuf = null;
  function init() {
    if (ctx) return true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = S.vol; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  S.unlock = () => { if (init() && ctx.state === 'suspended') ctx.resume(); };
  S.setVolume = v => { S.vol = v; if (master) master.gain.value = v; };
  const now = () => ctx.currentTime;
  function env(g, t0, a, d, peak) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }
  function noise(dur, f0, f1, q, peak, type) {
    const t0 = now(), src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = ctx.createGain(); env(g, t0, 0.005, dur, peak); src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0 + dur + 0.05);
  }
  function tone(type, f0, f1, dur, peak, delay) {
    const t0 = now() + (delay || 0), o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain(); env(g, t0, 0.005, dur, peak); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const lib = {
    swing: () => noise(0.12, 3000, 900, 1.2, 0.25),
    hit: () => { noise(0.08, 2400, 600, 0.8, 0.5); tone('square', 180, 60, 0.08, 0.15); },
    heavy: () => { noise(0.22, 1600, 200, 0.7, 0.7); tone('sine', 120, 40, 0.25, 0.5); },
    fire: () => noise(0.3, 900, 300, 0.5, 0.25, 'lowpass'),
    boom: () => { noise(0.6, 900, 60, 0.6, 0.8, 'lowpass'); tone('sine', 90, 30, 0.5, 0.6); },
    ether: () => { tone('sine', 880, 1320, 0.18, 0.18); tone('triangle', 660, 990, 0.2, 0.12, 0.03); },
    ink: () => { noise(0.18, 600, 200, 1, 0.35); tone('triangle', 440, 220, 0.2, 0.12); },
    dodge: () => noise(0.18, 1200, 3800, 0.9, 0.22),
    perfect: () => { tone('sine', 1320, 1980, 0.25, 0.25); tone('sine', 1980, 2640, 0.3, 0.15, 0.04); noise(0.25, 4000, 1200, 1, 0.15); },
    flashGold: () => { tone('square', 2200, 2200, 0.05, 0.12); tone('sine', 3300, 3300, 0.12, 0.12, 0.05); },
    flashRed: () => { tone('square', 1400, 1400, 0.05, 0.14); tone('sawtooth', 900, 700, 0.12, 0.1, 0.05); },
    parry: () => { tone('square', 1800, 1700, 0.12, 0.25); tone('triangle', 2700, 2600, 0.3, 0.2); noise(0.15, 5000, 2000, 2, 0.3); },
    swap: () => { noise(0.2, 600, 4000, 0.8, 0.2); tone('sine', 500, 900, 0.12, 0.1); },
    stun: () => { tone('triangle', 900, 300, 0.4, 0.25); noise(0.3, 3000, 500, 1, 0.25); },
    chain: () => { tone('sawtooth', 300, 900, 0.25, 0.15); tone('square', 600, 1200, 0.2, 0.1, 0.1); },
    ult: () => { tone('sawtooth', 120, 600, 0.9, 0.2); noise(0.9, 400, 6000, 0.6, 0.3); },
    anomaly: () => { tone('triangle', 500, 1500, 0.3, 0.2); noise(0.3, 1500, 3000, 2, 0.15); },
    ui: () => tone('sine', 900, 1100, 0.06, 0.12),
    shot: () => { noise(0.1, 3000, 800, 1, 0.3); tone('square', 400, 120, 0.08, 0.1); },
    down: () => { noise(0.3, 800, 100, 0.6, 0.5, 'lowpass'); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.35, 0.18, i * 0.12)); },
    lose: () => { [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.45, 0.16, i * 0.2)); },
  };
  const last = {};
  S.play = (name, minGap) => {
    if (!ctx || S.vol <= 0 || !lib[name]) return;
    const t = performance.now(); if (last[name] && t - last[name] < (minGap || 40)) return; last[name] = t;
    try { lib[name](); } catch (e) { /* never let sound break the game */ }
  };
  window.SFX = S;
})();
