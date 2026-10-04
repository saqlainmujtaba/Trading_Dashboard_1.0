import { notFound } from 'next/navigation';
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

  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const image = new URL(`/share/${encodeURIComponent(token)}/opengraph-image`, origin);

  return {
    title: `${share.title} — shared by ${share.ownerName} | Trading Dashboard`,
    description: `${share.description || 'A read-only trading summary shared from Trading Dashboard.'} · Shared by ${share.ownerName}`,
    openGraph: {
      title: `${share.title} — shared by ${share.ownerName}`,
      description: `${share.description || 'A read-only trading summary shared from Trading Dashboard.'} · Shared by ${share.ownerName}`,
      type: 'article',
      siteName: 'Trading Dashboard',
      images: [{ url: image, width: 1200, height: 630, alt: share.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${share.title} — shared by ${share.ownerName}`,
      description: `${share.description || 'A read-only trading summary shared from Trading Dashboard.'} · Shared by ${share.ownerName}`,
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
