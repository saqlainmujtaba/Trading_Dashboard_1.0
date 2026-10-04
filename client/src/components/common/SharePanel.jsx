import { useEffect, useMemo, useState } from 'react';
import api from '../../api';

const money = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);

const monthLabel = (month) => month
  ? new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  : 'Selected month';

const tradeColumns = ['Date', 'Account', 'Instrument', 'Direction', 'Entry', 'Exit', 'Lots', 'Stop loss', 'Take profit', 'Risk', 'P/L'];
const tradeRow = (trade) => [
  trade.date || '—',
  trade.account || '—',
  trade.pair || '—',
  trade.buySell || '—',
  String(trade.entryPrice ?? '—'),
  String(trade.exitPrice ?? '—'),
  String(trade.lotSize ?? '—'),
  String(trade.sl ?? '—'),
  String(trade.tp ?? '—'),
  money(trade.risk),
  money(trade.pnl),
];

const drawShareImage = async (share) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is not supported by this browser.');

  const gradient = context.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#0b1220');
  gradient.addColorStop(1, '#172b49');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#60a5fa';
  context.fillRect(72, 80, 8, 104);
  context.fillStyle = '#ffffff';
  context.font = '700 42px Segoe UI, sans-serif';
  context.fillText('TRADING DASHBOARD', 104, 112);
  context.fillStyle = '#94a3b8';
  context.font = '20px Segoe UI, sans-serif';
  context.fillText(`Shared by ${String(share.ownerName || 'Trader').slice(0, 40)}`, 104, 146);
  context.font = '700 38px Segoe UI, sans-serif';
  context.fillText(share.title.slice(0, 42), 104, 178);
  context.fillStyle = '#cbd5e1';
  context.font = '24px Segoe UI, sans-serif';
  context.fillText(share.description.slice(0, 78), 104, 224);

  (share.snapshot.highlights || []).slice(0, 3).forEach((item, index) => {
    const x = 104 + index * 350;
    context.fillStyle = 'rgba(255,255,255,0.09)';
    context.fillRect(x, 276, 320, 100);
    context.fillStyle = '#94a3b8';
    context.font = '18px Segoe UI, sans-serif';
    context.fillText(String(item.label).slice(0, 28), x + 20, 310);
    context.fillStyle = '#ffffff';
    context.font = '700 28px Segoe UI, sans-serif';
    context.fillText(String(item.value).slice(0, 20), x + 20, 352);
  });

  const lines = (share.snapshot.rows || []).slice(0, 5).map((row) => row.slice(0, 4).join('  ·  '));
  context.fillStyle = '#e2e8f0';
  context.font = '19px Segoe UI, sans-serif';
  lines.forEach((line, index) => context.fillText(line.slice(0, 92), 104, 426 + index * 34));
  context.fillStyle = '#94a3b8';
  context.font = '18px Segoe UI, sans-serif';
  context.fillText('Shared with a read-only link', 104, 590);

  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error('Could not create the share image.')),
    'image/png',
  ));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'trading-dashboard-share.png';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const SharePanel = ({
  accounts = [],
  allTrades = [],
  filteredTrades = [],
  payouts = [],
  monthlyPayouts = [],
  payoutMonth,
  ownerName = 'Trader',
  shareTypes,
  defaultShareType = 'trade-history',
}) => {
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const availableShareTypes = shareTypes || [
    'trade-history',
    'trade',
    'monthly-trading',
    'account',
    'account-trading',
    'monthly-payouts',
    'payout-history',
    'active-accounts',
  ];
  const [shareType, setShareType] = useState(defaultShareType);
  const [tradeMonth, setTradeMonth] = useState(thisMonth);
  const [selectedTrade, setSelectedTrade] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [createdShareId, setCreatedShareId] = useState('');
  const [shares, setShares] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const activeAccounts = accounts.filter((account) => String(account.status || '').toLowerCase() === 'active');

  const content = useMemo(() => {
    if (shareType === 'trade') {
      const trade = allTrades.find((item, index) => String(item._id || item.id || index) === selectedTrade);
      if (!trade) return null;
      return {
        title: `${trade.pair || 'Trade'} ${trade.buySell || ''}`.trim(),
        description: `${trade.date || 'Trade'} · ${trade.account || 'Trading account'}`,
        snapshot: {
          columns: tradeColumns,
          rows: [tradeRow(trade)],
          highlights: [
            { label: 'Entry', value: String(trade.entryPrice ?? '—') },
            { label: 'Lots', value: String(trade.lotSize ?? '—') },
            { label: 'Trade P/L', value: money(trade.pnl) },
          ],
        },
      };
    }

    if (shareType === 'trade-history') {
      return {
        title: 'Trade History',
        description: `${filteredTrades.length} trades`,
        snapshot: {
          columns: tradeColumns,
          rows: filteredTrades.slice(0, 500).map(tradeRow),
          highlights: [
            { label: 'Trades', value: String(filteredTrades.length) },
            { label: 'Net P/L', value: money(filteredTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0)) },
          ],
        },
      };
    }

    if (shareType === 'monthly-trading') {
      const trades = allTrades.filter((trade) => trade.date?.slice(0, 7) === tradeMonth);
      const netPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
      return {
        title: `${monthLabel(tradeMonth)} Trading`,
        description: `Trading results for ${monthLabel(tradeMonth)}`,
        snapshot: {
          columns: tradeColumns,
          rows: trades.slice(0, 500).map(tradeRow),
          highlights: [
            { label: 'Trades', value: String(trades.length) },
            { label: 'Net P/L', value: money(netPnl) },
            { label: 'Win rate', value: `${trades.length ? (trades.filter((trade) => Number(trade.pnl) > 0).length / trades.length * 100).toFixed(1) : '0.0'}%` },
          ],
        },
      };
    }

    if (shareType === 'account' || shareType === 'account-trading') {
      const account = accounts.find((item, index) => String(item._id || item.id || index) === selectedAccount);
      if (!account) return null;
      const profit = Number(account.balance || 0) - Number(account.startingBalance || 0);
      if (shareType === 'account-trading') {
        const trades = allTrades.filter((trade) => trade.account === account.name);
        const netPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
        return {
          title: `${account.name} Trading History`,
          description: `${trades.length} trades · ${account.propFirm || 'Trading account'}`,
          snapshot: {
            columns: tradeColumns,
            rows: trades.slice(0, 500).map(tradeRow),
            highlights: [
              { label: 'Trades', value: String(trades.length) },
              { label: 'Net P/L', value: money(netPnl) },
              { label: 'Account status', value: account.status || 'Unknown' },
            ],
          },
        };
      }
      return {
        title: `${account.name} Account`,
        description: `${account.propFirm || 'Trading account'} · ${account.status || 'Unknown'}`,
        snapshot: {
          columns: ['Metric', 'Value'],
          rows: [
            ['Status', account.status || 'Unknown'],
            ['Prop firm', account.propFirm || '—'],
            ['Account type', account.type || '—'],
            ['Funded amount', money(account.fundedAmount)],
            ['Current balance', money(account.balance)],
            ['Profit / loss', money(profit)],
          ],
          highlights: [
            { label: 'Funded', value: money(account.fundedAmount) },
            { label: 'Balance', value: money(account.balance) },
            { label: 'Profit / loss', value: money(profit) },
          ],
        },
      };
    }

    if (shareType === 'active-accounts') {
      return {
        title: 'Active Trading Accounts',
        description: `${activeAccounts.length} active accounts`,
        snapshot: {
          columns: ['Account', 'Prop firm', 'Type', 'Funded amount', 'Balance', 'Status'],
          rows: activeAccounts.map((account) => [
            account.name || '—',
            account.propFirm || '—',
            account.type || '—',
            money(account.fundedAmount),
            money(account.balance),
            account.status || 'Active',
          ]),
          highlights: [
            { label: 'Active accounts', value: String(activeAccounts.length) },
            { label: 'Funded amount', value: money(activeAccounts.reduce((sum, account) => sum + (Number(account.fundedAmount) || 0), 0)) },
          ],
        },
      };
    }

    if (shareType === 'payout-history') {
      return {
        title: 'Payout History',
        description: `${payouts.length} recorded payouts`,
        snapshot: {
          columns: ['Date', 'Account', 'Amount', 'Method', 'Status'],
          rows: payouts.slice(0, 500).map((payout) => [
            payout.date || '—',
            payout.account || '—',
            money(payout.amount),
            payout.method || '—',
            payout.status || '—',
          ]),
          highlights: [
            { label: 'Payouts', value: String(payouts.length) },
            { label: 'Total', value: money(payouts.reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0)) },
          ],
        },
      };
    }

    const totalPayout = monthlyPayouts.reduce((sum, account) => sum + account.payoutAmount, 0);
    const totalFunded = monthlyPayouts.reduce((sum, account) => sum + account.fundedAmount, 0);
    return {
      title: `${monthLabel(payoutMonth)} Payout Summary`,
      description: `${monthlyPayouts.length} active accounts existed by the end of ${monthLabel(payoutMonth)}`,
      snapshot: {
        columns: ['Account', 'Recorded payouts', 'Funded amount', 'Return'],
        rows: monthlyPayouts.map((account) => [
          account.name,
          money(account.payoutAmount),
          money(account.fundedAmount),
          account.returnPercent === null ? '—' : `${account.returnPercent.toFixed(2)}%`,
        ]),
        highlights: [
          { label: 'Recorded payouts', value: money(totalPayout) },
          { label: 'Funded amount', value: money(totalFunded) },
          { label: 'Return', value: totalFunded ? `${(totalPayout / totalFunded * 100).toFixed(2)}%` : '—' },
        ],
      },
    };
  }, [shareType, allTrades, filteredTrades, accounts, payouts, monthlyPayouts, payoutMonth, tradeMonth, selectedTrade, selectedAccount, activeAccounts]);

  const loadShares = async () => {
    try {
      const response = await api.get('/shares');
      setShares(response.data.shares || []);
    } catch (error) {
      console.error('Failed to load share links', error);
      setMessage(error.response?.data?.message || 'Could not load your share links.');
    }
  };

  useEffect(() => { loadShares(); }, []);

  const createLink = async () => {
    if (!content) return;
    setIsCreating(true);
    setMessage('');
    try {
      const response = await api.post('/shares', { type: shareType, ...content });
      const shareOrigin = (import.meta.env.VITE_SHARE_BASE_URL || window.location.origin).replace(/\/+$/, '');
      const link = `${shareOrigin}/share/${response.data.token}`;
      setCreatedLink(link);
      setCreatedShareId(response.data.share.id);
      await loadShares();
    } catch (error) {
      console.error('Failed to create share link', error);
      setMessage(error.response?.data?.message || 'Could not create the share link.');
    } finally {
      setIsCreating(false);
    }
  };

  const revokeLink = async (id) => {
    try {
      await api.delete(`/shares/${id}`);
      setShares((current) => current.filter((share) => share.id !== id));
      if (createdShareId === id) {
        setCreatedLink('');
        setCreatedShareId('');
      }
      setMessage('Share link revoked.');
    } catch (error) {
      console.error('Failed to revoke share link', error);
      setMessage(error.response?.data?.message || 'Could not revoke the share link.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdLink);
      setMessage('Link copied. Anyone with it can view this shared snapshot.');
    } catch (error) {
      console.error('Failed to copy share link', error);
      setMessage('Could not copy automatically. Select and copy the link above.');
    }
  };

  const shareOptions = [
    ['trade-history', 'Filtered trade history'],
    ['trade', 'Single trade'],
    ['monthly-trading', 'Single month trading'],
    ['account', 'Single account'],
    ['account-trading', 'Single account trading history'],
    ['payout-history', 'Payout history'],
    ['monthly-payouts', 'Monthly payout summary'],
    ['active-accounts', 'Active accounts list'],
  ];

  return (
    <section className="share-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Share your progress</p>
          <h2>Share {shareTypes?.length === 1 ? (shareOptions.find(([value]) => value === shareTypes[0])?.[1] || 'trading') : 'trading'}</h2>
        </div>
        <button type="button" className="secondary-btn" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? 'Close sharing' : 'Share'}
        </button>
      </div>
      {isOpen && (
        <>
      <p className="muted">Create a public link with a social preview, or download a share image. Anyone with a link can view its saved snapshot until you revoke it. Save the link when it is created; it is shown only once.</p>
      <div className="share-controls">
        <label className="field-group">
          <span>What would you like to share?</span>
          <select value={shareType} onChange={(event) => { setShareType(event.target.value); setCreatedLink(''); setMessage(''); }}>
            {shareOptions.filter(([value]) => availableShareTypes.includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {shareType === 'trade' && (
          <label className="field-group">
            <span>Trade</span>
            <select value={selectedTrade} onChange={(event) => setSelectedTrade(event.target.value)}>
              <option value="">Select a trade</option>
              {allTrades.map((trade, index) => (
                <option key={trade._id || trade.id || index} value={String(trade._id || trade.id || index)}>
                  {trade.date} · {trade.pair} · {trade.buySell} · {trade.account}
                </option>
              ))}
            </select>
          </label>
        )}
        {(shareType === 'account' || shareType === 'account-trading') && (
          <label className="field-group">
            <span>Account</span>
            <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
              <option value="">Select an account</option>
              {accounts.map((account, index) => (
                <option key={account._id || account.id || index} value={String(account._id || account.id || index)}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {shareType === 'monthly-trading' && (
          <label className="field-group">
            <span>Trading month</span>
            <input type="month" value={tradeMonth} onChange={(event) => setTradeMonth(event.target.value)} />
          </label>
        )}
      </div>
      {content && (
        <div className="share-preview" aria-live="polite">
          <strong>{content.title}</strong>
          <span>{content.description}</span>
          <span>Shared by {ownerName || 'Trader'}</span>
          <span>{content.snapshot.rows.length} rows · {content.snapshot.highlights?.map((item) => `${item.label}: ${item.value}`).join(' · ')}</span>
        </div>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={!content || isCreating || (shareType === 'monthly-trading' && !tradeMonth)}
          onClick={createLink}
        >
          {isCreating ? 'Creating link...' : 'Create share link'}
        </button>
        <button type="button" className="secondary-btn" disabled={!content} onClick={() => drawShareImage({ ...content, ownerName }).catch((error) => setMessage(error.message))}>
          Download image
        </button>
      </div>
      {createdLink && (
        <div className="share-link-result">
          <label className="field-group">
            <span>Public share link</span>
            <input value={createdLink} readOnly onFocus={(event) => event.target.select()} />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={copyLink}>Copy link</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="secondary-btn" onClick={() => navigator.share({ title: content.title, text: content.description, url: createdLink }).catch((error) => {
                if (error.name !== 'AbortError') setMessage('Could not open the share menu.');
              })}>Share…</button>
            )}
          </div>
        </div>
      )}
      {message && <p className="share-message" role="status">{message}</p>}
      {shares.length > 0 && (
        <div className="share-management">
          <h3>Your active share links</h3>
          {shares.map((share) => (
            <div className="share-management-row" key={share.id}>
              <span>{share.title}</span>
              <button type="button" className="danger-btn" onClick={() => revokeLink(share.id)}>Revoke</button>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </section>
  );
};

export default SharePanel;
