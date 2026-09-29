import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeSpreadsheetXml, extractTradeRecords, normalizeTradeRows, parseDelimitedText } from './tradeImport.js';

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

test('falls back to the valid first MT5 Time column when the duplicate Time is not a date', () => {
  const result = normalizeTradeRows([
    {
      Time: '2026.09.23 12:30:00',
      Position: '98765',
      Symbol: 'EURUSD',
      Type: 'buy',
      Volume: '0.1',
      Price: '1.1000',
      Time2: '-5.00',
      Price2: '1.1020',
      Profit: '20',
    },
  ]);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].date, '2026-09-23');
});

test('decodes UTF-16LE workbook XML', () => {
  const source = '<workbook><sheets><sheet name="History"/></sheets></workbook>';
  const bytes = new Uint8Array(2 + source.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  [...source].forEach((character, index) => {
    const code = character.charCodeAt(0);
    bytes[2 + index * 2] = code & 0xff;
    bytes[3 + index * 2] = code >> 8;
  });
  assert.equal(decodeSpreadsheetXml(bytes), source);
});

test('ignores MT5 report summaries and includes commission and swap in gross profit', () => {
  const result = normalizeTradeRows([
    {
      Time: '2026.09.23 12:30:00',
      Position: '98765',
      Symbol: 'EURUSD',
      Type: 'buy',
      Volume: '0.1',
      Price: '1.1000',
      Time2: '-5.00',
      Price2: '1.1020',
      Commission: '-0.50',
      Swap: '-0.10',
      Profit: '20.00',
    },
    { Time: 'Trade History Report' },
    { Type: 'balance', Profit: '1000' },
    { Type: 'buy limit', Symbol: 'EURUSD', Time: '2026.09.23 12:30:00' },
  ]);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].pnl, 19.4);
  assert.equal(result.rejectedCount, 0);
});

test('uses MT5 position IDs to distinguish otherwise identical trades', () => {
  const base = {
    Time: '2026.09.23 12:30:00',
    Symbol: 'EURUSD',
    Type: 'buy',
    Volume: '0.1',
    Price: '1.1000',
    Time2: '2026.09.23 12:31:00',
    Price2: '1.1010',
    Profit: '10',
  };
  const result = normalizeTradeRows([
    { ...base, Position: '1001' },
    { ...base, Position: '1002' },
  ]);
  assert.equal(result.trades.length, 2);
  assert.notEqual(result.trades[0].externalId, result.trades[1].externalId);
});

test('imports only the table under Positions and stops before later report tables', () => {
  const records = extractTradeRecords([
    ['MT5 Account Report'],
    ['Positions'],
    ['Time', 'Position', 'Symbol', 'Type', 'Volume', 'Price', 'Time', 'Price', 'Profit'],
    ['2026.09.23 10:00:00', 'position-1', 'EURUSD', 'buy', '0.1', '1.1000', '2026.09.23 11:00:00', '1.1010', '10'],
    ['2026.09.24 10:00:00', 'position-2', 'GBPUSD', 'sell', '0.2', '1.2700', '2026.09.24 11:00:00', '1.2690', '20'],
    ['Orders'],
    ['Open Time', 'Ticket', 'Symbol', 'Type', 'Volume'],
    ['2026.09.25 10:00:00', 'order-1', 'XAUUSD', 'buy limit', '0.1'],
    ['Open Positions'],
    ['Time', 'Position', 'Symbol', 'Type', 'Volume'],
    ['2026.09.26 10:00:00', 'position-3', 'USDJPY', 'buy', '0.1'],
  ]);

  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.Position), ['position-1', 'position-2']);
});