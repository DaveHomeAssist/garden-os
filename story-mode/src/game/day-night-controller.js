/**
 * Day/Night Controller — thin orchestration layer over DayNightCycle.
 * Maps game phases to time-of-day, auto-enables in Let It Grow mode,
 * and exposes setTimeOfDay() for cutscene scene cues.
 */

const PHASE_TIME_MAP = {
  PLANNING: 0.15,       // early morning
  EARLY_SEASON: 0.25,   // morning
  MID_SEASON: 0.4,      // midday
  LATE_SEASON: 0.55,    // afternoon
  HARVEST: 0.65,        // golden hour
  TRANSITION: 0.8,      // dusk
};

export class DayNightController {
  constructor(scene, store) {
    this.scene = scene;
    this.store = store;
    this.enabled = false;
    this.lastPhase = null;
    this.overrideTime = null;
  }

  /**
   * Sync day/night state from current game state. Called each frame.
   */
  sync() {
    const state = this.store.getState();
    const isLetItGrow = state.campaign?.gameMode === 'let_it_grow';
    const settingEnabled = state.settings?.dayNightEnabled ?? false;
    const shouldEnable = isLetItGrow || settingEnabled;

    if (shouldEnable !== this.enabled) {
      this.enabled = shouldEnable;
      this.scene.setDayNightEnabled?.(shouldEnable);
    }

    if (!this.enabled) return;

    // Update season on the cycle
    const season = state.season?.season;
    if (season) {
      this.scene.dayNight?.setSeason?.(season);
    }

    // In story mode, snap time to phase; in Let It Grow, let it free-run
    if (this.overrideTime !== null) {
      this.scene.dayNight?.setTimeOfDay?.(this.overrideTime);
      return;
    }

    if (!isLetItGrow) {
      const phase = state.season?.phase;
      if (phase && phase !== this.lastPhase) {
        this.lastPhase = phase;
        const targetTime = PHASE_TIME_MAP[phase] ?? 0.25;
        this.scene.dayNight?.setTimeOfDay?.(targetTime);
      }
    }
  }

  /**
   * Override time of day (for cutscene scene cues). Pass null to release.
   */
  setTimeOfDay(t) {
    if (t === null || t === undefined) {
      this.overrideTime = null;
      return;
    }
    this.overrideTime = Math.max(0, Math.min(1, t));
    this.scene.dayNight?.setTimeOfDay?.(this.overrideTime);
  }

  getTimeOfDay() {
    return this.scene.dayNight?.getTimeOfDay?.() ?? 0;
  }

  dispose() {
    this.enabled = false;
    this.overrideTime = null;
  }
}
