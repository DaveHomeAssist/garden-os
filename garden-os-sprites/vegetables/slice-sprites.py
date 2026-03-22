#!/usr/bin/env python3
"""
Slice & background-remove sprite sheets for Garden OS.

Usage:
  python3 slice-sprites.py

Requires: pip install Pillow rembg onnxruntime
"""

from pathlib import Path
from PIL import Image

try:
    from rembg import remove as remove_bg
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False
    print("⚠ rembg not installed — skipping background removal (pip install rembg onnxruntime)")

SPRITE_DIR = Path(__file__).parent
TEXTURE_DIR = SPRITE_DIR.parents[1] / "story-mode" / "assets" / "textures"

# ── Crop sheet: 3x2 grid ────────────────────────────────────────────────────

CROP_SHEET_SRC = SPRITE_DIR / "9ecf76d2-f13e-490d-8c3f-8eb66bac13f8.jpg"
CROP_NAMES = ["lettuce", "spinach", "arugula", "radish", "basil", "marigold"]
CROP_GRID = (3, 2)  # cols, rows

# ── Growth master: 6x4 grid ─────────────────────────────────────────────────

GROWTH_SHEET_SRC = SPRITE_DIR / "599288aa-23fd-404c-aded-93c8b176d312.jpg"
GROWTH_CROPS = ["lettuce", "spinach", "arugula", "radish", "basil", "marigold"]
GROWTH_STAGES = ["seed", "sprout", "growing", "harvest"]
GROWTH_GRID = (6, 4)  # cols, rows


def slice_grid(img, cols, rows):
    """Slice an image into a grid of cells, returns list of (col, row, cell_img)."""
    w, h = img.size
    cw, ch = w // cols, h // rows
    cells = []
    for r in range(rows):
        for c in range(cols):
            box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
            cells.append((c, r, img.crop(box)))
    return cells, cw, ch


def process_cell(cell_img, target_size=256):
    """Remove background and resize to target."""
    # Convert to RGBA
    cell_rgba = cell_img.convert("RGBA")

    # Background removal
    if HAS_REMBG:
        from io import BytesIO
        buf_in = BytesIO()
        cell_rgba.save(buf_in, format="PNG")
        buf_in.seek(0)
        buf_out = remove_bg(buf_in.read())
        cell_rgba = Image.open(BytesIO(buf_out)).convert("RGBA")

    # Resize to target
    cell_rgba = cell_rgba.resize((target_size, target_size), Image.LANCZOS)
    return cell_rgba


def process_crop_sheet():
    """Slice 3x2 crop sheet into individual crop icons."""
    if not CROP_SHEET_SRC.exists():
        print(f"✗ Crop sheet not found: {CROP_SHEET_SRC.name}")
        return

    print(f"\n── Crop Sheet: {CROP_SHEET_SRC.name} ──")
    img = Image.open(CROP_SHEET_SRC)
    cols, rows = CROP_GRID
    cells, cw, ch = slice_grid(img, cols, rows)

    for c, r, cell_img in cells:
        idx = r * cols + c
        if idx >= len(CROP_NAMES):
            continue
        name = CROP_NAMES[idx]
        out_path = TEXTURE_DIR / f"crop-{name}.png"

        print(f"  [{idx}] crop-{name} (col={c}, row={r}) → {out_path.name} ... ", end="", flush=True)
        processed = process_cell(cell_img)
        processed.save(out_path, "PNG")
        print("✓")

    # Also build the composite crop-sheet.png (3x2 → keep as 6-across for now)
    print(f"  Building crop-sheet.png (1536x512, 3x2) ... ", end="", flush=True)
    sheet = Image.new("RGBA", (256 * 3, 256 * 2), (0, 0, 0, 0))
    for c, r, cell_img in cells:
        idx = r * cols + c
        if idx >= len(CROP_NAMES):
            continue
        name = CROP_NAMES[idx]
        icon = Image.open(TEXTURE_DIR / f"crop-{name}.png")
        sheet.paste(icon, (c * 256, r * 256))
    sheet.save(TEXTURE_DIR / "crop-sheet.png", "PNG")
    print("✓")


def process_growth_master():
    """Slice 6x4 growth master into individual growth sheets."""
    if not GROWTH_SHEET_SRC.exists():
        print(f"✗ Growth master not found: {GROWTH_SHEET_SRC.name}")
        return

    print(f"\n── Growth Master: {GROWTH_SHEET_SRC.name} ──")
    img = Image.open(GROWTH_SHEET_SRC)
    cols, rows = GROWTH_GRID
    cells, cw, ch = slice_grid(img, cols, rows)

    # Process all cells first
    processed = {}
    for c, r, cell_img in cells:
        if c >= len(GROWTH_CROPS) or r >= len(GROWTH_STAGES):
            continue
        crop = GROWTH_CROPS[c]
        stage = GROWTH_STAGES[r]
        key = (crop, stage)
        print(f"  {crop}/{stage} (col={c}, row={r}) ... ", end="", flush=True)
        processed[key] = process_cell(cell_img)
        print("✓")

    # Build per-crop growth sheets (4 frames horizontal, 1024x256)
    print()
    for ci, crop in enumerate(GROWTH_CROPS):
        out_path = TEXTURE_DIR / f"grow-{crop}.png"
        print(f"  Building grow-{crop}.png (1024x256) ... ", end="", flush=True)
        strip = Image.new("RGBA", (256 * 4, 256), (0, 0, 0, 0))
        for si, stage in enumerate(GROWTH_STAGES):
            key = (crop, stage)
            if key in processed:
                strip.paste(processed[key], (si * 256, 0))
        strip.save(out_path, "PNG")
        print("✓")

    # Also save the full grow-master.png (6x4 grid)
    print(f"  Building grow-master.png (1536x1024) ... ", end="", flush=True)
    master = Image.new("RGBA", (256 * 6, 256 * 4), (0, 0, 0, 0))
    for (crop, stage), cell in processed.items():
        ci = GROWTH_CROPS.index(crop)
        si = GROWTH_STAGES.index(stage)
        master.paste(cell, (ci * 256, si * 256))
    master.save(TEXTURE_DIR / "grow-master.png", "PNG")
    print("✓")


if __name__ == "__main__":
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {TEXTURE_DIR}")

    process_crop_sheet()
    process_growth_master()

    print("\n✓ Done. Drop into scene and test.")
