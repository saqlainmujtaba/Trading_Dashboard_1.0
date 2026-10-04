import { useState } from 'react';
import QRCode from 'qrcode';
import api from '../../api';
import ActionIcon from './ActionIcon';

const fillRoundedRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fill();
};

const getShareTarget = (item) => {
  if (item.type === 'active-accounts') return 'all active accounts';
  if (item.type === 'account') return 'this account';
  if (item.type === 'account-trading') return 'this account’s trades';
  if (item.type === 'trade-history') return 'filtered trade history';
  if (item.type === 'payout-history') return 'payout history';
  if (item.type === 'monthly-payouts') return 'monthly payout summary';
  if (item.type === 'trade') return 'this trade';
  if (item.type === 'payout') return 'this payout';
  return item.label || item.title;
};

const drawShareImage = async (item, ownerName, shareUrl) => {
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
  context.fillRect(72, 70, 8, 490);
  context.fillStyle = '#ffffff';
  context.font = '700 28px Segoe UI, sans-serif';
  context.fillText('PERSONAL TRADING DASHBOARD', 108, 96);

  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
  const qrImage = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not prepare the share QR code.'));
    image.src = qrDataUrl;
  });
  context.fillStyle = '#ffffff';
  fillRoundedRect(context, 1004, 54, 150, 150, 12);
  context.drawImage(qrImage, 1016, 62, 126, 126);

  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.fillRect(108, 122, 310, 82);
  context.fillStyle = '#94a3b8';
  context.font = '17px Segoe UI, sans-serif';
  context.fillText('TRADER', 128, 151);
  context.fillStyle = '#ffffff';
  context.font = '700 25px Segoe UI, sans-serif';
  context.fillText(String(ownerName || 'Trader').slice(0, 27), 128, 184);

  context.font = '700 38px Segoe UI, sans-serif';
  context.fillText(item.title.slice(0, 46), 108, 258);
  context.fillStyle = '#cbd5e1';
  context.font = '21px Segoe UI, sans-serif';
  context.fillText((item.description || '').slice(0, 88), 108, 294);

  const highlights = (item.snapshot.highlights || []).slice(0, 3);
  highlights.forEach((highlight, index) => {
    const x = 108 + index * 340;
    context.fillStyle = 'rgba(255,255,255,0.08)';
    context.fillRect(x, 322, 316, 82);
    context.fillStyle = '#94a3b8';
    context.font = '16px Segoe UI, sans-serif';
    context.fillText(String(highlight.label).slice(0, 28), x + 18, 350);
    const rawValue = String(highlight.value);
    const numericValue = Number(rawValue.replace(/[^\d.-]/g, ''));
    const isPnl = /p\/l|profit|loss/i.test(highlight.label);
    context.fillStyle = isPnl ? (numericValue < 0 ? '#f87171' : '#34d399') : '#ffffff';
    context.font = '700 25px Segoe UI, sans-serif';
    context.fillText(rawValue.slice(0, 21), x + 18, 386);
  });

  const columns = item.snapshot.columns || [];
  const rows = item.snapshot.rows || [];
  const row = rows[0] || [];
  const pnlColumn = columns.findIndex((column) => /p\/l|profit|loss/i.test(column));
  if (item.type === 'account' && rows.length === 1) {
    const accountLabels = ['Status', 'Type', 'Start date', 'Starting balance', 'Current balance', 'Payouts', 'Total lots traded'];
    accountLabels.forEach((label, index) => {
      const column = index % 3;
      const line = Math.floor(index / 3);
      const x = 108 + column * 340;
      const y = 444 + line * 38;
      context.fillStyle = '#94a3b8';
      context.font = '16px Segoe UI, sans-serif';
      context.fillText(`${label}:`, x, y);
      context.fillStyle = '#e2e8f0';
      context.font = '600 17px Segoe UI, sans-serif';
      context.fillText(String(row[index] ?? '—').slice(0, 20), x + 148, y);
    });
  } else if (item.type === 'trade' && rows.length === 1 && columns.length > 5) {
    const details = [
      ['Instrument', row[2]],
      ['Direction', row[3]],
      ['Entry price', row[4]],
      ['Exit price', row[5]],
      ['Lot size', row[6]],
      ['Stop loss (SL)', row[7]],
      ['Take profit (TP)', row[8]],
      ['Risk', row[9]],
      ['P/L', row[10]],
    ];
    details.forEach(([label, value], index) => {
      const column = index % 3;
      const line = Math.floor(index / 3);
      const x = 108 + column * 340;
      const y = 444 + line * 38;
      context.fillStyle = '#94a3b8';
      context.font = '16px Segoe UI, sans-serif';
      context.fillText(`${label}:`, x, y);
      const isPnl = label === 'P/L';
      const numericValue = Number(String(value ?? '—').replace(/[^\d.-]/g, ''));
      context.fillStyle = isPnl ? (numericValue < 0 ? '#f87171' : '#34d399') : '#e2e8f0';
      context.font = '600 17px Segoe UI, sans-serif';
      context.fillText(String(value ?? '—').slice(0, 20), x + 148, y);
    });
  } else {
    rows.slice(0, 4).forEach((row, index) => {
      const y = 448 + index * 34;
      const line = row.slice(0, 4).map((cell) => String(cell)).join('  ·  ');
      context.fillStyle = '#e2e8f0';
      context.font = '18px Segoe UI, sans-serif';
      context.fillText(line.slice(0, 94), 108, y);
      if (pnlColumn >= 0) {
        const pnl = Number(String(row[pnlColumn]).replace(/[^\d.-]/g, ''));
        context.fillStyle = pnl < 0 ? '#f87171' : '#34d399';
        context.font = '700 18px Segoe UI, sans-serif';
        context.fillText(String(row[pnlColumn]).slice(0, 18), 860, y);
      }
    });
  }

  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error('Could not create the share image.')),
    'image/png',
  ));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'trading-share'}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const SharePanel = ({ items = [], ownerName = 'Trader', compact = false, showLabels = false, className = '' }) => {
  const [dialogItem, setDialogItem] = useState(null);
  const [createdLink, setCreatedLink] = useState('');
  const [createdShareId, setCreatedShareId] = useState('');
  const [createdItemKey, setCreatedItemKey] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [shareLinks, setShareLinks] = useState([]);
  const [showManage, setShowManage] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  const createShareLink = async (item) => {
    const configuredShareOrigin = import.meta.env.VITE_SHARE_BASE_URL?.trim();
    if (import.meta.env.PROD && !configuredShareOrigin) {
      throw new Error('Set VITE_SHARE_BASE_URL to your deployed Next.js site so shared links include WhatsApp previews.');
    }
    const shareOrigin = (configuredShareOrigin || window.location.origin).replace(/\/+$/, '');
    const response = await api.post('/shares', {
      type: item.type,
      title: item.title,
      description: item.description || '',
      snapshot: item.snapshot,
    });
    return {
      id: response.data.share.id,
      url: `${shareOrigin}/share/${response.data.token}`,
    };
  };

  const openShare = async (item) => {
    setDialogItem(item);
    setCreatedLink('');
    setCreatedShareId('');
    setCreatedItemKey('');
    setMessage('');
    setIsCreating(true);
    try {
      const created = await createShareLink(item);
      setCreatedLink(created.url);
      setCreatedShareId(created.id);
      setCreatedItemKey(`${item.type}:${item.title}`);
    } catch (error) {
      console.error('Failed to create share link', error);
      setMessage(error.response?.data?.message || 'Could not create the share link.');
    } finally {
      setIsCreating(false);
    }
  };

  const downloadShareImage = async (item) => {
    setShowManage(false);
    setMessage('');
    const itemKey = `${item.type}:${item.title}`;
    if (createdItemKey !== itemKey) {
      setCreatedLink('');
      setCreatedShareId('');
      setCreatedItemKey('');
    }
    setIsCreating(true);
    try {
      const created = createdLink && createdShareId && createdItemKey === itemKey
        ? { id: createdShareId, url: createdLink }
        : await createShareLink(item);
      setCreatedLink(created.url);
      setCreatedShareId(created.id);
      setCreatedItemKey(itemKey);
      await drawShareImage(item, ownerName, created.url);
      setMessage('Image downloaded. Its QR code opens this shared page.');
    } catch (error) {
      console.error('Failed to create a QR share image', error);
      setMessage(error.response?.data?.message || error.message || 'Could not create the share image.');
    } finally {
      setIsCreating(false);
    }
  };

  const loadShareLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const response = await api.get('/shares');
      setShareLinks(response.data.shares || []);
      setShowManage(true);
    } catch (error) {
      console.error('Failed to load share links', error);
      setMessage(error.response?.data?.message || 'Could not load your share links.');
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const revokeLink = async (id) => {
    try {
      await api.delete(`/shares/${id}`);
      setShareLinks((current) => current.filter((share) => share.id !== id));
      if (createdShareId === id) {
        setCreatedLink('');
        setCreatedShareId('');
        setCreatedItemKey('');
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

  return (
    <div className={`share-panel ${compact ? 'share-panel-compact' : ''} ${className}`}>
      {items.map((item) => {
        const target = getShareTarget(item);
        return (
          <div className="share-action" key={`${item.type}-${item.title}`}>
            <button
              type="button"
              className={`secondary-btn icon-action-button ${showLabels ? 'icon-action-button-labeled' : ''}`}
              onClick={() => openShare(item)}
              disabled={isCreating}
              aria-label={`Create a share link for ${target}`}
              title={`Create a share link for ${target}`}
            >
              <ActionIcon name="share" />
              {showLabels && <span className="icon-action-label">Share link</span>}
            </button>
            <button
              type="button"
              className={`secondary-btn icon-action-button ${showLabels ? 'icon-action-button-labeled' : ''}`}
              onClick={() => downloadShareImage(item)}
              disabled={isCreating}
              aria-label={`Download an image of ${target} with QR code`}
              title={`Download an image of ${target} with QR code`}
            >
              <ActionIcon name="image" />
              {showLabels && <span className="icon-action-label">Image</span>}
            </button>
          </div>
        );
      })}
      {!compact && items.length > 0 && (
        <button type="button" className="share-manage-trigger" onClick={loadShareLinks} disabled={isLoadingLinks}>
          {isLoadingLinks ? 'Loading links…' : 'Manage links'}
        </button>
      )}
      {message && !dialogItem && <p className="share-message" role="status">{message}</p>}

      {dialogItem && (
        <div className="modal-backdrop share-dialog-backdrop" onClick={() => { setDialogItem(null); setShowManage(false); }}>
          <section className="modal-panel share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Shared by {ownerName || 'Trader'}</p>
                <h3 id="share-dialog-title">{dialogItem.title}</h3>
              </div>
              <button type="button" className="icon-close" onClick={() => { setDialogItem(null); setShowManage(false); }} aria-label="Close share dialog">×</button>
            </div>
            {isCreating && <p className="muted">Creating your share link…</p>}
            {createdLink && (
              <div className="share-link-result">
                <p className="muted">Anyone with this link can view this read-only snapshot.</p>
                <label className="field-group">
                  <span>Share link</span>
                  <input value={createdLink} readOnly onFocus={(event) => event.target.select()} />
                </label>
                <div className="form-actions">
                  <button type="button" className="primary-btn" onClick={copyLink}>Copy link</button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button type="button" className="secondary-btn" onClick={() => navigator.share({ title: dialogItem.title, text: dialogItem.description, url: createdLink }).catch((error) => {
                      if (error.name !== 'AbortError') setMessage('Could not open the share menu.');
                    })}>Share…</button>
                  )}
                </div>
              </div>
            )}
            {message && <p className="share-message" role="status">{message}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn icon-action-button"
                onClick={() => downloadShareImage(dialogItem)}
                disabled={isCreating}
                aria-label={isCreating ? 'Preparing image' : 'Download image with QR code'}
                title={isCreating ? 'Preparing image' : 'Download image with QR code'}
              >
                <ActionIcon name="image" />
              </button>
              <button type="button" className="secondary-btn" onClick={loadShareLinks} disabled={isLoadingLinks}>Manage links</button>
              <button type="button" className="secondary-btn" onClick={() => { setDialogItem(null); setShowManage(false); }}>Close</button>
            </div>
            {showManage && (
              <div className="share-management">
                <h3>Your active share links</h3>
                {shareLinks.length ? shareLinks.map((share) => (
                  <div className="share-management-row" key={share.id}>
                    <span>{share.title}</span>
                    <button type="button" className="danger-btn" onClick={() => revokeLink(share.id)}>Revoke</button>
                  </div>
                )) : <p className="muted">No active share links.</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default SharePanel;
