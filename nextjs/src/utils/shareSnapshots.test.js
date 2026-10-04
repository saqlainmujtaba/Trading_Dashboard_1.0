import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTradeHistory, tradeShareItem, tradeHistoryShareItem } from './shareSnapshots.js';

const trades = [
  { date: '2026-06-01', account: 'Alpha', pair: 'EURUSD', buySell: 'Buy', entryPrice: 1.1, exitPrice: 1.2, lotSize: 0.5, pnl: 50 },
  { date: '2026-06-02', account: 'Alpha', pair: 'GBPUSD', buySell: 'Sell', entryPrice: 1.3, exitPrice: 1.2, lotSize: 0.25, pnl: 25 },
  { date: '2026-05-30', account: 'Beta', pair: 'EURUSD', buySell: 'Sell', entryPrice: 1.1, exitPrice: 1.09, lotSize: 0.1, pnl: -10 },
];
const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

test('history filters compose month, account, pair, and side', () => {
  assert.deepEqual(
    filterTradeHistory(trades, { month: '2026-06', account: 'Alpha', pair: 'EURUSD', side: 'Buy' }),
    [trades[0]],
  );
  assert.deepEqual(
    filterTradeHistory(trades, { month: '', account: '', pair: '', side: 'Sell' }),
    [trades[1], trades[2]],
  );
});

test('individual trade snapshots include entry, exit, lot size, and P/L', () => {
  const snapshot = tradeShareItem(trades[0], formatCurrency).snapshot;
  assert.deepEqual(snapshot.columns, ['Date', 'Account', 'Instrument', 'Direction', 'Entry price', 'Exit price', 'Lot size', 'Stop loss (SL)', 'Take profit (TP)', 'Risk', 'P/L']);
  assert.equal(snapshot.rows[0][4], '1.10000');
  assert.equal(snapshot.rows[0][5], '1.20000');
  assert.equal(snapshot.rows[0][6], '0.50');
  assert.equal(snapshot.rows[0][10], '+$50.00');
});

test('history share contains all matching rows in the filtered result', () => {
  const matches = filterTradeHistory(trades, { month: '2026-06', account: '', pair: '', side: '' });
  const share = tradeHistoryShareItem(matches, formatCurrency);
  assert.equal(share.snapshot.rows.length, 2);
  assert.equal(share.description, '2 trades matching the selected filters');
});

test('history share marks snapshots truncated at the API row limit', () => {
  const matches = Array.from({ length: 501 }, (_, index) => ({ ...trades[0], date: `2026-06-${String(index + 1).padStart(2, '0')}` }));
  const share = tradeHistoryShareItem(matches, formatCurrency);
  assert.equal(share.snapshot.rows.length, 500);
  assert.equal(share.description, 'First 500 of 501 trades matching the selected filters');
});
