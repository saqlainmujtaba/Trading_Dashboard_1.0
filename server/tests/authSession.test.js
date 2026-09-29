import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import createAuthToken from '../src/config/authToken.js';
import protect from '../src/middleware/authMiddleware.js';

test('authenticated requests return a renewed ten-day token', () => {
  const token = createAuthToken({ id: 'session-user', email: 'session@example.com', name: 'Session User' });
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status() {
      return this;
    },
    json() {
      return this;
    },
  };
  let nextCalled = false;

  protect({ headers: { authorization: `Bearer ${token}` } }, response, () => { nextCalled = true; });

  const renewedToken = response.headers['X-Auth-Token'];
  const decoded = jwt.verify(renewedToken, process.env.JWT_SECRET || 'dev-secret');
  assert.equal(nextCalled, true);
  assert.equal(decoded.id, 'session-user');
  assert.ok(decoded.exp - Math.floor(Date.now() / 1000) > 9 * 24 * 60 * 60);
  assert.ok(decoded.exp - Math.floor(Date.now() / 1000) <= 10 * 24 * 60 * 60);
});

test('expired tokens are rejected without issuing a renewal', () => {
  const expiredToken = jwt.sign(
    { id: 'session-user', email: 'session@example.com', name: 'Session User' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: -1 }
  );
  const response = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  protect({ headers: { authorization: `Bearer ${expiredToken}` } }, response, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 401);
  assert.equal(response.headers['X-Auth-Token'], undefined);
});