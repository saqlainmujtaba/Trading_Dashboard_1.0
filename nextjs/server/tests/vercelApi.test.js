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

test('Vercel API reports a retryable error when MongoDB is not configured', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousMongoUri = process.env.MONGO_URI;
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.MONGO_URI;

  try {
    const response = await GET(new Request('https://example.test/api/dashboard'));
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /MONGO_URI/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousMongoUri;
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  }
});
