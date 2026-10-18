"""Painted, tileable ground/wood/soil textures for the Garden OS yard art pass.

Deterministic (fixed seeds). Writes lossless PNG masters to art-src/textures/out
and the shipped WebP copies to assets/art/yard/. Run:
  python3 art-src/textures/make_textures.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_MASTER = os.path.join(HERE, 'out')
OUT_SHIP = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'art', 'yard'))
os.makedirs(OUT_MASTER, exist_ok=True)
os.makedirs(OUT_SHIP, exist_ok=True)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def periodic_noise(size, scale, rng, aniso=(1.0, 1.0)):
    """Tileable band-limited noise in [0,1] via FFT filtering of white noise."""
    w = rng.standard_normal((size, size)).astype(np.float32)
    f = np.fft.fft2(w)
    ky = np.fft.fftfreq(size)[:, None] * aniso[1]
    kx = np.fft.fftfreq(size)[None, :] * aniso[0]
    k = np.sqrt(kx * kx + ky * ky)
    filt = np.exp(-(k * size / scale) ** 2)
    n = np.real(np.fft.ifft2(f * filt))
    n = (n - n.min()) / (n.max() - n.min() + 1e-6)
    return n


def dabs(img, rng, count, colors, size_px, alpha, elong=2.0, angle=None, angle_jitter=0.6, weights=None):
    """Paint soft elliptical brush dabs with wraparound so the tile stays seamless."""
    H, W, _ = img.shape
    colors = [hexrgb(c) if isinstance(c, str) else c for c in colors]
    r = int(size_px * elong) + 2
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32)
    for _ in range(count):
        cx, cy = rng.integers(0, W), rng.integers(0, H)
        a = (angle if angle is not None else rng.uniform(0, np.pi)) + rng.normal(0, angle_jitter)
        s = size_px * rng.uniform(0.6, 1.3)
        ca, sa = np.cos(a), np.sin(a)
        u = (xx * ca + yy * sa) / (s * elong)
        v = (-xx * sa + yy * ca) / s
        d = u * u + v * v
        m = np.clip(1.0 - d, 0, 1) ** 1.5 * alpha * rng.uniform(0.6, 1.0)
        col = colors[rng.choice(len(colors), p=weights)] * rng.uniform(0.92, 1.08)
        ys = (np.arange(cy - r, cy + r + 1) % H)
        xs = (np.arange(cx - r, cx + r + 1) % W)
        patch = img[np.ix_(ys, xs)]
        patch += (col[None, None, :] - patch) * m[:, :, None]
        img[np.ix_(ys, xs)] = patch
    return img


def lerp_palette(t, stops):
    """t in [0,1] -> color from list of (pos, hex)."""
    out = np.zeros(t.shape + (3,), dtype=np.float32)
    pos = [p for p, _ in stops]
    cols = [hexrgb(c) for _, c in stops]
    for i in range(3):
        out[..., i] = np.interp(t, pos, [c[i] for c in cols])
    return out


def save(img, name, quality=82):
    arr = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
    im = Image.fromarray(arr)
    im.save(os.path.join(OUT_MASTER, name + '.png'))
    im.save(os.path.join(OUT_SHIP, name + '.webp'), 'WEBP', quality=quality, method=6)
    print('wrote', name, os.path.getsize(os.path.join(OUT_SHIP, name + '.webp')), 'bytes')


S = 512

# ---- Grass: painterly greens, short directional strokes, warm tips ----------
rng = np.random.default_rng(11)
n1 = periodic_noise(S, 6, rng)
n2 = periodic_noise(S, 22, rng)
grass = lerp_palette(np.clip(n1 * 0.7 + n2 * 0.3, 0, 1), [(0, '#46702f'), (0.45, '#628c3e'), (0.8, '#7ea04c'), (1, '#98b25a')])
grass = dabs(grass, rng, 3200, ['#557f37', '#729a46', '#8fb058', '#3f6a2c', '#a6ba62'], 3.0, 0.7, elong=3.0, angle=np.pi / 2, angle_jitter=0.5,
             weights=[0.28, 0.28, 0.16, 0.2, 0.08])
grass = dabs(grass, rng, 700, ['#b4bd6a', '#c7c47a', '#2f5524'], 2.0, 0.6, elong=2.5, angle=np.pi / 2, angle_jitter=0.6)
save(grass, 'grass')

# ---- Dirt / worn earth: warm browns, pebbles -------------------------------
rng = np.random.default_rng(23)
n1 = periodic_noise(S, 8, rng)
n2 = periodic_noise(S, 40, rng)
dirt = lerp_palette(np.clip(n1 * 0.6 + n2 * 0.4, 0, 1), [(0, '#7d5a3a'), (0.5, '#9c7650'), (1, '#b89068')])
dirt = dabs(dirt, rng, 2200, ['#8a6644', '#a8825a', '#c29c72', '#6e4f33'], 3.5, 0.65, elong=1.6)
dirt = dabs(dirt, rng, 260, ['#d2bfa0', '#bfae94', '#8f8574'], 1.4, 0.85, elong=1.2)  # pebbles
save(dirt, 'dirt')

# ---- Packed path: lighter sandy earth with soft flagstone-like patches -----
rng = np.random.default_rng(37)
n1 = periodic_noise(S, 5, rng)
n2 = periodic_noise(S, 26, rng)
path = lerp_palette(np.clip(n1 * 0.55 + n2 * 0.45, 0, 1), [(0, '#a8875f'), (0.5, '#c4a57c'), (1, '#dcc29a')])
path = dabs(path, rng, 140, ['#d6bf98', '#cdb38a', '#e2cca6'], 18, 0.35, elong=1.3)
path = dabs(path, rng, 1400, ['#b5966c', '#9d7f5a', '#d4ba92'], 2.4, 0.45, elong=1.8)
path = dabs(path, rng, 200, ['#e6d6b8', '#8f7a60'], 1.2, 0.8, elong=1.1)
save(path, 'path')

# ---- Cedar boards: horizontal grain, knots, plank seams (tiles in U) --------
rng = np.random.default_rng(51)
gy = periodic_noise(S, 70, rng, aniso=(14.0, 1.0))  # long streaks along X
fine = periodic_noise(S, 160, rng, aniso=(10.0, 1.0))
t = np.clip(gy * 0.75 + fine * 0.25, 0, 1)
wood = lerp_palette(t, [(0, '#6e4426'), (0.35, '#8e5c34'), (0.7, '#a8723f'), (1, '#c08a55')])
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
# knots
for _ in range(7):
    kx, ky = rng.uniform(0, S), rng.uniform(0, S)
    for ox in (-S, 0, S):
        for oy in (-S, 0, S):
            d = np.sqrt(((xx - kx - ox) / 2.2) ** 2 + (yy - ky - oy) ** 2)
            ring = (np.sin(d * 0.9) * 0.5 + 0.5) * np.exp(-d / 9)
            wood *= (1 - 0.35 * ring)[:, :, None]
# two plank seams per tile (V direction), soft dark line + light top edge
for sy in (0, S // 2):
    for dy, k in ((0, 0.45), (1, 0.6), (2, 0.85), (3, 1.12)):
        wood[(sy + dy) % S] *= k
wood = dabs(wood, rng, 500, ['#b88550', '#7a4c2a', '#9a8a74'], 2.0, 0.25, elong=6.0, angle=0.0, angle_jitter=0.05)
save(wood, 'wood')

# ---- Bed soil: rich dark loam, crumbs and small clods ----------------------
rng = np.random.default_rng(67)
n1 = periodic_noise(S, 10, rng)
n2 = periodic_noise(S, 48, rng)
soil = lerp_palette(np.clip(n1 * 0.5 + n2 * 0.5, 0, 1), [(0, '#4a3220'), (0.5, '#6a4a30'), (1, '#86613f')])
soil = dabs(soil, rng, 2200, ['#553a24', '#7a5638', '#90694a', '#3e2a1a'], 2.4, 0.6, elong=1.3)
soil = dabs(soil, rng, 300, ['#a07a54', '#b08a62'], 1.3, 0.7, elong=1.1)
save(soil, 'soil')
