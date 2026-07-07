import assert from 'node:assert/strict';
import test from 'node:test';

test('Vercel authority API entrypoints import without browser spec aliases', async () => {
  const session = await import('../api/session.mjs');
  const action = await import('../api/action.mjs');
  const verify = await import('../api/ack/verify.mjs');

  assert.equal(typeof session.default, 'function');
  assert.equal(typeof action.default, 'function');
  assert.equal(typeof verify.default, 'function');
});
