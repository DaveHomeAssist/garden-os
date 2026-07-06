import {
  DEFAULT_BLOCKERS,
  DEFAULT_BOUNDS,
  DEFAULT_POSITION,
  cloneBlockers,
  cloneBounds,
  cloneSimulationState,
  createSimulationState,
  normalizeSimulationConfig,
  normalizeSimulationState,
  resetSimulationState,
  stepSimulationState,
} from '../engine/simulation-core.js';

export function createPlayerController(options = {}) {
  let config = normalizeSimulationConfig({
    blockers: options.blockers ?? DEFAULT_BLOCKERS,
    bounds: options.bounds ?? DEFAULT_BOUNDS,
  });
  let state = createSimulationState({
    ...config,
    initialPosition: { ...DEFAULT_POSITION, ...(options.initialPosition ?? {}) },
  });

  function update(dt, input) {
    state = stepSimulationState(state, { config, dt, enabled: state.enabled, input });
    return getState();
  }

  function getState() {
    return cloneSimulationState(state);
  }

  return {
    setBounds(nextBounds = null) {
      config = normalizeSimulationConfig({
        ...config,
        bounds: cloneBounds(nextBounds ?? DEFAULT_BOUNDS),
      });
      state = normalizeSimulationState(state, config);
      return getState();
    },
    setBlockers(nextBlockers = null) {
      config = normalizeSimulationConfig({
        ...config,
        blockers: Array.isArray(nextBlockers)
          ? cloneBlockers(nextBlockers)
          : cloneBlockers(DEFAULT_BLOCKERS),
      });
      return getState();
    },
    setEnabled(nextEnabled) {
      state = {
        ...state,
        enabled: Boolean(nextEnabled),
        ...(nextEnabled ? {} : {
          moving: false,
          speed: 0,
          velocity: { x: 0, z: 0 },
        }),
      };
    },
    setState(nextState) {
      if (nextState) {
        state = cloneSimulationState(nextState);
      }
    },
    reset(nextPosition = DEFAULT_POSITION) {
      state = resetSimulationState(state, nextPosition, config);
      return getState();
    },
    update,
    getState,
  };
}
