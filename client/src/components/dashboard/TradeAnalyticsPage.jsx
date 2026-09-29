import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SortControl from '../common/SortControl';
import { sortRows } from '../common/sortRows';
import Sidebar from '../layout/Sidebar';

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

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getTradePnl = (trade = {}) => {
  const entryPrice = Number(trade.entryPrice || 0);
  const exitPrice = Number(trade.exitPrice || 0);
  const lotSize = Number(trade.lotSize || 0);
  const direction = trade.buySell === 'Sell' ? -1 : 1;
  const pair = (trade.pair || '').toUpperCase().replace('/', '');
  const contractSize = pair === 'XAUUSD' ? 100 : 100000;

  return Number((((exitPrice - entryPrice) * direction * lotSize * contractSize)).toFixed(2));
};

const TradeAnalyticsPage = ({ user, dashboardData, onLogout, theme, onToggleTheme }) => {
  const [tradeSortBy, setTradeSortBy] = useState('date.desc');
  const [performanceSortBy, setPerformanceSortBy] = useState('pnl.desc');
  const accounts = dashboardData?.accounts || [];
  const trades = sortRows(dashboardData?.trades || [], tradeSortBy);

  const accountPerformance = useMemo(() => {
    const totals = new Map();

    accounts.forEach((account) => {
      totals.set(account.name, {
        name: account.name,
        pnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
      });
    });

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

    return [...totals.values()].sort((a, b) => b.pnl - a.pnl);
  }, [accounts, trades]);
  const sortedAccountPerformance = sortRows(accountPerformance, performanceSortBy);

  const totalPnL = accountPerformance.reduce((sum, item) => sum + Number(item.pnl || 0), 0);
  const bestAccount = accountPerformance.reduce((best, item) => (!best || item.pnl > best.pnl ? item : best), null);
  const avgTrade = trades.length ? totalPnL / trades.length : 0;
  const maxAccountValue = Math.max(...accountPerformance.map((item) => Math.abs(item.pnl || 0)), 1);

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
          <div className="topbar-actions">
            <Link className="secondary-btn" to="/">Back to dashboard</Link>
          </div>
        </header>

        <div className="analytics-summary-grid">
          <div className="kpi-card">
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

        <section className="analytics-layout">
          <div className="analytics-panel">
            <div className="section-head">
              <h2>Trade History</h2>
              <div className="section-actions">
                <SortControl value={tradeSortBy} options={analyticsTradeSortOptions} onChange={setTradeSortBy} label="Sort analytics trades" />
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
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length ? (
                    trades.map((trade) => (
                      <tr key={trade._id || `${trade.account}-${trade.date}-${trade.pair}`}>
                        <td>{trade.date || '—'}</td>
                        <td>{trade.account || '—'}</td>
                        <td>{trade.pair || '—'}</td>
                        <td>{trade.buySell || '—'}</td>
                        <td className={getTradePnl(trade) >= 0 ? 'positive-number' : 'negative-number'}>
                          {formatCurrency(getTradePnl(trade))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-cell">No trades recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analytics-panel chart-panel">
            <div className="section-head">
              <h2>Account Performance</h2>
              <SortControl value={performanceSortBy} options={performanceSortOptions} onChange={setPerformanceSortBy} label="Sort account performance" />
            </div>

            <div className="account-chart-list">
              {sortedAccountPerformance.length ? (
                sortedAccountPerformance.map((account) => {
                  const height = `${Math.max(18, (Math.abs(account.pnl) / maxAccountValue) * 100)}%`;

                  return (
                    <div key={account.name} className="chart-row">
                      <div className="chart-row-header">
                        <span>{account.name}</span>
                        <strong className={account.pnl >= 0 ? 'positive-number' : 'negative-number'}>
                          {formatCurrency(account.pnl)}
                        </strong>
                      </div>

                      <div className="chart-track">
                        <div
                          className={`chart-bar ${account.pnl >= 0 ? 'gain' : 'loss'}`}
                          style={{ height }}
                        />
                      </div>

                      <small>
                        {account.wins}W / {account.losses}L • {account.trades} trades
                      </small>
                    </div>
                  );
                })
              ) : (
                <p className="empty-state">No account trade data available yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TradeAnalyticsPage;
