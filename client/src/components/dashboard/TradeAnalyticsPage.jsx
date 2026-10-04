import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AnalyticsChart, { ChartTypeSelect } from './AnalyticsChart';
import SortControl from '../common/SortControl';
import { sortRows } from '../common/sortRows';
import Sidebar from '../layout/Sidebar';
import { buildMonthlyPayoutSummary } from '../../utils/monthlyPayoutSummary';
import SharePanel from '../common/SharePanel';

const analyticsTradeSortOptions = [
  { value: 'date.desc', label: 'Date: newest first' },
  { value: 'date.asc', label: 'Date: oldest first' },
  { value: 'account.asc', label: 'Account: A to Z' },
  { value: 'account.desc', label: 'Account: Z to A' },
  { value: 'pair.asc', label: 'Pair: A to Z' },
  { value: 'pair.desc', label: 'Pair: Z to A' },
  { value: 'buySell.asc', label: 'Direction: Buy to Sell' },
  { value: 'buySell.desc', label: 'Direction: Sell to Buy' },
  { value: 'pnl.desc', label: 'Profit / loss: high to low' },
  { value: 'pnl.asc', label: 'Profit / loss: low to high' },
];

const performanceSortOptions = [
  { value: 'pnl.desc', label: 'Profit / loss: high to low' },
  { value: 'pnl.asc', label: 'Profit / loss: low to high' },
  { value: 'name.asc', label: 'Account: A to Z' },
  { value: 'name.desc', label: 'Account: Z to A' },
  { value: 'trades.desc', label: 'Trade count: high to low' },
  { value: 'trades.asc', label: 'Trade count: low to high' },
  { value: 'wins.desc', label: 'Wins: high to low' },
  { value: 'wins.asc', label: 'Wins: low to high' },
  { value: 'losses.desc', label: 'Losses: high to low' },
  { value: 'losses.asc', label: 'Losses: low to high' },
];

const trendChartTypes = [
  { value: 'area', label: 'Area' },
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
];
const categoryChartTypes = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
];
const statusChartTypes = [
  { value: 'bar', label: 'Bar' },
  { value: 'pie', label: 'Pie' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getTradePnl = (trade = {}) => {
  if (Number.isFinite(Number(trade.pnl))) return Number(trade.pnl);

  const entryPrice = Number(trade.entryPrice || 0);
  const exitPrice = Number(trade.exitPrice || 0);
  const lotSize = Number(trade.lotSize || 0);
  const direction = trade.buySell === 'Sell' ? -1 : 1;
  const pair = (trade.pair || '').toUpperCase().replace('/', '');
  const contractSize = pair === 'XAUUSD' ? 100 : 100000;

  return Number((((exitPrice - entryPrice) * direction * lotSize * contractSize)).toFixed(2));
};

const initialFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  account: '',
  pair: '',
  direction: '',
  result: '',
};

const formatShortDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
});

const shiftMonth = (month, offset) => {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;

  const shiftedDate = new Date(year, monthNumber - 1 + offset, 1);
  return `${shiftedDate.getFullYear()}-${String(shiftedDate.getMonth() + 1).padStart(2, '0')}`;
};

