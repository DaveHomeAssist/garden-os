import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../garden-os-theme.css', import.meta.url), 'utf8');

function readTokens(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))?.[1] ?? '';
  return new Map([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2]]));
}

const lightTokens = readTokens(':root');
const darkTokens = readTokens('html[data-theme="dark"]');

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

const white = '#ffffff';
const results = {};
const panel = lightTokens.get('panel');
for (const name of ['text', 'text-mid', 'text-soft', 'text-muted', 'cedar', 'warn', 'bad', 'info', 'accent-rain']) {
  results[`light-${name}-on-panel`] = requireAa(lightTokens.get(name), panel, `${name} on light panel`);
}
for (const name of ['leaf', 'leaf-bright', 'leaf-light', 'rust', 'rust-light', 'warn', 'bad', 'info']) {
  results[`light-white-on-${name}`] = requireAa(white, lightTokens.get(name), `white on light ${name}`);
}
results['light-text-on-sun-bright'] = requireAa(lightTokens.get('text'), lightTokens.get('sun-bright'), 'light text on sun-bright');

const darkPanel = darkTokens.get('panel');
for (const name of ['text', 'text-mid', 'text-soft', 'text-muted', 'leaf', 'cedar', 'warn', 'bad', 'info', 'accent-rain']) {
  results[`dark-${name}-on-panel`] = requireAa(darkTokens.get(name), darkPanel, `${name} on dark panel`);
}
results['dark-white-on-leaf-bright'] = requireAa(white, darkTokens.get('leaf-bright'), 'white on dark-theme primary action');

console.log(JSON.stringify({ ok: true, ratios: results }, null, 2));
