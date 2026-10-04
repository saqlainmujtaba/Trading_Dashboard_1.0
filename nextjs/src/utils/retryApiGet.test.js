import assert from 'node:assert/strict';
import test from 'node:test';
import { getWithTransientRetry } from './retryApiGet.js';

test('GET retries a transient server response and succeeds', async () => {
  let attempts = 0;
  const waits = [];
  const response = await getWithTransientRetry(async () => {
    attempts += 1;
    if (attempts === 1) throw { response: { status: 503 } };
    return { data: 'ready' };
  }, '/dashboard', async (milliseconds) => waits.push(milliseconds));

  assert.equal(response.data, 'ready');
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [500]);
});

test('GET does not retry authentication or other client errors', async () => {
  let attempts = 0;
  await assert.rejects(
    getWithTransientRetry(async () => {
      attempts += 1;
      throw { response: { status: 401 } };
    }, '/auth/me', async () => {}),
  );
  assert.equal(attempts, 1);
});

test('GET retries at most twice before surfacing the failure', async () => {
  let attempts = 0;
  const waits = [];
  await assert.rejects(
    getWithTransientRetry(async () => {
      attempts += 1;
      throw { response: { status: 503 } };
    }, '/dashboard', async (milliseconds) => waits.push(milliseconds)),
  );
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [500, 1000]);
});