const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadFile = (content, type, filename) => {
  const blob = new Blob([content], { type });
  if (window.AndroidExport?.saveFile) {
    const reader = new FileReader();
    reader.onload = () => window.AndroidExport.saveFile(filename, type, String(reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const TradeAnalyticsPage = ({ user, dashboardData, onLogout, theme, onToggleTheme }) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [tradeSortBy, setTradeSortBy] = useState('date.desc');
  const [tradePageSize, setTradePageSize] = useState(10);
  const [tradePage, setTradePage] = useState(1);
  const [performanceSortBy, setPerformanceSortBy] = useState('pnl.desc');
  const [chartTypes, setChartTypes] = useState({
    cumulative: 'area',
    dailyPnl: 'bar',
    accountPnl: 'bar',
    trades: 'bar',
    payouts: 'bar',
    accountStatus: 'bar',
    plannedFunding: 'bar',
  });
  const [filters, setFilters] = useState(initialFilters);
  const [payoutMonth, setPayoutMonth] = useState(currentMonth);
  const accounts = dashboardData?.accounts || [];
  const payouts = dashboardData?.payouts || [];
  const plannedAccounts = dashboardData?.plannedAccounts || [];
  const allTrades = dashboardData?.trades || [];
  const monthlyPayoutsByActiveAccount = useMemo(
    () => buildMonthlyPayoutSummary({ accounts, payouts, month: payoutMonth, currentMonth }),
    [accounts, payouts, payoutMonth, currentMonth],
  );
  const monthlyPayoutTotal = monthlyPayoutsByActiveAccount.reduce((sum, account) => sum + account.payoutAmount, 0);
  const monthlyFundedTotal = monthlyPayoutsByActiveAccount.reduce((sum, account) => sum + account.fundedAmount, 0);
  const monthlyPayoutReturn = monthlyFundedTotal > 0 ? monthlyPayoutTotal / monthlyFundedTotal * 100 : null;
  const accountOptions = [...new Set(allTrades.map((trade) => trade.account).filter(Boolean))].sort();
  const pairOptions = [...new Set(allTrades.map((trade) => trade.pair).filter(Boolean))].sort();

  const filteredTrades = useMemo(() => allTrades.filter((trade) => {
    const searchText = filters.search.trim().toLowerCase();
    const searchableFields = [trade.account, trade.propFirm, trade.pair, trade.reason, trade.notes];
    const pnl = getTradePnl(trade);

    return (!searchText || searchableFields.some((value) => String(value || '').toLowerCase().includes(searchText)))
      && (!filters.dateFrom || trade.date >= filters.dateFrom)
      && (!filters.dateTo || trade.date <= filters.dateTo)
      && (!filters.account || trade.account === filters.account)
      && (!filters.pair || trade.pair === filters.pair)
      && (!filters.direction || trade.buySell === filters.direction)
      && (!filters.result || (filters.result === 'win' ? pnl > 0 : filters.result === 'loss' ? pnl < 0 : pnl === 0));
  }), [allTrades, filters]);
  const trades = sortRows(filteredTrades, tradeSortBy);
  const tradePageCount = tradePageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(trades.length / tradePageSize));
  const currentTradePage = Math.min(tradePage, tradePageCount);
  const visibleTrades = tradePageSize === 'all'
    ? trades
    : trades.slice((currentTradePage - 1) * tradePageSize, currentTradePage * tradePageSize);
  const firstVisibleTrade = trades.length
    ? (currentTradePage - 1) * (tradePageSize === 'all' ? trades.length : tradePageSize) + 1
    : 0;
  const lastVisibleTrade = tradePageSize === 'all'
    ? trades.length
    : Math.min(currentTradePage * tradePageSize, trades.length);

  const accountPerformance = useMemo(() => {
    const totals = new Map();

    trades.forEach((trade) => {
      if (!trade.account) return;

      const current = totals.get(trade.account) || {
        name: trade.account,
        pnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
      };

      const pnl = getTradePnl(trade);
      current.pnl += pnl;
      current.trades += 1;
      if (pnl >= 0) current.wins += 1;
      else current.losses += 1;

      totals.set(trade.account, current);
    });

    return [...totals.values()];
  }, [trades]);
  const sortedAccountPerformance = sortRows(accountPerformance, performanceSortBy);

  const totalPnL = trades.reduce((sum, trade) => sum + getTradePnl(trade), 0);
  const bestAccount = accountPerformance.reduce((best, item) => (!best || item.pnl > best.pnl ? item : best), null);
  const avgTrade = trades.length ? totalPnL / trades.length : 0;
  const dailyPerformance = useMemo(() => {
    const byDate = new Map();
    trades.forEach((trade) => byDate.set(trade.date, (byDate.get(trade.date) || 0) + getTradePnl(trade)));

    let cumulativePnl = 0;
    return [...byDate.entries()]
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .map(([date, dailyPnl]) => {
        cumulativePnl += dailyPnl;
        return { date, dailyPnl, cumulativePnl };
      });
  }, [trades]);
  const dailyTradeVolume = useMemo(() => {
    const byDate = new Map();
    trades.forEach((trade) => {
      if (!trade.date) return;
      const day = byDate.get(trade.date) || { date: trade.date, wins: 0, losses: 0, breakeven: 0 };
      const pnl = getTradePnl(trade);
      if (pnl > 0) day.wins += 1;
      else if (pnl < 0) day.losses += 1;
      else day.breakeven += 1;
      byDate.set(trade.date, day);
    });
    return [...byDate.values()].sort((first, second) => first.date.localeCompare(second.date));
  }, [trades]);
  const tradeOutcomeTotals = useMemo(() => {
    const totals = { Wins: 0, Losses: 0, Breakeven: 0 };
    trades.forEach((trade) => {
      const pnl = getTradePnl(trade);
      if (pnl > 0) totals.Wins += 1;
      else if (pnl < 0) totals.Losses += 1;
      else totals.Breakeven += 1;
    });
    return [
      { result: 'Wins', count: totals.Wins, color: '#0f766e' },
      { result: 'Losses', count: totals.Losses, color: '#dc5a4f' },
      { result: 'Breakeven', count: totals.Breakeven, color: '#94a3b8' },
    ].filter((item) => item.count > 0);
  }, [trades]);
  const payoutHistory = useMemo(() => {
    const byDate = new Map();
    payouts.forEach((payout) => {
      if (!payout.date) return;
      const day = byDate.get(payout.date) || { date: payout.date, approved: 0, pending: 0, rejected: 0, other: 0 };
      const status = String(payout.status || '').toLowerCase();
      const statusKey = ['approved', 'pending', 'rejected'].includes(status) ? status : 'other';
      day[statusKey] += Number(payout.amount) || 0;
      byDate.set(payout.date, day);
    });
    return [...byDate.values()].sort((first, second) => first.date.localeCompare(second.date));
  }, [payouts]);
  const payoutStatusTotals = useMemo(() => {
    const totals = new Map();
    payouts.forEach((payout) => {
      const status = payout.status || 'Other';
      totals.set(status, (totals.get(status) || 0) + (Number(payout.amount) || 0));
    });
    return [...totals.entries()].map(([status, amount]) => ({ status, amount }));
  }, [payouts]);
  const accountStatusCounts = useMemo(() => {
    const counts = new Map();
    accounts.forEach((account) => {
      const status = String(account.status || 'Unknown').trim();
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return [...counts.entries()].map(([status, count]) => {
      const normalizedStatus = status.toLowerCase();
      const color = normalizedStatus === 'active' ? '#0f766e' : normalizedStatus === 'failed' ? '#dc5a4f' : normalizedStatus === 'paused' ? '#e6a23c' : '#64748b';
      return { status, count, color };
    });
  }, [accounts]);
  const plannedFunding = useMemo(() => {
    const byCompany = new Map();
    plannedAccounts.forEach((account) => {
      const company = account.company || 'Unspecified';
      const item = byCompany.get(company) || { company, accountCount: 0, size: 0 };
      item.accountCount += 1;
      item.size += Number(account.size) || 0;
      byCompany.set(company, item);
    });
    return [...byCompany.values()].sort((first, second) => second.size - first.size);
  }, [plannedAccounts]);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const updateFilter = (field, value) => {
    setTradePage(1);
    setFilters((current) => ({ ...current, [field]: value }));
  };
  const clearFilters = () => {
    setTradePage(1);
    setFilters(initialFilters);
  };
  const changePayoutMonth = (offset) => {
    setPayoutMonth((current) => shiftMonth(current || currentMonth, offset));
  };
  const updateChartType = (chart, type) => setChartTypes((current) => ({ ...current, [chart]: type }));

  const exportCsv = () => {
    const columns = ['Date', 'Account', 'Prop firm', 'Pair', 'Direction', 'Entry', 'Exit', 'Lots', 'SL', 'TP', 'Risk', 'P/L', 'R/R', 'Setup', 'Notes'];
    const rows = trades.map((trade) => [
      trade.date,
      trade.account,
      trade.propFirm,
      trade.pair,
      trade.buySell,
      trade.entryPrice,
      trade.exitPrice,
      trade.lotSize,
      trade.sl,
      trade.tp,
      trade.risk,
      getTradePnl(trade),
      trade.rr,
      trade.reason,
      trade.notes,
    ]);
    const csv = [columns, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n');
    downloadFile(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `trading-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const document = new jsPDF({ orientation: 'landscape' });
    document.setFontSize(18);
    document.text('Trade Analytics Report', 14, 16);
    document.setFontSize(10);
    document.text(`Trader: ${user?.name || user?.email || 'Trader'}  |  ${trades.length} trades  |  Filtered P/L: ${formatCurrency(totalPnL)}`, 14, 24);
    document.text(`Date range: ${filters.dateFrom || 'Any'} to ${filters.dateTo || 'Any'}  |  Account: ${filters.account || 'All'}  |  Pair: ${filters.pair || 'All'}`, 14, 30);
    autoTable(document, {
      startY: 36,
      head: [['Date', 'Account', 'Pair', 'Side', 'Entry', 'Exit', 'Lots', 'SL', 'TP', 'Risk', 'P/L', 'R/R', 'Setup', 'Notes']],
      body: trades.map((trade) => [
        trade.date || '', trade.account || '', trade.pair || '', trade.buySell || '',
        trade.entryPrice ?? '', trade.exitPrice ?? '', trade.lotSize ?? '', trade.sl ?? '', trade.tp ?? '', trade.risk ?? '',
        formatCurrency(getTradePnl(trade)), trade.rr ?? '', trade.reason || '', trade.notes || '',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [29, 78, 76] },
      theme: 'grid',
    });
    const filename = `trading-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    if (window.AndroidExport?.saveFile) {
      const dataUri = document.output('datauristring');
      window.AndroidExport.saveFile(filename, 'application/pdf', dataUri.split(',')[1]);
    } else {
      document.save(filename);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      />

      <main className="content analytics-page">
        <header className="topbar">
          <div>
            <p className="eyebrow">Performance</p>
            <h1>Trade Analytics</h1>
          </div>
          <div className="topbar-actions analytics-export-actions">
            <button className="secondary-btn" type="button" onClick={exportCsv}>Export CSV</button>
            <button className="primary-btn" type="button" onClick={exportPdf}>Export PDF</button>
            <Link className="secondary-btn" to="/">Back to dashboard</Link>
          </div>
        </header>

        <div className="analytics-summary-grid">
          <div className="kpi-card" data-tour-target="analytics">
            <span>Total Trade P/L</span>
            <strong className={totalPnL >= 0 ? 'positive-number' : 'negative-number'}>{formatCurrency(totalPnL)}</strong>
          </div>
          <div className="kpi-card">
            <span>Average Trade</span>
            <strong className={avgTrade >= 0 ? 'positive-number' : 'negative-number'}>{formatCurrency(avgTrade)}</strong>
          </div>
          <div className="kpi-card">
            <span>Best Account</span>
            <strong>{bestAccount ? bestAccount.name : '—'}</strong>
          </div>
          <div className="kpi-card">
            <span>Best P/L</span>
            <strong className={bestAccount?.pnl >= 0 ? 'positive-number' : 'negative-number'}>
              {bestAccount ? formatCurrency(bestAccount.pnl) : '$0'}
            </strong>
          </div>
        </div>

        <section className="analytics-panel monthly-payout-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Account performance</p>
              <h2>Monthly Payout Summary</h2>
            </div>
            <div className="monthly-payout-month-controls">
              <button
                className="secondary-btn"
                type="button"
                aria-label="Previous month"
                onClick={() => changePayoutMonth(-1)}
              >
                Previous
              </button>
              <label className="field-group monthly-payout-month">
                <span>Month</span>
                <input type="month" value={payoutMonth} onChange={(event) => setPayoutMonth(event.target.value)} />
              </label>
              <button
                className="secondary-btn"
                type="button"
                aria-label="Next month"
                onClick={() => changePayoutMonth(1)}
              >
                Next
              </button>
            </div>
          </div>
          <div className="monthly-payout-totals">
            <div><span>Total recorded payouts</span><strong>{formatCurrency(monthlyPayoutTotal)}</strong></div>
            <div><span>Return on active funded amount</span><strong>{monthlyPayoutReturn === null ? '—' : `${monthlyPayoutReturn.toFixed(2)}%`}</strong></div>
          </div>
          <p className="muted">Only currently active accounts opened by the end of the selected month are listed. Historical account status is not available.</p>
          {monthlyPayoutsByActiveAccount.length ? (
            <div className="monthly-payout-list">
              <div className="monthly-payout-item monthly-payout-list-head" aria-hidden="true">
                <span>Active account</span>
                <span>Recorded payouts</span>
                <strong>Return</strong>
              </div>
              {monthlyPayoutsByActiveAccount.map((account) => (
                <div className="monthly-payout-item" key={account.name}>
                  <span>{account.name}</span>
                  <span>{formatCurrency(account.payoutAmount)} payout</span>
                  <strong>{account.returnPercent === null ? '—' : `${account.returnPercent.toFixed(2)}%`}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No active accounts existed in {new Date(`${payoutMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
          )}
        </section>

        <SharePanel
          accounts={accounts}
          monthlyPayouts={monthlyPayoutsByActiveAccount}
          payoutMonth={payoutMonth}
          ownerName={user?.name}
          shareTypes={['monthly-payouts']}
          defaultShareType="monthly-payouts"
        />

        <section className="analytics-panel filter-panel" aria-label="Trade filters">
          <div className="section-head">
            <div>
              <p className="eyebrow">Trade journal</p>
              <h2>Filter trades</h2>
            </div>
            <div className="section-actions">
              <span className="section-tag">{trades.length} of {allTrades.length} trades</span>
              {hasActiveFilters && <button className="secondary-btn" type="button" onClick={clearFilters}>Clear filters</button>}
            </div>
          </div>
          <div className="analytics-filter-grid">
            <label className="field-group filter-search">
              <span>Search</span>
              <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Account, pair, setup, notes" />
            </label>
            <label className="field-group">
              <span>From</span>
              <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
            </label>
            <label className="field-group">
              <span>To</span>
              <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => updateFilter('dateTo', event.target.value)} />
            </label>
            <label className="field-group">
              <span>Account</span>
              <select value={filters.account} onChange={(event) => updateFilter('account', event.target.value)}>
                <option value="">All accounts</option>
                {accountOptions.map((account) => <option key={account}>{account}</option>)}
              </select>
            </label>
            <label className="field-group">
              <span>Pair</span>
              <select value={filters.pair} onChange={(event) => updateFilter('pair', event.target.value)}>
                <option value="">All pairs</option>
                {pairOptions.map((pair) => <option key={pair}>{pair}</option>)}
              </select>
            </label>
            <label className="field-group">
              <span>Direction</span>
              <select value={filters.direction} onChange={(event) => updateFilter('direction', event.target.value)}>
                <option value="">All directions</option>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </label>
            <label className="field-group">
              <span>Result</span>
              <select value={filters.result} onChange={(event) => updateFilter('result', event.target.value)}>
                <option value="">All results</option>
                <option value="win">Winning</option>
                <option value="loss">Losing</option>
                <option value="breakeven">Breakeven</option>
              </select>
            </label>
          </div>
        </section>

        <section className="analytics-panel">
          <div className="section-head">
            <h2>Trade History</h2>
            <div className="section-actions">
              <SortControl
                value={tradeSortBy}
                options={analyticsTradeSortOptions}
                onChange={(value) => { setTradeSortBy(value); setTradePage(1); }}
                label="Sort analytics trades"
              />
              <span className="section-tag">{trades.length} trades</span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Pair</th>
                  <th>Direction</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Lots</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {trades.length ? (
                  visibleTrades.map((trade) => (
                    <tr key={trade._id || `${trade.account}-${trade.date}-${trade.pair}`}>
                      <td>{trade.date || '—'}</td>
                      <td>{trade.account || '—'}</td>
                      <td>{trade.pair || '—'}</td>
                      <td>{trade.buySell || '—'}</td>
                      <td>{Number(trade.entryPrice || 0).toFixed(5)}</td>
                      <td>{Number(trade.exitPrice || 0).toFixed(5)}</td>
                      <td>{Number(trade.lotSize || 0).toFixed(2)}</td>
                      <td>{Number(trade.sl || 0).toFixed(5)}</td>
                      <td>{Number(trade.tp || 0).toFixed(5)}</td>
                      <td className={getTradePnl(trade) >= 0 ? 'positive-number' : 'negative-number'}>
                        {formatCurrency(getTradePnl(trade))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="empty-cell">No trades recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="trade-pagination analytics-trade-pagination" aria-label="Analytics trade history pages">
            <label className="trade-page-size" htmlFor="analytics-trade-page-size">
              <span>Rows per page</span>
              <select
                id="analytics-trade-page-size"
                value={tradePageSize}
                onChange={(event) => {
                  const nextSize = event.target.value === 'all' ? 'all' : Number(event.target.value);
                  setTradePageSize(nextSize);
                  setTradePage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </label>
            <span className="trade-page-summary">Showing {firstVisibleTrade}-{lastVisibleTrade} of {trades.length} trades</span>
            <div className="trade-page-buttons">
              <button
                type="button"
                className="secondary-btn"
                disabled={currentTradePage <= 1 || tradePageSize === 'all'}
                onClick={() => setTradePage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>Page {currentTradePage} of {tradePageCount}</span>
              <button
                type="button"
                className="secondary-btn"
                disabled={currentTradePage >= tradePageCount || tradePageSize === 'all'}
                onClick={() => setTradePage((page) => Math.min(tradePageCount, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <div className="analytics-panel chart-panel analytics-lower-panel">
          <div className="section-head">
            <h2>Cumulative P/L</h2>
            <ChartTypeSelect
              value={chartTypes.cumulative}
              onChange={(type) => updateChartType('cumulative', type)}
              options={trendChartTypes}
              label="cumulative P/L"
            />
          </div>
          {dailyPerformance.length ? (
            <div className="analytics-chart">
              <AnalyticsChart type={chartTypes.cumulative} data={dailyPerformance} categoryKey="date" series={[{ dataKey: 'cumulativePnl', name: 'Cumulative P/L' }]} dateAxis theme={theme} />
            </div>
          ) : <p className="empty-state">No trade data matches these filters.</p>}
        </div>

        <div className="analytics-panel chart-panel">
          <div className="section-head">
            <h2>Account Performance</h2>
            <div className="section-actions">
              <ChartTypeSelect
                value={chartTypes.accountPnl}
                onChange={(type) => updateChartType('accountPnl', type)}
                options={categoryChartTypes.filter((option) => option.value !== 'pie')}
                label="account performance"
              />
              <SortControl value={performanceSortBy} options={performanceSortOptions} onChange={setPerformanceSortBy} label="Sort account performance" />
            </div>
          </div>
          {sortedAccountPerformance.length ? (
            <div className="analytics-chart account-performance-chart">
              <AnalyticsChart type={chartTypes.accountPnl} data={sortedAccountPerformance} categoryKey="name" series={[{ dataKey: 'pnl', name: 'Trade P/L', color: '#0f766e' }]} horizontal={chartTypes.accountPnl === 'bar'} theme={theme} />
            </div>
          ) : <p className="empty-state">No account trade data matches these filters.</p>}
        </div>

        <div className="analytics-panel chart-panel">
          <div className="section-head">
            <h2>Daily P/L</h2>
            <ChartTypeSelect
              value={chartTypes.dailyPnl}
              onChange={(type) => updateChartType('dailyPnl', type)}
              options={trendChartTypes}
              label="daily P/L"
            />
          </div>
          {dailyPerformance.length ? (
            <div className="analytics-chart">
              <AnalyticsChart
                type={chartTypes.dailyPnl}
                data={dailyPerformance}
                categoryKey="date"
                series={[{ dataKey: 'dailyPnl', name: 'Daily P/L', color: '#2563eb' }]}
                dateAxis
                theme={theme}
              />
            </div>
          ) : <p className="empty-state">No trade data matches these filters.</p>}
        </div>

        <section className="analytics-chart-grid" aria-label="Additional trading analytics">
          <div className="analytics-panel chart-panel">
            <div className="section-head">
              <h2>Trades by Day</h2>
              <ChartTypeSelect value={chartTypes.trades} onChange={(type) => updateChartType('trades', type)} options={categoryChartTypes} label="trades by day" />
            </div>
            {(chartTypes.trades === 'pie' ? tradeOutcomeTotals : dailyTradeVolume).length ? (
              <div className="analytics-chart">
                <AnalyticsChart
                  type={chartTypes.trades}
                  data={chartTypes.trades === 'pie' ? tradeOutcomeTotals : dailyTradeVolume}
                  categoryKey={chartTypes.trades === 'pie' ? 'result' : 'date'}
                  series={chartTypes.trades === 'pie'
                    ? [{ dataKey: 'count', name: 'Trades' }]
                    : [
                      { dataKey: 'wins', name: 'Wins', color: '#0f766e', stackId: 'trades' },
                      { dataKey: 'losses', name: 'Losses', color: '#dc5a4f', stackId: 'trades' },
                      { dataKey: 'breakeven', name: 'Breakeven', color: '#94a3b8', stackId: 'trades' },
                    ]}
                  dateAxis={chartTypes.trades !== 'pie'}
                  valueType="number"
                  theme={theme}
                />
              </div>
            ) : <p className="empty-state">No trade data matches these filters.</p>}
          </div>

          <div className="analytics-panel chart-panel">
            <div className="section-head">
              <h2>Payout History</h2>
              <ChartTypeSelect value={chartTypes.payouts} onChange={(type) => updateChartType('payouts', type)} options={categoryChartTypes} label="payout history" />
            </div>
            {(chartTypes.payouts === 'pie' ? payoutStatusTotals : payoutHistory).length ? (
              <div className="analytics-chart">
                <AnalyticsChart
                  type={chartTypes.payouts}
                  data={chartTypes.payouts === 'pie' ? payoutStatusTotals : payoutHistory}
                  categoryKey={chartTypes.payouts === 'pie' ? 'status' : 'date'}
                  series={chartTypes.payouts === 'pie'
                    ? [{ dataKey: 'amount', name: 'Payouts' }]
                    : [
                      { dataKey: 'approved', name: 'Approved', color: '#0f766e', stackId: 'payouts' },
                      { dataKey: 'pending', name: 'Pending', color: '#e6a23c', stackId: 'payouts' },
                      { dataKey: 'rejected', name: 'Rejected', color: '#dc5a4f', stackId: 'payouts' },
                      { dataKey: 'other', name: 'Other', color: '#64748b', stackId: 'payouts' },
                    ]}
                  dateAxis={chartTypes.payouts !== 'pie'}
                  theme={theme}
                />
              </div>
            ) : <p className="empty-state">No payouts recorded yet.</p>}
          </div>

          <div className="analytics-panel chart-panel">
            <div className="section-head">
              <h2>Accounts by Status</h2>
              <ChartTypeSelect value={chartTypes.accountStatus} onChange={(type) => updateChartType('accountStatus', type)} options={statusChartTypes} label="account status" />
            </div>
            {accountStatusCounts.length ? (
              <div className="analytics-chart account-performance-chart">
                <AnalyticsChart type={chartTypes.accountStatus} data={accountStatusCounts} categoryKey="status" series={[{ dataKey: 'count', name: 'Accounts' }]} horizontal={chartTypes.accountStatus === 'bar'} valueType="number" theme={theme} />
              </div>
            ) : <p className="empty-state">No accounts recorded yet.</p>}
          </div>

          <div className="analytics-panel chart-panel">
            <div className="section-head">
              <h2>Planned Funding by Firm</h2>
              <ChartTypeSelect value={chartTypes.plannedFunding} onChange={(type) => updateChartType('plannedFunding', type)} options={statusChartTypes} label="planned funding" />
            </div>
            {plannedFunding.length ? (
              <div className="analytics-chart account-performance-chart">
                <AnalyticsChart type={chartTypes.plannedFunding} data={plannedFunding} categoryKey="company" series={[{ dataKey: 'size', name: 'Planned funding', color: '#2563eb' }]} horizontal={chartTypes.plannedFunding === 'bar'} theme={theme} />
              </div>
            ) : <p className="empty-state">No planned accounts recorded yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default TradeAnalyticsPage;
