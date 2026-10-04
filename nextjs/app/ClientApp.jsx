'use client';

import dynamic from 'next/dynamic';

const RouterApp = dynamic(() => import('./RouterApp'), {
  ssr: false,
  loading: () => <main className="app-loading">Loading Trading Dashboard...</main>,
});

export default function ClientApp() {
  return <RouterApp />;
}
