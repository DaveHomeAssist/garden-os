import {
  FIXED_SIMULATION_DT,
  checksumSimulationState,
  createSimulationState,
  normalizeSimulationConfig,
  normalizeSimulationState,
  resetSimulationState,
  stepSimulationState,
} from './simulation-core.js';

function createSimulationWorkerRuntime(scope = globalThis) {
  let config = normalizeSimulationConfig();
  let enabled = true;
  let fixedDt = FIXED_SIMULATION_DT;
  let frame = 0;
  let input = null;
  let state = createSimulationState({ ...config });
  let timer = null;

  function emitSnapshot(reason = 'step') {
    scope.postMessage?.({
      checksum: checksumSimulationState(state),
      frame,
      reason,
      state,
      type: 'SIMULATION_SNAPSHOT',
    });
  }

  function step(frames = 1, reason = 'step') {
    for (let index = 0; index < frames; index += 1) {
      state = stepSimulationState(state, {
        config,
        dt: fixedDt,
        enabled,
        input,
      });
      frame += 1;
    }
    emitSnapshot(reason);
  }

  function stop() {
    if (timer != null) {
      scope.clearInterval?.(timer);
      timer = null;
    }
  }

  function start() {
    if (timer != null) return;
    timer = scope.setInterval?.(() => step(1, 'interval'), fixedDt * 1000) ?? null;
  }

  function handleMessage(event) {
    const message = event?.data ?? event;
    switch (message?.type) {
      case 'INIT':
        config = normalizeSimulationConfig(message.config);
        fixedDt = message.fixedDt ?? FIXED_SIMULATION_DT;
        enabled = message.enabled !== false;
        state = normalizeSimulationState(message.state, config);
        frame = message.frame ?? 0;
        input = message.input ?? null;
        emitSnapshot('init');
        break;
      case 'CONFIG':
        config = normalizeSimulationConfig(message.config);
        state = normalizeSimulationState(state, config);
        emitSnapshot('config');
        break;
      case 'RESET':
        state = message.state
          ? normalizeSimulationState(message.state, config)
          : resetSimulationState(state, message.position, config);
        frame = message.frame ?? frame;
        emitSnapshot('reset');
        break;
      case 'INPUT':
        input = message.input ?? null;
        break;
      case 'ENABLED':
        enabled = Boolean(message.enabled);
        break;
      case 'STEP':
        step(Math.max(1, Math.floor(message.frames ?? 1)), 'manual');
        break;
      case 'START':
        start();
        break;
      case 'STOP':
        stop();
        break;
      default:
        break;
    }
  }

  scope.addEventListener?.('message', handleMessage);

  return {
    getFrame: () => frame,
    getState: () => state,
    handleMessage,
    start,
    step,
    stop,
  };
}

if (
  typeof globalThis.document === 'undefined'
  && typeof globalThis.addEventListener === 'function'
  && typeof globalThis.postMessage === 'function'
) {
  createSimulationWorkerRuntime(globalThis);
}

export { createSimulationWorkerRuntime };
