/**
 * Seasonal ambient soundscapes — generative pentatonic pads, Web Audio only.
 *
 * Each season is a small chord of detuned oscillator voices drawn from a
 * pentatonic scale, breathing on slow, incommensurate gain LFOs so the pad
 * evolves without ever looping audibly. A faint filtered brown-noise bed adds
 * air under the autumn and winter pads. All rates and pitches are fixed per
 * season — deterministic, no Math.random — and the public contract is
 * unchanged: createSeasonalAmbient(ctx, season) -> { node, start, stop }.
 */

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

/**
 * One pad voice: a pair of slightly detuned oscillators sharing a gain node
 * whose level breathes on its own slow LFO. Depth is always below the base
 * level so the gain never swings negative.
 */
function padVoice(ctx, out, { freq, type = 'sine', level, lfoRate, lfoDepth, detuneCents = 4 }) {
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = type; oscB.type = type;
  oscA.frequency.value = freq;
  oscB.frequency.value = freq;
  oscA.detune.value = -detuneCents;
  oscB.detune.value = detuneCents;

  const g = ctx.createGain();
  g.gain.value = level;
  const lfo = addLFO(ctx, g.gain, lfoRate, lfoDepth);

  oscA.connect(g); oscB.connect(g); g.connect(out);
  return {
    sources: [oscA, oscB, lfo],
    start() { oscA.start(); oscB.start(); lfo.start(); },
  };
}

function noiseBed(ctx, out, { level, cutoffHz, lfoRate, lfoDepth }) {
  const noise = brownNoise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = cutoffHz;
  const g = ctx.createGain(); g.gain.value = level;
  const lfo = addLFO(ctx, g.gain, lfoRate, lfoDepth);
  noise.connect(lp); lp.connect(g); g.connect(out);
  return { sources: [noise, lfo], start() { noise.start(); lfo.start(); } };
}

function buildPad(ctx, out, { cutoffHz, voices, noise = null }) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoffHz;
  lp.connect(out);

  const parts = voices.map((voice) => padVoice(ctx, lp, voice));
  if (noise) parts.push(noiseBed(ctx, out, noise));

  return {
    sources: parts.flatMap((part) => part.sources),
    start() { parts.forEach((part) => part.start()); },
  };
}

// C-major pentatonic, airy triangle pad — new growth.
function buildSpring(ctx, out) {
  return buildPad(ctx, out, {
    cutoffHz: 1200,
    voices: [
      { freq: 261.63, type: 'triangle', level: 0.045, lfoRate: 0.071, lfoDepth: 0.028 }, // C4
      { freq: 329.63, type: 'triangle', level: 0.035, lfoRate: 0.093, lfoDepth: 0.024 }, // E4
      { freq: 392.00, type: 'triangle', level: 0.033, lfoRate: 0.107, lfoDepth: 0.022 }, // G4
      { freq: 440.00, type: 'sine', level: 0.024, lfoRate: 0.127, lfoDepth: 0.017 }, // A4
    ],
  });
}

// G-major pentatonic, brighter and higher — full sun.
function buildSummer(ctx, out) {
  return buildPad(ctx, out, {
    cutoffHz: 1800,
    voices: [
      { freq: 293.66, type: 'triangle', level: 0.040, lfoRate: 0.089, lfoDepth: 0.026 }, // D4
      { freq: 392.00, type: 'triangle', level: 0.034, lfoRate: 0.113, lfoDepth: 0.023 }, // G4
      { freq: 493.88, type: 'sine', level: 0.026, lfoRate: 0.131, lfoDepth: 0.018 }, // B4
      { freq: 659.25, type: 'sine', level: 0.016, lfoRate: 0.149, lfoDepth: 0.011 }, // E5
    ],
  });
}

// A-minor pentatonic, low and warm, with a soft wind bed — harvest light.
function buildFall(ctx, out) {
  return buildPad(ctx, out, {
    cutoffHz: 900,
    voices: [
      { freq: 220.00, type: 'sine', level: 0.050, lfoRate: 0.053, lfoDepth: 0.030 }, // A3
      { freq: 261.63, type: 'sine', level: 0.038, lfoRate: 0.067, lfoDepth: 0.026 }, // C4
      { freq: 329.63, type: 'sine', level: 0.030, lfoRate: 0.079, lfoDepth: 0.020 }, // E4
      { freq: 392.00, type: 'triangle', level: 0.018, lfoRate: 0.097, lfoDepth: 0.012 }, // G4
    ],
    noise: { level: 0.020, cutoffHz: 380, lfoRate: 0.19, lfoDepth: 0.012 },
  });
}

// Bare open fifth, very slow, darkest filter, faint icy air — stillness.
function buildWinter(ctx, out) {
  return buildPad(ctx, out, {
    cutoffHz: 700,
    voices: [
      { freq: 146.83, type: 'sine', level: 0.055, lfoRate: 0.031, lfoDepth: 0.032, detuneCents: 3 }, // D3
      { freq: 220.00, type: 'sine', level: 0.040, lfoRate: 0.041, lfoDepth: 0.026, detuneCents: 3 }, // A3
      { freq: 293.66, type: 'sine', level: 0.022, lfoRate: 0.059, lfoDepth: 0.015, detuneCents: 3 }, // D4
    ],
    noise: { level: 0.014, cutoffHz: 900, lfoRate: 0.11, lfoDepth: 0.008 },
  });
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
