/**
 * Esc closes only the top-most layer.
 *
 * The cancel and pause actions share the Escape key. Pausing also closes any
 * open sheet, so a single Esc with the Select Crop picker open used to close
 * the picker AND open the pause menu. The cancel handler asks this helper
 * which dismissable sheet (if any) is on top and closes just that one; the
 * key only reaches pause when nothing else is open.
 *
 * Order matters only in theory (the binder opens one of these at a time);
 * it mirrors what the player sees on top: crop picker, backpack, world map.
 */
export function topEscapeLayer({
  pauseOpen = false,
  cutsceneActive = false,
  cropPaletteOpen = false,
  backpackOpen = false,
  worldMapOpen = false,
} = {}) {
  // Pause (Esc resumes) and cutscenes (Esc skips) own the key themselves.
  if (pauseOpen || cutsceneActive) return null;
  if (cropPaletteOpen) return 'crop-palette';
  if (backpackOpen) return 'backpack';
  if (worldMapOpen) return 'world-map';
  return null;
}
