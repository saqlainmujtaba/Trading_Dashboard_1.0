import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../../app/api/[[...path]]/route.js';

test('Vercel API route forwards health requests to Express', async () => {
  const response = await GET(new Request('http://localhost/api/health'));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    message: 'Trading dashboard API is running',
  });
});
