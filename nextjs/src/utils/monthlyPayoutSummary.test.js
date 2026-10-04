import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMonthlyPayoutSummary } from './monthlyPayoutSummary.js';

test('includes active accounts opened by the end of the selected month', () => {
  const summary = buildMonthlyPayoutSummary({
    month: '2026-06',
    currentMonth: '2026-10',
    accounts: [
      { name: 'Older active', status: 'Active', purchaseDate: '2026-02-15', fundedAmount: 10000 },
      { name: 'Opened in June', status: 'Active', purchaseDate: '2026-06-30', fundedAmount: 5000 },
      { name: 'Opened later', status: 'Active', purchaseDate: '2026-07-01', fundedAmount: 20000 },
      { name: 'Not active', status: 'Failed', purchaseDate: '2026-01-01', fundedAmount: 30000 },
    ],
    payouts: [{ account: 'Older active', date: '2026-06-12', amount: 500 }],
  });

  assert.deepEqual(summary.map((account) => account.name), ['Older active', 'Opened in June']);
  assert.equal(summary[0].payoutAmount, 500);
  assert.equal(summary[0].returnPercent, 5);
});

test('uses account creation date when purchase date is missing', () => {
  const summary = buildMonthlyPayoutSummary({
    month: '2026-06',
    currentMonth: '2026-10',
    accounts: [
      { name: 'Created earlier', status: 'Active', createdAt: '2026-05-14T10:00:00.000Z' },
      { name: 'Created later', status: 'Active', createdAt: '2026-07-14T10:00:00.000Z' },
    ],
    payouts: [],
  });

  assert.deepEqual(summary.map((account) => account.name), ['Created earlier']);
});

test('returns no rows when no active account existed in the selected month', () => {
  const summary = buildMonthlyPayoutSummary({
    month: '2026-06',
    currentMonth: '2026-10',
    accounts: [{ name: 'Future account', status: 'Active', purchaseDate: '2026-07-01' }],
    payouts: [],
  });

  assert.deepEqual(summary, []);
});
