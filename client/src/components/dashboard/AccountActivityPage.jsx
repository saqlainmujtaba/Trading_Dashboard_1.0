import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';

const DAY_MS = 24 * 60 * 60 * 1000;
const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const dateAtMidnight = (value) => new Date(`${value}T00:00:00`);
const daysBetween = (from, to) => Math.floor((dateAtMidnight(to) - dateAtMidnight(from)) / DAY_MS);
const formatDate = (value) => value
  ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(dateAtMidnight(value))
  : 'No trades yet';

const getAccountActivity = (account, trades, today) => {
  const tradeDates = [...new Set(trades
    .filter((trade) => trade.account === account.name && trade.date)
    .map((trade) => String(trade.date).slice(0, 10)))]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  const firstTrade = tradeDates[0] || '';
  const lastTrade = tradeDates.at(-1) || '';
  const inactivityAnchor = lastTrade || String(account.purchaseDate || '').slice(0, 10);
  let streak = 0;
  if (lastTrade && daysBetween(lastTrade, today) <= 1) {
    let expected = dateAtMidnight(lastTrade);
    for (let index = tradeDates.length - 1; index >= 0; index -= 1) {
      if (dateAtMidnight(tradeDates[index]).getTime() !== expected.getTime()) break;
      streak += 1;
      expected = new Date(expected.getTime() - DAY_MS);
    }
  }
  return {
    firstTrade,
    lastTrade,
    streak,
    daysSinceLastTrade: inactivityAnchor ? daysBetween(inactivityAnchor, today) : null,
  };
};

const AccountActivityPage = ({ user, dashboardData, onLogout, theme, onToggleTheme }) => {
  const today = localDateKey();
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const [notice, setNotice] = useState('');
  const accounts = (dashboardData?.accounts || []).filter((account) => account.status === 'Active' && !account.archived);
  const trades = dashboardData?.trades || [];

  const activity = useMemo(() => accounts.map((account) => ({
    account,
    ...getAccountActivity(account, trades, today),
  })), [accounts, trades, today]);
  const accountsNeedingTrade = activity.filter((item) => item.daysSinceLastTrade !== null && item.daysSinceLastTrade >= 7);

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotice('Browser notifications are not supported in this browser.');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    setNotice(result === 'granted' ? 'Daily trade reminders are enabled.' : 'Notification permission was not granted.');
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      <main className="content analytics-page">
        <header className="topbar">
          <div><p className="eyebrow">Account discipline</p><h1>Active Account Activity</h1></div>
          <div className="topbar-actions">
            <button className="primary-btn" type="button" onClick={enableNotifications} disabled={permission === 'granted'}>
              {permission === 'granted' ? 'Reminders enabled' : 'Enable trade reminders'}
            </button>
            <Link className="secondary-btn" to="/">Back to dashboard</Link>
          </div>
        </header>

        <section className="analytics-summary-grid">
          <div className="kpi-card"><span>Active accounts</span><strong>{activity.length}</strong></div>
          <div className="kpi-card"><span>Needs a trade</span><strong>{accountsNeedingTrade.length}</strong></div>
          <div className="kpi-card"><span>Reminder status</span><strong>{permission === 'granted' ? 'On' : permission === 'unsupported' ? 'Unavailable' : 'Off'}</strong></div>
        </section>

        {notice && <p className="success-text" role="status">{notice}</p>}
        <section className="analytics-panel">
          <div className="section-head"><div><p className="eyebrow">Trade history</p><h2>Account activity and streaks</h2></div></div>
          <p className="muted">A streak counts consecutive calendar days with at least one recorded trade. Reminders start after 7 full days without a trade and repeat once per day until a new trade is recorded.</p>
          {activity.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Account</th><th>Stage</th><th>First trade</th><th>Last trade</th><th>Days inactive</th><th>Current streak</th><th>Status</th></tr></thead>
                <tbody>{activity.map(({ account, firstTrade, lastTrade, daysSinceLastTrade, streak }) => (
                  <tr key={account._id || account.name}>
                    <td><strong>{account.name}</strong><br /><span className="muted">{account.propFirm}</span></td>
                    <td>{account.type || 'Instant'}</td>
                    <td>{formatDate(firstTrade)}</td>
                    <td>{formatDate(lastTrade)}</td>
                    <td>{daysSinceLastTrade === null ? '—' : daysSinceLastTrade}</td>
                    <td>{streak} {streak === 1 ? 'day' : 'days'}</td>
                    <td>{daysSinceLastTrade === null ? 'No trade recorded' : daysSinceLastTrade >= 7 ? 'Reminder due' : 'On track'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="empty-state">No active accounts found. Add or activate an account to track its trading activity.</p>}
        </section>
        <p className="muted">Daily reminders are sent while this dashboard is open. Browser push while the app is closed needs server push credentials and background push setup.</p>
      </main>
    </div>
  );
};

export default AccountActivityPage;
