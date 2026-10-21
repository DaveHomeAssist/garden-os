import { describe, expect, it } from 'vitest';
import { computeBedFocusView, getSheetInsets, lerpBedFocusView, projectThroughView } from './bed-focus.js';

const W = 1280;
const H = 800;

describe('bed focus view', () => {
  it('centres the bed in the area left of a right-hand sheet', () => {
    const bounds = { minX: 300, minY: 300, maxX: 1000, maxY: 520 };
    const view = computeBedFocusView({ width: W, height: H, bounds, insets: { right: 340 } });
    const a = projectThroughView({ x: bounds.minX, y: bounds.minY }, view, W);
    const b = projectThroughView({ x: bounds.maxX, y: bounds.maxY }, view, W);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(b.x).toBeLessThanOrEqual(W - 340);
    expect((a.x + b.x) / 2).toBeCloseTo((W - 340) / 2, 3);
    expect((a.y + b.y) / 2).toBeCloseTo(H / 2, 3);
  });

  it('zooms out (never in) when the bed is wider than the free area', () => {
    const bounds = { minX: 100, minY: 200, maxX: 1180, maxY: 600 };
    const view = computeBedFocusView({ width: W, height: H, bounds, insets: { right: 600 } });
    expect(view.width).toBeGreaterThan(W);
    const a = projectThroughView({ x: bounds.minX, y: 0 }, view, W);
    const b = projectThroughView({ x: bounds.maxX, y: 0 }, view, W);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(b.x).toBeLessThanOrEqual(W - 600 + 0.001);

    const small = computeBedFocusView({ width: W, height: H, bounds: { minX: 600, minY: 380, maxX: 700, maxY: 420 }, insets: { right: 300 } });
    expect(small.width).toBe(W);
  });

  it('fits above a bottom sheet on a phone', () => {
    const bounds = { minX: 20, minY: 300, maxX: 370, maxY: 520 };
    const view = computeBedFocusView({ width: 390, height: 844, bounds, insets: { top: 60, bottom: 574 } });
    const a = projectThroughView({ x: bounds.minX, y: bounds.minY }, view, 390);
    const b = projectThroughView({ x: bounds.maxX, y: bounds.maxY }, view, 390);
    expect(a.y).toBeGreaterThanOrEqual(60);
    expect(b.y).toBeLessThanOrEqual(844 - 574);
  });

  it('returns null when nothing usable is left', () => {
    expect(computeBedFocusView({ width: W, height: H, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, insets: { right: W } })).toBeNull();
    expect(computeBedFocusView({ width: W, height: H, bounds: null })).toBeNull();
  });

  it('lerps from the plain view', () => {
    const view = { x: 200, y: -40, width: 1600, height: 1000 };
    expect(lerpBedFocusView(view, 0, W, H)).toEqual({ x: 0, y: 0, width: W, height: H });
    expect(lerpBedFocusView(view, 1, W, H)).toEqual(view);
  });
});

describe('sheet insets', () => {
  const canvas = { left: 0, top: 0, right: W, bottom: H, width: W, height: H };
  it('reads a desktop side sheet as covering the right', () => {
    expect(getSheetInsets({ left: 940, top: 0, width: 340, height: 800 }, canvas)).toEqual({ right: 340 });
  });
  it('reads a phone bottom sheet as covering the bottom', () => {
    const phone = { left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 };
    expect(getSheetInsets({ left: 0, top: 270, width: 390, height: 574 }, phone)).toEqual({ bottom: 574 });
  });
  it('ignores a full-screen or missing sheet', () => {
    expect(getSheetInsets({ left: 0, top: 0, width: W, height: H }, canvas)).toBeNull();
    expect(getSheetInsets(null, canvas)).toBeNull();
  });
});
