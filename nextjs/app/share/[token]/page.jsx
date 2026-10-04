import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import connectDB from '../../../server/src/config/db.js';
import { findShareForPreview } from '../../../server/src/controllers/shareController.js';
import SharePublicView from '../../../src/components/common/SharePublicView';

export const dynamic = 'force-dynamic';

const getShare = async (token) => {
  await connectDB();
  return findShareForPreview(token);
};

export async function generateMetadata({ params }) {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) return { title: 'Share unavailable | Trading Dashboard' };

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host')?.split(',')[0].trim();
  const host = forwardedHost || requestHeaders.get('host');
  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProtocol || (host?.startsWith('localhost') ? 'http' : 'https');
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || (host ? `${protocol}://${host}` : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');
  const image = new URL(`/share/${encodeURIComponent(token)}/opengraph-image`, origin);
  const pageUrl = new URL(`/share/${encodeURIComponent(token)}`, origin);
  const title = `${share.title} — shared by ${share.ownerName} | Trading Dashboard`;
  const description = `${share.description || 'A read-only trading summary shared from Trading Dashboard.'} · Shared by ${share.ownerName}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Trading Dashboard',
      url: pageUrl,
      images: [{ url: image, width: 1200, height: 630, alt: share.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharedPage({ params }) {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) notFound();
  return <SharePublicView initialShare={share} token={token} />;
}
