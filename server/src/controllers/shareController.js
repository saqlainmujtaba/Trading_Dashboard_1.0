import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import Share from '../models/Share.js';

const allowedTypes = new Set([
  'trade',
  'trade-history',
  'monthly-trading',
  'account',
  'account-trading',
  'active-accounts',
  'monthly-payouts',
]);
const memoryShares = new Map();
const maxSnapshotBytes = 400_000;

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const publicShare = (share) => ({
  id: String(share._id || share.id),
  type: share.type,
  title: share.title,
  description: share.description,
  snapshot: share.snapshot,
  createdAt: share.createdAt,
});

const findShareByToken = async (token) => {
  const tokenHash = hashToken(token);
  if (mongoose.connection.readyState === 1) {
    return Share.findOne({ tokenHash, revokedAt: null }).lean();
  }
  return memoryShares.get(tokenHash) || null;
};

export const createShare = async (req, res) => {
  const { type, title, description = '', snapshot } = req.body || {};
  if (!allowedTypes.has(type) || typeof title !== 'string' || !title.trim() || !isPlainObject(snapshot)) {
    return res.status(400).json({ message: 'Provide a valid share type, title, and snapshot.' });
  }
  if (typeof description !== 'string' || title.length > 120 || description.length > 300) {
    return res.status(400).json({ message: 'Share title or description is too long.' });
  }
  if (!Array.isArray(snapshot.columns) || !Array.isArray(snapshot.rows)
      || !snapshot.columns.every((column) => typeof column === 'string')
      || !snapshot.rows.every((row) => Array.isArray(row)
        && row.length === snapshot.columns.length
        && row.every((cell) => ['string', 'number'].includes(typeof cell)))
      || (snapshot.highlights !== undefined
        && (!Array.isArray(snapshot.highlights)
          || !snapshot.highlights.every((item) => isPlainObject(item)
            && typeof item.label === 'string'
            && ['string', 'number'].includes(typeof item.value))))) {
    return res.status(400).json({ message: 'Share data must contain columns, rows, and optional highlights.' });
  }

  const snapshotJson = JSON.stringify(snapshot);
  if (Buffer.byteLength(snapshotJson, 'utf8') > maxSnapshotBytes
      || snapshot.columns.length > 20
      || snapshot.rows.length > 500
      || snapshot.columns.some((column) => column.length > 80)
      || snapshot.rows.some((row) => row.length !== snapshot.columns.length || row.some((cell) => String(cell).length > 500))
      || (snapshot.highlights || []).length > 12) {
    return res.status(413).json({ message: 'Share data is too large.' });
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const shareData = {
    ownerId: String(req.user.id),
    tokenHash,
    type,
    title: title.trim(),
    description: description.trim(),
    snapshot,
    revokedAt: null,
    createdAt: new Date(),
  };
  let savedShare;

  if (mongoose.connection.readyState === 1) {
    savedShare = await Share.create(shareData);
  } else {
    savedShare = { ...shareData, id: randomBytes(12).toString('hex') };
    memoryShares.set(tokenHash, savedShare);
  }

  return res.status(201).json({ share: publicShare(savedShare), token });
};

export const getPublicShare = async (req, res) => {
  const share = await findShareByToken(req.params.token);
  if (!share || share.revokedAt) return res.status(404).json({ message: 'This share link is unavailable.' });
  return res.json({ share: publicShare(share) });
};

export const listMyShares = async (req, res) => {
  const shares = mongoose.connection.readyState === 1
    ? await Share.find({ ownerId: String(req.user.id), revokedAt: null }).sort({ createdAt: -1 }).lean()
    : [...memoryShares.values()]
      .filter((share) => share.ownerId === String(req.user.id) && !share.revokedAt)
      .sort((first, second) => second.createdAt - first.createdAt);
  return res.json({ shares: shares.map(publicShare) });
};

export const revokeShare = async (req, res) => {
  let revoked;
  if (mongoose.connection.readyState === 1) {
    revoked = await Share.findOneAndUpdate(
      { _id: req.params.id, ownerId: String(req.user.id), revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );
  } else {
    const entry = [...memoryShares.entries()].find(([, share]) => share.id === req.params.id
      && share.ownerId === String(req.user.id)
      && !share.revokedAt);
    if (entry) {
      entry[1].revokedAt = new Date();
      revoked = entry[1];
    }
  }

  if (!revoked) return res.status(404).json({ message: 'Share link not found.' });
  return res.json({ message: 'Share link revoked.' });
};

export const findShareForPreview = async (token) => {
  const share = await findShareByToken(token);
  return share && !share.revokedAt ? publicShare(share) : null;
};
