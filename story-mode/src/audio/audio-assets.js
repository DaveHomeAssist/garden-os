/** Procedural SFX — Web Audio oscillator sounds, no external files. */

function tone(ctx, dest, vol, freq, dur, type = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.01);
}

function sweep(ctx, dest, vol, f0, f1, dur, type = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(f1, ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.01);
}

function plant(ctx, dest, vol) {
  sweep(ctx, dest, vol * 0.6, 300, 500, 0.15);
}

function harvest(ctx, dest, vol) {
  tone(ctx, dest, vol * 0.5, 500, 0.08);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = 600;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.setValueAtTime(vol * 0.5, ctx.currentTime + 0.12);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  osc.connect(g); g.connect(dest);
  osc.start(ctx.currentTime + 0.12);
  osc.stop(ctx.currentTime + 0.21);
}

function water(ctx, dest, vol) {
  const bufSize = ctx.sampleRate * 0.2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  src.connect(lp); lp.connect(g); g.connect(dest);
  src.start(); src.stop(ctx.currentTime + 0.21);
}

function footstep(ctx, dest, vol) { tone(ctx, dest, vol * 0.4, 80, 0.05); }
function uiClick(ctx, dest, vol) { tone(ctx, dest, vol * 0.5, 800, 0.03); }
function uiTab(ctx, dest, vol) { tone(ctx, dest, vol * 0.4, 600, 0.04); }
function toolSwitch(ctx, dest, vol) { tone(ctx, dest, vol * 0.45, 1200, 0.1, 'triangle'); }
function eventGood(ctx, dest, vol) { sweep(ctx, dest, vol * 0.5, 350, 550, 0.2); }
function eventBad(ctx, dest, vol) { sweep(ctx, dest, vol * 0.5, 400, 200, 0.2, 'sawtooth'); }

function questAccept(ctx, dest, vol) {
  [400, 500, 600].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.08;
    osc.frequency.value = f;
    g.gain.setValueAtTime(vol * 0.45, t);
    g.gain.linearRampToValueAtTime(0, t + 0.08);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + 0.09);
  });
}

function questComplete(ctx, dest, vol) {
  [500, 600, 750].forEach((f) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = f;
    g.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(g); g.connect(dest);
    osc.start(); osc.stop(ctx.currentTime + 0.31);
  });
}

function levelUp(ctx, dest, vol) {
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
  lfo.frequency.value = 12; lfoG.gain.value = vol * 0.15;
  lfo.connect(lfoG); lfoG.connect(g.gain);
  g.gain.setValueAtTime(vol * 0.45, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  osc.connect(g); g.connect(dest);
  osc.start(); lfo.start();
  osc.stop(ctx.currentTime + 0.41); lfo.stop(ctx.currentTime + 0.41);
}

const SOUNDS = [
  ['plant', plant, 0.3, 0], ['harvest', harvest, 0.35, 0],
  ['water', water, 0.25, 0], ['footstep', footstep, 0.08, 60],
  ['ui_click', uiClick, 0.1, 0], ['ui_tab', uiTab, 0.12, 0],
  ['tool_switch', toolSwitch, 0.15, 0], ['quest_accept', questAccept, 0.3, 0],
  ['quest_complete', questComplete, 0.4, 0], ['event_good', eventGood, 0.3, 0],
  ['event_bad', eventBad, 0.3, 0], ['level_up', levelUp, 0.4, 0],
];

export function registerProceduralSFX(audioManager) {
  for (const [id, fn, volume, cooldownMs] of SOUNDS) {
    audioManager.registerProceduralSound(id, fn, { volume, cooldownMs });
  }
}
