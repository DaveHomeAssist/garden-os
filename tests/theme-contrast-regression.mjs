import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../garden-os-theme.css', import.meta.url), 'utf8');
const tokens = new Map([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2]]));

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function ratio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function requireAa(foreground, background, label) {
  const value = ratio(foreground, background);
  assert(value >= 4.5, `${label} contrast ${value.toFixed(2)} is below WCAG AA 4.5:1`);
  return Number(value.toFixed(2));
}

const panel = tokens.get('panel');
const white = '#ffffff';
const results = {};
for (const name of ['text', 'text-mid', 'text-soft', 'text-muted', 'cedar', 'warn', 'bad', 'info', 'accent-rain']) {
  results[`${name}-on-panel`] = requireAa(tokens.get(name), panel, `${name} on panel`);
}
for (const name of ['leaf', 'leaf-bright', 'leaf-light', 'rust', 'rust-light', 'warn', 'bad', 'info']) {
  results[`white-on-${name}`] = requireAa(white, tokens.get(name), `white on ${name}`);
}
results['text-on-sun-bright'] = requireAa(tokens.get('text'), tokens.get('sun-bright'), 'text on sun-bright');

console.log(JSON.stringify({ ok: true, ratios: results }, null, 2));
