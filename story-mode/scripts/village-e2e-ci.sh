#!/usr/bin/env bash
# Village e2e for CI. Run from story-mode/ with the machine's shared browser
# lock held for the whole script:
#
#   flock /tmp/mixmash-browser-ci.lock bash scripts/village-e2e-ci.sh
#
# The dev server listens on a fixed port, so it must start only after this job
# owns the lock. If it started first, a second runner on the same machine would
# fail to bind the port, find the first job's server answering on it, and test
# code it never checked out. Holding the lock first means one dev server per
# machine at a time, and the check below refuses any server this job did not
# start.
#
# Env: GOS_URL (required, must use GOS_PORT), GOS_PORT (default 4318),
# GOS_OUT (passed through to tests/village-e2e.mjs), RUNNER_TEMP (server log).
set -eo pipefail

: "${GOS_URL:?GOS_URL must be set}"
port="${GOS_PORT:-4318}"
log="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/vite-dev.log"

if curl -sf -o /dev/null "$GOS_URL"; then
  echo "::error::Something is already serving $GOS_URL. Refusing to test a server this job did not start."
  exit 1
fi

node node_modules/vite/bin/vite.js --port "$port" --strictPort > "$log" 2>&1 &
VITE_PID=$!
trap 'kill "$VITE_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$GOS_URL" && break
  kill -0 "$VITE_PID" 2>/dev/null || break
  sleep 1
done

if ! kill -0 "$VITE_PID" 2>/dev/null || ! curl -sf -o /dev/null "$GOS_URL"; then
  echo "::error::vite dev server did not come up on $GOS_URL"
  cat "$log"
  exit 1
fi

node tests/village-e2e.mjs
