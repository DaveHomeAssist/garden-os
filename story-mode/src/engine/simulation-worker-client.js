import {
  FIXED_SIMULATION_DT,
  checksumSimulationState,
  createSimulationState,
  normalizeSimulationConfig,
  normalizeSimulationState,
  resetSimulationState,
  stepSimulationState,
} from './simulation-core.js';

function createDefaultWorker() {
  if (typeof Worker !== 'function') return null;
  return new Worker(new URL('./simulation-worker.js', import.meta.url), { type: 'module' });
}

function createSimulationWorkerClient({
  config = {},
  fixedDt = FIXED_SIMULATION_DT,
  initialState = null,
  onSnapshot,
  workerFactory = createDefaultWorker,
} = {}) {
  let currentConfig = normalizeSimulationConfig(config);
  let enabled = true;
  let input = null;
  let latest = initialState
    ? normalizeSimulationState(initialState, currentConfig)
    : createSimulationState(currentConfig);
  let frame = 0;
  let worker = null;

  try {
    worker = workerFactory?.() ?? null;
  } catch (error) {
    console.warn('[GOS] Simulation worker unavailable:', error?.message ?? error);
    worker = null;
  }

  function post(message) {
    worker?.postMessage?.(message);
  }

  function disableWorker(error) {
    console.warn('[GOS] Simulation worker failed:', error?.message ?? error);
    worker?.terminate?.();
    worker = null;
  }

  if (worker) {
    worker.onmessage = (event) => {
      const message = event?.data;
      if (message?.type !== 'SIMULATION_SNAPSHOT') return;
      latest = normalizeSimulationState(message.state, currentConfig);
      frame = message.frame ?? frame;
      onSnapshot?.({ ...message, state: latest });
    };
    worker.onerror = disableWorker;
    worker.onmessageerror = disableWorker;
    post({
      config: currentConfig,
      enabled,
      fixedDt,
      frame,
      input,
      state: latest,
      type: 'INIT',
    });
    post({ type: 'START' });
  }

  return {
    get available() {
      return Boolean(worker);
    },
    configure(nextConfig = {}) {
      currentConfig = normalizeSimulationConfig(nextConfig);
      latest = normalizeSimulationState(latest, currentConfig);
      post({ config: currentConfig, type: 'CONFIG' });
    },
    dispose() {
      post({ type: 'STOP' });
      worker?.terminate?.();
      worker = null;
    },
    getSnapshot() {
      return latest;
    },
    reset(nextStateOrPosition) {
      if (nextStateOrPosition?.position) {
        latest = normalizeSimulationState(nextStateOrPosition, currentConfig);
      } else {
        latest = resetSimulationState(latest, nextStateOrPosition, currentConfig);
      }
      frame = 0;
      post({ frame, state: latest, type: 'RESET' });
      return latest;
    },
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      post({ enabled, type: 'ENABLED' });
    },
    setInput(nextInput) {
      input = nextInput ?? null;
      post({ input, type: 'INPUT' });
    },
    stepLocal(dt = fixedDt, nextInput = input, nextEnabled = enabled) {
      latest = stepSimulationState(latest, {
        config: currentConfig,
        dt,
        enabled: nextEnabled,
        input: nextInput,
      });
      frame += 1;
      post({ frame, state: latest, type: 'RESET' });
      return latest;
    },
    checksum() {
      return checksumSimulationState(latest);
    },
  };
}

export { createSimulationWorkerClient };
