import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTradeRows, parseDelimitedText } from './tradeImport.js';

test('parses quoted CSV fields and comma-delimited notes', () => {
  const rows = parseDelimitedText('Date,Symbol,Type,Volume,Open Price,Close Price,Profit,Comment\n2026-06-01,EURUSD,Buy,0.1,1.1,1.102,20,"London, breakout"');
  const [headers, values] = rows;
  assert.equal(values[7], 'London, breakout');
  assert.equal(headers.length, values.length);
});

test('normalizes common closed-position exports and removes repeated rows', () => {
  const records = [
    { 'Close Time': '2026-06-01 12:00', Symbol: 'EUR/USD', Side: 'Long', Quantity: '0.1', 'Entry Price': '1.1000', 'Close Price': '1.1020', 'Net Profit': '20.50' },
    { 'Close Time': '2026-06-01 12:00', Symbol: 'EUR/USD', Side: 'Long', Quantity: '0.1', 'Entry Price': '1.1000', 'Close Price': '1.1020', 'Net Profit': '20.50' },
  ];
  const result = normalizeTradeRows(records);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].date, '2026-06-01');
  assert.equal(result.trades[0].pair, 'EURUSD');
  assert.equal(result.trades[0].buySell, 'Buy');
  assert.equal(result.trades[0].pnl, 20.5);
  assert.equal(result.rejectedCount, 1);
});

test('pairs MT5-style in/out deals using the position identifier', () => {
  const records = [
    { Time: '2026.06.01 09:00', Position: '42', Symbol: 'GBPUSD', Type: 'buy', Entry: 'in', Volume: '0.2', Price: '1.2700', Profit: '0' },
    { Time: '2026.06.01 10:00', Position: '42', Symbol: 'GBPUSD', Type: 'sell', Entry: 'out', Volume: '0.2', Price: '1.2720', Profit: '40' },
  ];
  const result = normalizeTradeRows(records);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].buySell, 'Buy');
  assert.equal(result.trades[0].entryPrice, 1.27);
  assert.equal(result.trades[0].exitPrice, 1.272);
  assert.equal(result.trades[0].pnl, 40);
});

test('pairs MT5 deal rows when in/out is exported in the Direction column', () => {
  const result = normalizeTradeRows([
    { Time: '2026-06-01 09:00', Position: '84', Symbol: 'XAUUSD', Type: 'buy', Direction: 'in', Volume: '0.1', Price: '2300', Profit: '0' },
    { Time: '2026-06-01 10:00', Position: '84', Symbol: 'XAUUSD', Type: 'sell', Direction: 'out', Volume: '0.1', Price: '2304', Profit: '40' },
  ]);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].buySell, 'Buy');
  assert.equal(result.trades[0].entryPrice, 2300);
  assert.equal(result.trades[0].exitPrice, 2304);
});

test('converts Excel date serials in spreadsheet rows', () => {
  const result = normalizeTradeRows([
    { Date: '46174', Symbol: 'EURUSD', Side: 'Buy', 'Entry Price': '1.1', 'Exit Price': '1.101', Profit: '10' },
  ]);
  assert.equal(result.trades[0].date, '2026-06-01');
});