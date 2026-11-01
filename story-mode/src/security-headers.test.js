// fix/security-headers-deps: CSP / referrer meta on the shipped pages, SRI on
// third-party scripts, and Vercel response headers that keep the
// mixmash.games embed working.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');
const cspOf = (html) => html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
const directives = (csp) => Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));

describe('security headers', () => {
  it('story mode CSP locks plugins, frames and manifest to safe values and keeps the game sources', () => {
    const html = read('../index.html');
    const d = directives(cspOf(html));
    expect(d['object-src']).toEqual(["'none'"]);
    expect(d['frame-src']).toEqual(["'none'"]);
    expect(d['base-uri']).toEqual(["'self'"]);
    expect(d['manifest-src']).toEqual(["'self'"]);
    expect(d['script-src']).not.toContain("'unsafe-inline'");
    expect(d['script-src']).not.toContain("'unsafe-eval'");
    expect(d['connect-src']).toContain('https://garden-os-theta.vercel.app');
    expect(d['worker-src']).toContain('blob:');
    expect(d['media-src']).toEqual(expect.arrayContaining(["'self'"]));
    // frame-ancestors is ignored in a meta CSP; it must never be added here.
    expect(d['frame-ancestors']).toBeUndefined();
    expect(html).toMatch(/<meta name="referrer" content="strict-origin-when-cross-origin"/);
  });

  it('privacy note has a no-script CSP', () => {
    const d = directives(cspOf(read('../public/privacy.html')));
    expect(d['default-src']).toEqual(["'none'"]);
    expect(d['script-src']).toBeUndefined();
  });

  it('every third-party script tag carries SRI', () => {
    const html = read('../../system-topology.html');
    const tags = html.match(/<script[^>]+src="https?:\/\/[^"]+"[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag).toMatch(/integrity="sha(384|512)-[A-Za-z0-9+/=]+"/);
      expect(tag).toMatch(/crossorigin="anonymous"/);
    }
  });

  it('Vercel headers allow the mixmash.games frame and add nosniff', () => {
    const cfg = JSON.parse(read('../../vercel.json'));
    const all = cfg.headers.find((h) => h.source === '/(.*)').headers;
    const get = (k) => all.find((h) => h.key === k)?.value;
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('Content-Security-Policy')).toMatch(/frame-ancestors 'self' https:\/\/mixmash\.games https:\/\/\*\.mixmash\.games/);
    expect(get('X-Frame-Options')).toBeUndefined();
    expect(cfg.functions['api/**/*.mjs'].maxDuration).toBe(10);
  });
});
