import { ImageResponse } from 'next/og';

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
  const isTrade = rows.length === 1
    && columns.some((column) => /^entry$/i.test(column))
    && columns.some((column) => /^exit$/i.test(column));
  const tradeDetails = isTrade
    ? [
      ['Instrument', /pair|instrument/i],
      ['Direction', /side|direction/i],
      ['Entry', /^entry$/i],
      ['Exit', /^exit$/i],
      ['Lots', /lots?/i],
      ['Stop loss', /^sl$|stop loss/i],
      ['Take profit', /^tp$|take profit/i],
      ['Risk', /^risk/i],
      ['P/L', /p\/l|profit|loss/i],
    ].map(([label, expression]) => ({
      label,
      value: rows[0][columns.findIndex((column) => expression.test(column))] ?? '—',
    }))
    : [];
  const pnlColor = (label, value) => {
    if (!/p\/l|profit|loss/i.test(label)) return '#ffffff';
    const amount = Number(String(value).replace(/[^\d.-]/g, ''));
    return amount < 0 ? '#f87171' : '#34d399';
  };

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
      }}>
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
          {isTrade ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
              {tradeDetails.map((detail) => (
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
        <div style={{ marginTop: 'auto', color: '#94a3b8', fontSize: 16 }}>Read-only shared snapshot</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
