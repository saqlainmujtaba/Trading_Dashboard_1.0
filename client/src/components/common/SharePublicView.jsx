'use client';

import { useEffect, useState } from 'react';
import api from '../../api';

const SharePublicView = ({ initialShare, token }) => {
  const [share, setShare] = useState(initialShare || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!initialShare);

  useEffect(() => {
    if (initialShare || !token) return;
    let mounted = true;
    api.get(`/shares/${encodeURIComponent(token)}`)
      .then((response) => { if (mounted) setShare(response.data.share); })
      .catch((requestError) => {
        if (mounted) setError(requestError.response?.data?.message || 'This share link is unavailable.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialShare, token]);

  if (loading) return <main className="share-public-page"><p className="empty-state">Loading shared trading summary…</p></main>;
  if (!share) return <main className="share-public-page"><p className="empty-state">{error || 'This share link is unavailable or has been revoked.'}</p></main>;

  return (
    <main className="share-public-page">
      <header className="share-public-header">
        <a className="brand-home" href="/" aria-label="Trading dashboard home">
          <span className="brand-badge">PT</span>
          <span><strong>Trading</strong><small>Dashboard</small></span>
        </a>
        <span className="section-tag">Read-only share</span>
      </header>
      <section className="share-public-card">
        <p className="eyebrow">Shared trading snapshot</p>
        <h1>{share.title}</h1>
        {share.description && <p className="muted">{share.description}</p>}
        {share.snapshot.highlights?.length > 0 && (
          <div className="share-public-highlights">
            {share.snapshot.highlights.map((item) => (
              <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr>{share.snapshot.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {share.snapshot.rows.length ? share.snapshot.rows.map((row, index) => (
                <tr key={`${index}-${row[0]}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
              )) : <tr><td className="empty-cell" colSpan={share.snapshot.columns.length}>No records in this shared summary.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="share-public-footnote">This is a read-only snapshot. It does not update when the original dashboard changes.</p>
      </section>
    </main>
  );
};

export default SharePublicView;
