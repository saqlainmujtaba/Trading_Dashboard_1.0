import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAccount,
  createPayout,
  createPlannedAccount,
  createTrade,
  getDashboardData,
  importTrades,
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
  const importedTrade = {
    externalId: 'mt5-sample-deal-42',
    date: '2026-01-04',
    pair: 'EURUSD',
    buySell: 'Buy',
    entryPrice: 1.1,
    exitPrice: 1.101,
    lotSize: 0.1,
    pnl: 17.5,
  };
  const firstImport = await invoke(importTrades, ownerId, { account: account.body.name, trades: [importedTrade] });
  const duplicateImport = await invoke(importTrades, ownerId, { account: account.body.name, trades: [importedTrade] });
  const crossUserImport = await invoke(importTrades, otherId, { account: account.body.name, trades: [importedTrade] });

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
  assert.equal(ownerData.body.trades.length, 2);
  assert.equal(ownerData.body.trades.find((trade) => trade.externalId === importedTrade.externalId).pnl, 17.5);
  assert.equal(ownerData.body.payouts.length, 1);
  assert.deepEqual(otherData.body.accounts, []);
  assert.deepEqual(otherData.body.plannedAccounts, []);
  assert.deepEqual(otherData.body.trades, []);
  assert.deepEqual(otherData.body.payouts, []);
  assert.equal(deniedUpdate.statusCode, 404);
  assert.equal(deniedTrade.statusCode, 400);
  assert.equal(deniedPayout.statusCode, 400);
  assert.equal(firstImport.body.imported, 1);
  assert.equal(duplicateImport.body.duplicates, 1);
  assert.equal(crossUserImport.statusCode, 400);
});

test('trade imports skip existing account trades and import only new rows', async () => {
  const ownerId = `import-owner-${Date.now()}`;
  const account = await invoke(createAccount, ownerId, {
    name: `Import account ${ownerId}`,
    status: 'Active',
  });
  const secondAccount = await invoke(createAccount, ownerId, {
    name: `Second import account ${ownerId}`,
    status: 'Active',
  });
  const existingTrade = {
    account: account.body.name,
    date: '2026-03-15',
    pair: 'EURUSD',
    buySell: 'Buy',
    entryPrice: 1.1,
    exitPrice: 1.101,
    lotSize: 0.1,
  };
  await invoke(createTrade, ownerId, existingTrade);

  const newTrade = {
    date: '2026-03-16',
    pair: 'GBPUSD',
    buySell: 'Sell',
    entryPrice: 1.27,
    exitPrice: 1.269,
    lotSize: 0.2,
    externalId: 'new-position-2',
  };
  const samePricesDifferentPnl = {
    ...existingTrade,
    pnl: 12,
    externalId: 'same-execution-different-pnl',
  };
  const mixedImport = await invoke(importTrades, ownerId, {
    account: account.body.name,
    trades: [{ ...existingTrade, pnl: 10, externalId: 'different-export-id' }, samePricesDifferentPnl, newTrade],
  });
  const repeatedImport = await invoke(importTrades, ownerId, {
    account: account.body.name,
    trades: [{ ...existingTrade, pnl: 10, externalId: 'different-export-id' }, samePricesDifferentPnl, newTrade],
  });
  const sameTradeDifferentAccount = await invoke(importTrades, ownerId, {
    account: secondAccount.body.name,
    trades: [{ ...existingTrade, pnl: 10, externalId: 'different-export-id' }],
  });
  const dashboard = await invoke(getDashboardData, ownerId);

  assert.equal(mixedImport.body.imported, 2);
  assert.equal(mixedImport.body.duplicates, 1);
  assert.equal(repeatedImport.body.imported, 0);
  assert.equal(repeatedImport.body.duplicates, 3);
  assert.equal(sameTradeDifferentAccount.body.imported, 1);
  assert.equal(dashboard.body.trades.length, 4);
});