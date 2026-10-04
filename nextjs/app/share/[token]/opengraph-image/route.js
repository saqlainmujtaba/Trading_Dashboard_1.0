import { ImageResponse } from 'next/og';
import QRCode from 'qrcode/lib/core/qrcode.js';

export const runtime = 'edge';

export async function GET(request, { params }) {
  const { token } = await params;
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/shares/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!response.ok) return new Response('Share unavailable', { status: 404 });
  const { share } = await response.json();
  const highlights = (share.snapshot.highlights || []).slice(0, 3);
  const rows = (share.snapshot.rows || []).slice(0, 4);
  const columns = share.snapshot.columns || [];
  const isTrade = share.type === 'trade' && rows.length === 1
    && columns.some((column) => /^entry(?: price)?$/i.test(column))
    && columns.some((column) => /^exit(?: price)?$/i.test(column));
  const isAccount = share.type === 'account' && rows.length === 1;
  const tradeDetails = isTrade
    ? [
      ['Instrument', /pair|instrument/i],
      ['Direction', /side|direction/i],
      ['Entry price', /^entry(?: price)?$/i],
      ['Exit price', /^exit(?: price)?$/i],
      ['Lot size', /lots?|lot size/i],
      ['Stop loss (SL)', /^sl$|stop loss/i],
      ['Take profit (TP)', /^tp$|take profit/i],
      ['Risk', /^risk/i],
      ['P/L', /p\/l|profit|loss/i],
    ].map(([label, expression]) => ({
      label,
      value: rows[0][columns.findIndex((column) => expression.test(column))] ?? '—',
    }))
    : [];
  const accountDetails = isAccount
    ? [
      ['Status', /^status$/i],
      ['Type', /^type$/i],
      ['Start date', /^start date$|purchase date/i],
      ['Starting balance', /^starting balance$/i],
      ['Current balance', /^current balance$|^balance$/i],
      ['Payouts', /^payouts?$|payout received/i],
      ['Total lots traded', /^total lots traded$/i],
    ].map(([label, expression]) => ({
      label,
      value: rows[0][columns.findIndex((column) => expression.test(column))] ?? '—',
    }))
    : [];
  const shareDetails = isTrade ? tradeDetails : accountDetails;
  const pnlColor = (label, value) => {
    if (!/p\/l|profit|loss/i.test(label)) return '#ffffff';
    const amount = Number(String(value).replace(/[^\d.-]/g, ''));
    return amount < 0 ? '#f87171' : '#34d399';
  };
  const shareUrl = new URL(`/share/${encodeURIComponent(token)}`, origin).toString();
  const qr = QRCode.create(shareUrl, { errorCorrectionLevel: 'M' });
  const qrSize = qr.modules.size + 8;
  let qrPath = '';
  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      if (qr.modules.data[row * qr.modules.size + column]) {
        qrPath += `M${column + 4} ${row + 4}h1v1h-1z`;
      }
    }
  }

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '64px 76px',
        background: 'linear-gradient(135deg, #0b1220, #172b49)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 40, right: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 160, height: 160, padding: 8, borderRadius: 12, background: '#ffffff' }}>
          <svg width="140" height="140" viewBox={`0 0 ${qrSize} ${qrSize}`} shapeRendering="crispEdges">
            <rect x="0" y="0" width={qrSize} height={qrSize} fill="#ffffff" />
            <path d={qrPath} fill="#0b1220" />
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', color: '#60a5fa', fontSize: 22, fontWeight: 700 }}>
          PERSONAL TRADING DASHBOARD
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 280, height: 88, padding: '12px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.09)' }}>
            <div style={{ color: '#94a3b8', fontSize: 15, letterSpacing: 1 }}>TRADER</div>
            <div style={{ marginTop: 5, color: '#ffffff', fontSize: 25, fontWeight: 700 }}>{String(share.ownerName || 'Trader').slice(0, 28)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 38, fontWeight: 700 }}>{share.title.slice(0, 50)}</div>
            <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 20 }}>{(share.description || 'Shared trading snapshot').slice(0, 85)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 22 }}>
          {highlights.map((item) => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.09)' }}>
              <div style={{ color: '#94a3b8', fontSize: 16 }}>{String(item.label).slice(0, 26)}</div>
              <div style={{ marginTop: 8, color: pnlColor(item.label, item.value), fontSize: 24, fontWeight: 700 }}>{String(item.value).slice(0, 22)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28, color: '#e2e8f0', fontSize: 18 }}>
          {shareDetails.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
              {shareDetails.map((detail) => (
                <div key={detail.label} style={{ display: 'flex', width: '31%', gap: 8, fontSize: 17 }}>
                  <span style={{ color: '#94a3b8' }}>{detail.label}:</span>
                  <span style={{ color: pnlColor(detail.label, detail.value), fontWeight: 600 }}>{String(detail.value).slice(0, 22)}</span>
                </div>
              ))}
            </div>
          ) : rows.map((row, index) => (
            <div key={index}>{row.slice(0, 4).map(String).join('  ·  ').slice(0, 96)}</div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
