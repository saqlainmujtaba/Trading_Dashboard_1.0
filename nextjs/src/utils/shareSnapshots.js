export const tradeColumns = [
  'Date',
  'Account',
  'Instrument',
  'Direction',
  'Entry price',
  'Exit price',
  'Lot size',
  'Stop loss (SL)',
  'Take profit (TP)',
  'Risk',
  'P/L',
];

export const filterTradeHistory = (trades, filters) => trades.filter((trade) => (
  (!filters.month || String(trade.date || '').slice(0, 7) === filters.month)
  && (!filters.account || trade.account === filters.account)
  && (!filters.pair || trade.pair === filters.pair)
  && (!filters.side || trade.buySell === filters.side)
));

export const tradeSnapshotRow = (trade, formatCurrency) => [
  trade.date || '',
  trade.account || '',
  trade.pair || '',
  trade.buySell || '',
  Number(trade.entryPrice || 0).toFixed(5),
  Number(trade.exitPrice || 0).toFixed(5),
  Number(trade.lotSize || 0).toFixed(2),
  Number(trade.sl || 0).toFixed(5),
  Number(trade.tp || 0).toFixed(5),
  formatCurrency(trade.risk),
  `${Number(trade.pnl || 0) > 0 ? '+' : ''}${formatCurrency(trade.pnl)}`,
];

export const tradeShareItem = (trade, formatCurrency) => ({
  type: 'trade',
  label: 'trade',
  title: `${trade.pair || 'Trade'} ${trade.buySell || ''}`.trim(),
  description: `${trade.date || ''} · ${trade.account || ''}`,
  snapshot: {
    columns: tradeColumns,
    rows: [tradeSnapshotRow(trade, formatCurrency)],
    highlights: [{ label: 'Trade P/L', value: `${Number(trade.pnl || 0) > 0 ? '+' : ''}${formatCurrency(trade.pnl)}` }],
  },
});

export const tradeHistoryShareItem = (trades, formatCurrency) => ({
  type: 'trade-history',
  label: 'history',
  title: 'Trade History',
  description: trades.length > 500
    ? `First 500 of ${trades.length} trades matching the selected filters`
    : `${trades.length} trades matching the selected filters`,
  snapshot: {
    columns: tradeColumns,
    rows: trades.slice(0, 500).map((trade) => tradeSnapshotRow(trade, formatCurrency)),
    highlights: [{ label: 'Matching trades', value: trades.length }],
  },
});

export const accountShareItem = (account, formatCurrency, trades = []) => ({
  type: 'account',
  label: 'account',
  title: account.name || 'Trading Account',
  description: `${account.propFirm || 'Trading account'} · ${account.status || 'Unknown status'}`,
  snapshot: {
    columns: ['Account', 'Prop firm', 'Status', 'Type', 'Purchase date', 'Funded amount', 'Balance', 'Starting balance', 'Payout received'],
    rows: [[
      account.name || '',
      account.propFirm || '',
      account.status || '',
      account.type || '',
      account.purchaseDate || '',
      formatCurrency(account.fundedAmount),
      formatCurrency(account.balance),
      formatCurrency(account.startingBalance),
      formatCurrency(account.payoutReceived),
    ]],
    highlights: [
      { label: 'Account P/L', value: formatCurrency(Number(account.balance || 0) - Number(account.startingBalance || 0)) },
      { label: 'Related trades', value: trades.length },
    ],
  },
});

export const accountTradesShareItem = (account, trades, formatCurrency) => ({
  type: 'account-trading',
  label: 'trades',
  title: `${account.name || 'Account'} Trading History`,
  description: trades.length > 500
    ? `First 500 of ${trades.length} trades recorded for this account`
    : `${trades.length} trades recorded for this account`,
  snapshot: {
    columns: tradeColumns,
    rows: trades.slice(0, 500).map((trade) => tradeSnapshotRow(trade, formatCurrency)),
    highlights: [{ label: 'Account trades', value: trades.length }],
  },
});

export const activeAccountsShareItem = (accounts, formatCurrency) => {
  const activeAccounts = accounts.filter((account) => account.status === 'Active');
  return {
    type: 'active-accounts',
    label: 'active accounts',
    title: 'Active Accounts',
    description: `${activeAccounts.length} active accounts`,
    snapshot: {
      columns: ['Account', 'Prop firm', 'Purchase date', 'Funded amount', 'Balance'],
      rows: activeAccounts.slice(0, 500).map((account) => [
        account.name || '',
        account.propFirm || '',
        account.purchaseDate || '',
        formatCurrency(account.fundedAmount),
        formatCurrency(account.balance),
      ]),
      highlights: [{ label: 'Active accounts', value: activeAccounts.length }],
    },
  };
};

export const payoutShareItem = (payout, formatCurrency) => ({
  type: 'payout',
  label: 'payout',
  title: `${payout.account || 'Account'} Payout`,
  description: `${payout.date || ''} · ${payout.status || ''}`,
  snapshot: {
    columns: ['Date', 'Account', 'Amount', 'Method', 'Status'],
    rows: [[payout.date || '', payout.account || '', formatCurrency(payout.amount), payout.method || '', payout.status || '']],
    highlights: [{ label: 'Payout amount', value: formatCurrency(payout.amount) }],
  },
});

export const payoutHistoryShareItem = (payouts, formatCurrency) => ({
  type: 'payout-history',
  label: 'payouts',
  title: 'Payout History',
  description: `${payouts.length} recorded payouts`,
  snapshot: {
    columns: ['Date', 'Account', 'Amount', 'Method', 'Status'],
    rows: payouts.slice(0, 500).map((payout) => [
      payout.date || '',
      payout.account || '',
      formatCurrency(payout.amount),
      payout.method || '',
      payout.status || '',
    ]),
    highlights: [{
      label: 'Total payouts',
      value: formatCurrency(payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0)),
    }],
  },
});

export const monthlyPayoutsShareItem = (rows, month, formatCurrency) => ({
  type: 'monthly-payouts',
  label: 'summary',
  title: 'Monthly Payout Summary',
  description: month,
  snapshot: {
    columns: ['Account', 'Payout amount', 'Return'],
    rows: rows.map((account) => [
      account.name || '',
      formatCurrency(account.payoutAmount),
      account.returnPercent === null ? '—' : `${account.returnPercent.toFixed(2)}%`,
    ]),
    highlights: [{ label: 'Total payouts', value: formatCurrency(rows.reduce((sum, account) => sum + account.payoutAmount, 0)) }],
  },
});
