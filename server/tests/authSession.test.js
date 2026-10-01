import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import createAuthToken from '../src/config/authToken.js';
import { createDemoSession, purgeExpiredDemoAccounts } from '../src/controllers/authController.js';
import { getDashboardData } from '../src/controllers/dashboardController.js';
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

test('expired demo tokens are rejected without issuing a renewal', () => {
  const expiredToken = jwt.sign(
    { id: 'demo-session-user', isDemo: true, demoExpiresAt: Date.now() - 1 },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '10d' }
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

test('demo sessions create isolated accounts with a ten-day expiry', async () => {
  const createResponse = async () => {
    const response = {
      statusCode: 200,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    await createDemoSession({}, response);
    return response;
  };

  const [first, second] = await Promise.all([createResponse(), createResponse()]);
  const firstToken = jwt.decode(first.body.token);
  const secondToken = jwt.decode(second.body.token);
  const expectedLifetime = 10 * 24 * 60 * 60 * 1000;

  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);
  assert.notEqual(first.body._id, second.body._id);
  assert.notEqual(first.body.email, second.body.email);
  assert.equal(firstToken.isDemo, true);
  assert.equal(secondToken.isDemo, true);
  assert.ok(firstToken.demoExpiresAt - Date.now() <= expectedLifetime);
  assert.ok(firstToken.demoExpiresAt - Date.now() > expectedLifetime - 1000);

  const dashboardResponse = { json(body) { this.body = body; return this; } };
  await getDashboardData({ user: { id: first.body._id } }, dashboardResponse);
  assert.equal(dashboardResponse.body.accounts.length, 2);
  assert.equal(dashboardResponse.body.plannedAccounts.length, 2);
  assert.equal(dashboardResponse.body.trades.length, 3);
  assert.equal(dashboardResponse.body.payouts.length, 2);

  assert.equal(await purgeExpiredDemoAccounts(new Date(Date.now() + expectedLifetime + 1000)), 2);
  await getDashboardData({ user: { id: first.body._id } }, dashboardResponse);
  assert.deepEqual(dashboardResponse.body.accounts, []);
  assert.deepEqual(dashboardResponse.body.trades, []);
});