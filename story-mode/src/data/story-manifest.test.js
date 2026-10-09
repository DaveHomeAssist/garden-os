import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const storyRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const publicDir = resolve(storyRoot, 'public');

describe('Story Mode web manifest', () => {
  const html = readFileSync(resolve(storyRoot, 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(resolve(publicDir, 'manifest.webmanifest'), 'utf8'));

  it('links the unhashed public manifest so relative icon paths resolve under the story-mode base', () => {
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/);
  });

  it('only references icons that ship in story-mode/public', () => {
    const srcs = [
      ...manifest.icons.map((icon) => icon.src),
      ...manifest.shortcuts.flatMap((shortcut) => shortcut.icons.map((icon) => icon.src)),
    ];
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src.startsWith('/')).toBe(false);
      expect(existsSync(resolve(publicDir, src)), `${src} missing from story-mode/public`).toBe(true);
    }
  });
});
