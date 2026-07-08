#!/usr/bin/env node

const DEFAULT_AUTHORITY_URL = 'https://garden-os-theta.vercel.app/api';
const REQUEST_TIMEOUT_MS = 10_000;

const args = process.argv.slice(2);

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function usage() {
  return `Usage:
  node scripts/verify-authority-backend.mjs
  node scripts/verify-authority-backend.mjs --authority-url https://garden-os-theta.vercel.app/api`;
}

if (args.includes('--help')) {
  console.log(usage());
  process.exit(0);
}

function normalizeAuthorityUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

const authorityUrl = normalizeAuthorityUrl(
  readOption('--authority-url')
  || process.env.GOS_AUTHORITY_URL
  || process.env.AUTHORITY_URL
  || DEFAULT_AUTHORITY_URL,
);

if (!authorityUrl) {
  console.error('Authority URL is required.');
  console.error(usage());
  process.exit(1);
}

function stableSessionId() {
  const suffix = Date.now().toString(36);
  return `authority-smoke-${suffix}`;
}

async function postJson(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${authorityUrl}${path}`, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    return { json, response };
  } finally {
    clearTimeout(timeout);
  }
}

function assertStatus({ json, response }, expectedStatus, label) {
  if (response.status === expectedStatus) return;
  const error = new Error(`${label} returned HTTP ${response.status}, expected ${expectedStatus}.`);
  error.details = json;
  throw error;
}

function actionEnvelope({ clientSeq, expectedTick, idempotencyKey, sessionId }) {
  return {
    clientSeq,
    clientSentAt: new Date().toISOString(),
    expectedTick,
    gameId: 'garden',
    id: idempotencyKey,
    idempotencyKey,
    payload: { cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'SET_SELECTED_CROP',
  };
}

try {
  const sessionId = readOption('--session-id') || stableSessionId();
  const created = await postJson('/session', { sessionId });
  assertStatus(created, 200, 'session');
  if (!created.json?.ok || created.json?.session?.sessionId !== sessionId) {
    throw Object.assign(new Error('session response did not return the requested server session.'), {
      details: created.json,
    });
  }

  const firstEnvelope = actionEnvelope({
    clientSeq: 1,
    expectedTick: 0,
    idempotencyKey: `${sessionId}:1:SET_SELECTED_CROP`,
    sessionId,
  });
  const applied = await postJson('/action', firstEnvelope);
  assertStatus(applied, 200, 'action');
  const ack = applied.json?.ack;
  if (!applied.json?.ok || !ack?.accepted || ack.tick !== 1 || ack.actionId !== firstEnvelope.id) {
    throw Object.assign(new Error('action response did not return an accepted tick-1 ack.'), {
      details: applied.json,
    });
  }

  const verified = await postJson('/ack/verify', { ack });
  assertStatus(verified, 200, 'ack verification');
  if (!verified.json?.verified) {
    throw Object.assign(new Error('ack verification failed.'), {
      details: verified.json,
    });
  }

  const duplicate = await postJson('/action', {
    ...firstEnvelope,
    payload: { cropId: 'tampered-duplicate' },
  });
  assertStatus(duplicate, 200, 'duplicate action');
  if (!duplicate.json?.duplicate || duplicate.json?.session?.tick !== 1) {
    throw Object.assign(new Error('duplicate action was not idempotent.'), {
      details: duplicate.json,
    });
  }

  console.log(JSON.stringify({
    ackVerified: true,
    authorityUrl,
    checksum: ack.checksum,
    duplicatePreservedTick: duplicate.json.session.tick,
    ok: true,
    sessionId,
    tick: ack.tick,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    authorityUrl,
    details: error?.details ?? null,
    error: error?.message ?? String(error),
    ok: false,
  }, null, 2));
  process.exit(1);
}
