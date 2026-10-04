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
        <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 18 }}>Shared by {String(share.ownerName || 'Trader').slice(0, 40)}</div>
        <div style={{ marginTop: 18, fontSize: 42, fontWeight: 700 }}>{share.title.slice(0, 60)}</div>
        <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 22 }}>{(share.description || 'Shared trading snapshot').slice(0, 100)}</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 32 }}>
          {highlights.map((item) => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.09)' }}>
              <div style={{ color: '#94a3b8', fontSize: 16 }}>{String(item.label).slice(0, 26)}</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{String(item.value).slice(0, 22)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28, color: '#e2e8f0', fontSize: 18 }}>
          {rows.map((row, index) => (
            <div key={index}>{row.slice(0, 4).map(String).join('  ·  ').slice(0, 96)}</div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
