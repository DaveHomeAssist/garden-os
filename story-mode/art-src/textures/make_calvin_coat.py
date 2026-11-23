"""Calvin's coat textures, sampled from the owner's 3D scan of the real Calvin.

Takes two clean fur patches from the scan's colour atlas (dog-only cutout,
2048x2048): the mottled grey saddle and the white curly front. Each patch is
made seamless (offset-blend), softened a touch toward the painted yard look,
levelled so it reads in the yard lighting (no pure black/white), and written
as a 256x256 tiling WebP to assets/art/yard/.

The scan itself is not in the repo. Run:
  python3 art-src/textures/make_calvin_coat.py /path/to/dog_color.png
Deterministic for a given input.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_SHIP = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'art', 'yard'))
SIZE = 256

# (left, top, size) in the 2048 scan atlas; picked as the largest fully-covered
# squares inside the darkest saddle island and the whitest chest island;
# `band` px of each is the wrap cross-fade overhang.
PATCHES = {
    'calvin_coat_dark': {'rect': (352, 1312, 240), 'band': 40, 'mean': 0.6, 'contrast': 2.1, 'lo': 0.16, 'hi': 0.92},
    'calvin_coat_light': {'rect': (136, 1792, 208), 'band': 32, 'mean': 0.84, 'contrast': 1.4, 'lo': 0.45, 'hi': 0.95},
}


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def seamless(a, band):
    """Wrap cross-fade: the patch is `band` px larger than the tile; the first
    `band` columns/rows fade into the overhang past the tile edge, so the tile
    wraps without duplicating content (no half-period repeat)."""
    n = a.shape[0] - band
    t = np.linspace(0, 1, band, endpoint=False, dtype=np.float32)
    a = a.copy()
    a[:, :band] = a[:, :band] * t[None, :, None] + a[:, n:n + band] * (1 - t[None, :, None])
    a = a[:, :n]
    a[:band] = a[:band] * t[:, None, None] + a[n:n + band] * (1 - t[:, None, None])
    return a[:n]


def flatten(a, cutoff=1.5):
    """Remove the patch's broad light gradient (periodic FFT low-pass of
    luminance subtracted), so repeats don't show as a tile grid."""
    n = a.shape[0]
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    k = np.sqrt(np.fft.fftfreq(n)[:, None] ** 2 + np.fft.fftfreq(n)[None, :] ** 2) * n
    low = np.real(np.fft.ifft2(np.fft.fft2(lum) * np.exp(-(k / cutoff) ** 2)))
    return a - (low - lum.mean())[..., None]


def make(src, name, rect, band, mean, contrast, lo, hi):
    x, y, s = rect
    patch = src.crop((x, y, x + s, y + s)).filter(ImageFilter.MedianFilter(3))  # soften photo grain toward paint
    a = seamless(np.asarray(patch).astype(np.float32) / 255.0, band)
    a = np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS)).astype(np.float32) / 255.0
    a = flatten(a)
    # Level in sRGB around a target mean, keep the mottling, clamp to palette range.
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    m = float(lum.mean())
    a = (a - m) * contrast + mean
    # Pull chroma 30% toward neutral grey so scan colour casts don't fight the palette.
    g = (a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    a = g + (a - g) * 0.7
    a = np.clip(a, lo, hi)
    img = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    out = os.path.join(OUT_SHIP, name + '.webp')
    img.save(out, 'WEBP', quality=82, method=6)
    print(f'{name}: {SIZE}x{SIZE} {os.path.getsize(out)} bytes, mean sRGB {float((np.asarray(img)/255.0).mean()):.3f}')


def main():
    if len(sys.argv) < 2:
        sys.exit('usage: make_calvin_coat.py /path/to/dog_color.png')
    src = Image.open(sys.argv[1]).convert('RGB')
    assert src.size == (2048, 2048), src.size
    os.makedirs(OUT_SHIP, exist_ok=True)
    for name, p in PATCHES.items():
        make(src, name, **p)


if __name__ == '__main__':
    main()
