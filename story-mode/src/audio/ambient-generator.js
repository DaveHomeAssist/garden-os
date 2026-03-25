/** Seasonal ambient soundscapes — procedural Web Audio nodes. */

function whiteNoise(ctx) {
  const bufSize = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

function brownNoise(ctx) {
  const bufSize = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufSize; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

function addLFO(ctx, target, freq, amount) {
  const lfo = ctx.createOscillator();
  const g = ctx.createGain();
  lfo.frequency.value = freq;
  g.gain.value = amount;
  lfo.connect(g); g.connect(target);
  return lfo;
}

function buildSpring(ctx, out) {
  const noise = brownNoise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 600;
  const g = ctx.createGain(); g.gain.value = 0.18;
  const lfo = addLFO(ctx, g.gain, 3, 0.06);
  noise.connect(lp); lp.connect(g); g.connect(out);
  return { sources: [noise, lfo], start() { noise.start(); lfo.start(); } };
}

function buildSummer(ctx, out) {
  const noise = whiteNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 5;
  const g = ctx.createGain(); g.gain.value = 0.06;
  const lfo = addLFO(ctx, g.gain, 8, 0.03);
  noise.connect(bp); bp.connect(g); g.connect(out);
  return { sources: [noise, lfo], start() { noise.start(); lfo.start(); } };
}

function buildFall(ctx, out) {
  const noise = whiteNoise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 400;
  const g = ctx.createGain(); g.gain.value = 0.14;
  const lfo = addLFO(ctx, g.gain, 0.3, 0.05);
  noise.connect(lp); lp.connect(g); g.connect(out);
  return { sources: [noise, lfo], start() { noise.start(); lfo.start(); } };
}

function buildWinter(ctx, out) {
  const osc = ctx.createOscillator();
  osc.frequency.value = 2400;
  const g = ctx.createGain(); g.gain.value = 0;
  const lfo = ctx.createOscillator();
  lfo.type = 'square'; lfo.frequency.value = 0.5;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.03;
  lfo.connect(lfoG); lfoG.connect(g.gain);
  osc.connect(g); g.connect(out);
  return { sources: [osc, lfo], start() { osc.start(); lfo.start(); } };
}

const BUILDERS = { spring: buildSpring, summer: buildSummer, fall: buildFall, winter: buildWinter };

/**
 * @param {AudioContext} audioContext
 * @param {string} season — 'spring' | 'summer' | 'fall' | 'winter'
 * @returns {{ node: GainNode, start: () => void, stop: () => void }}
 */
export function createSeasonalAmbient(audioContext, season) {
  const master = audioContext.createGain();
  master.gain.value = 1;
  const internals = (BUILDERS[season] ?? BUILDERS.spring)(audioContext, master);
  let started = false;
  return {
    node: master,
    start() {
      if (started) return;
      started = true;
      internals.start();
    },
    stop() {
      internals.sources.forEach((s) => { try { s.stop(); } catch (_) { /* ok */ } });
      master.disconnect();
    },
  };
}
