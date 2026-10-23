/**
 * Bed focus — fit the garden bed into the part of the canvas a sheet leaves
 * uncovered, using PerspectiveCamera.setViewOffset (pure math, no THREE).
 *
 * setViewOffset(fullWidth, fullHeight, x, y, width, height) renders the
 * sub-rectangle (x, y, width, height) of the un-offset view across the whole
 * canvas. A screen pixel then shows virtual pixel `x + sx * (width / fullWidth)`,
 * so a window larger than the canvas zooms out and x/y pan the picture.
 */

const MAX_ZOOM_OUT = 2.6;

/**
 * @param {object} p
 * @param {number} p.width  canvas CSS width
 * @param {number} p.height canvas CSS height
 * @param {{minX:number,minY:number,maxX:number,maxY:number}} p.bounds bed bounds in un-offset screen px
 * @param {{left?:number,top?:number,right?:number,bottom?:number}} p.insets covered px from each edge
 * @param {number} [p.padding] fraction of the free area kept clear around the bed
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function computeBedFocusView({ width, height, bounds, insets = {}, padding = 0.08 }) {
  if (!(width > 0) || !(height > 0) || !bounds) return null;
  const { minX, minY, maxX, maxY } = bounds;
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;

  const left = Math.max(0, insets.left ?? 0);
  const top = Math.max(0, insets.top ?? 0);
  const right = Math.max(0, insets.right ?? 0);
  const bottom = Math.max(0, insets.bottom ?? 0);
  const freeW = width - left - right;
  const freeH = height - top - bottom;
  if (freeW < 40 || freeH < 40) return null;

  const pad = Math.min(freeW, freeH) * padding;
  const fitW = Math.max(1, freeW - pad * 2);
  const fitH = Math.max(1, freeH - pad * 2);
  const bedW = Math.max(1, maxX - minX);
  const bedH = Math.max(1, maxY - minY);
  // Only ever zoom out (>= 1) so opening a sheet never pushes the camera in.
  const zoom = Math.min(MAX_ZOOM_OUT, Math.max(1, bedW / fitW, bedH / fitH));

  const bedCX = (minX + maxX) / 2;
  const bedCY = (minY + maxY) / 2;
  const freeCX = left + freeW / 2;
  const freeCY = top + freeH / 2;
  return {
    x: bedCX - freeCX * zoom,
    y: bedCY - freeCY * zoom,
    width: width * zoom,
    height: height * zoom,
  };
}

/** Blend from the plain view (t = 0) to `view` (t = 1). */
export function lerpBedFocusView(view, t, width, height) {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: view.x * k + 0,
    y: view.y * k + 0,
    width: width + (view.width - width) * k,
    height: height + (view.height - height) * k,
  };
}

/** Where a virtual (un-offset) screen point lands on the canvas under `view`. */
export function projectThroughView(point, view, width) {
  const scale = view.width / width;
  return { x: (point.x - view.x) / scale, y: (point.y - view.y) / scale };
}

/**
 * Which canvas edge a sheet covers, from its rect and the canvas rect (both
 * client px). Side sheets (desktop) cover the right; bottom sheets (phones)
 * cover the bottom. Returns insets or null when the sheet covers neither.
 */
export function getSheetInsets(sheetRect, canvasRect) {
  if (!sheetRect || !canvasRect || !(canvasRect.width > 0) || !(canvasRect.height > 0)) return null;
  if (!(sheetRect.width > 0) || !(sheetRect.height > 0)) return null;
  const leftGap = sheetRect.left - canvasRect.left;
  const topGap = sheetRect.top - canvasRect.top;
  if (leftGap > canvasRect.width * 0.3 && sheetRect.height > canvasRect.height * 0.5) {
    return { right: Math.max(0, canvasRect.right - sheetRect.left) };
  }
  if (topGap > canvasRect.height * 0.12 && sheetRect.width > canvasRect.width * 0.5) {
    return { bottom: Math.max(0, canvasRect.bottom - sheetRect.top) };
  }
  return null;
}
