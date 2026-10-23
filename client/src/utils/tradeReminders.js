const DAY_MS = 24 * 60 * 60 * 1000;
const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const toMidnight = (value) => new Date(`${value}T00:00:00`);
const daysBetween = (from, to) => Math.floor((toMidnight(to) - toMidnight(from)) / DAY_MS);

export const sendDueTradeReminders = ({ accounts = [], trades = [], userId }) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let lastSentByAccount = {};
  const storageKey = `trade-reminder-last-shown-${userId || 'user'}`;
  try { lastSentByAccount = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { lastSentByAccount = {}; }
  const today = localDateKey();
  let changed = false;

  accounts.filter((account) => account.status === 'Active' && !account.archived).forEach((account) => {
    const accountTrades = trades.filter((trade) => trade.account === account.name && trade.date)
      .map((trade) => String(trade.date).slice(0, 10))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort();
    const lastTrade = accountTrades.at(-1) || '';
    const inactivityAnchor = lastTrade || String(account.purchaseDate || '').slice(0, 10);
    const accountId = account._id || account.name;
    if (!inactivityAnchor || lastSentByAccount[accountId] === today || daysBetween(inactivityAnchor, today) < 7) return;

    const daysInactive = daysBetween(inactivityAnchor, today);
    new Notification('Time to trade', {
      body: `No trade has been recorded in ${account.name} for ${daysInactive} days. Log a trade to stop reminders.`,
      tag: `trade-reminder-${accountId}`,
    });
    lastSentByAccount[accountId] = today;
    changed = true;
  });

  if (changed) localStorage.setItem(storageKey, JSON.stringify(lastSentByAccount));
};
