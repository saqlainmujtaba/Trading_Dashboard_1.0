import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAccount,
  createPayout,
  createPlannedAccount,
  createTrade,
  getDashboardData,
  updateAccount,
} from '../src/controllers/dashboardController.js';

const invoke = async (handler, userId, body = {}, params = {}) => {
  const response = {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await handler({ user: { id: userId }, body, params }, response);
  return response;
};

test('dashboard data and account-linked writes stay isolated by user', async () => {
  const ownerId = `owner-${Date.now()}`;
  const otherId = `other-${Date.now()}`;
  const account = await invoke(createAccount, ownerId, {
    name: `Owner account ${ownerId}`,
    fundedAmount: 50000,
    startingBalance: 50000,
    balance: 51000,
    status: 'Active',
  });

  await invoke(createPlannedAccount, ownerId, { company: 'Owner plan', size: 100000 });
  await invoke(createTrade, ownerId, {
    account: account.body.name,
    pair: 'EURUSD',
    buySell: 'Buy',
    entryPrice: 1.1,
    exitPrice: 1.101,
    lotSize: 0.1,
    date: '2026-01-01',
  });
  await invoke(createPayout, ownerId, {
    account: account.body.name,
    date: '2026-01-02',
    amount: 500,
  });

  const ownerData = await invoke(getDashboardData, ownerId);
  const otherData = await invoke(getDashboardData, otherId);
  const deniedUpdate = await invoke(updateAccount, otherId, { balance: 0 }, { id: account.body._id });
  const deniedTrade = await invoke(createTrade, otherId, {
    account: account.body.name,
    pair: 'EURUSD',
    buySell: 'Buy',
    date: '2026-01-03',
  });
  const deniedPayout = await invoke(createPayout, otherId, {
    account: account.body.name,
    date: '2026-01-03',
    amount: 500,
  });

  assert.equal(ownerData.body.accounts.length, 1);
  assert.equal(ownerData.body.plannedAccounts.length, 1);
  assert.equal(ownerData.body.trades.length, 1);
  assert.equal(ownerData.body.payouts.length, 1);
  assert.deepEqual(otherData.body.accounts, []);
  assert.deepEqual(otherData.body.plannedAccounts, []);
  assert.deepEqual(otherData.body.trades, []);
  assert.deepEqual(otherData.body.payouts, []);
  assert.equal(deniedUpdate.statusCode, 404);
  assert.equal(deniedTrade.statusCode, 400);
  assert.equal(deniedPayout.statusCode, 400);
});