import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createShare,
  getPublicShare,
  listMyShares,
  revokeShare,
} from '../src/controllers/shareController.js';

const createResponse = () => ({
  statusCode: 200,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createRequest = (body, userId = 'share-owner') => ({
  body,
  user: { id: userId, name: 'Test Trader' },
  params: {},
});

const sampleShare = {
  type: 'trade',
  title: 'EURUSD trade',
  description: 'A shared trade snapshot',
  snapshot: {
    columns: ['Pair', 'P/L'],
    rows: [['EURUSD', '$125']],
    highlights: [{ label: 'Net P/L', value: '$125' }],
  },
};

test('share links expose a read-only snapshot without owner or token hashes', async () => {
  const createResponseObject = createResponse();
  await createShare(createRequest(sampleShare), createResponseObject);

  assert.equal(createResponseObject.statusCode, 201);
  const { token, share } = createResponseObject.body;
  assert.ok(token);
  assert.equal(share.title, sampleShare.title);
  assert.equal(share.ownerName, 'Test Trader');
  assert.equal('ownerId' in share, false);
  assert.equal('tokenHash' in share, false);

  const publicResponse = createResponse();
  await getPublicShare({ params: { token } }, publicResponse);
  assert.equal(publicResponse.body.share.id, share.id);
  assert.deepEqual(publicResponse.body.share.snapshot, sampleShare.snapshot);
});

test('share owners can revoke links and revoked links are unavailable', async () => {
  const created = createResponse();
  await createShare(createRequest(sampleShare), created);
  const { token, share } = created.body;

  const forbidden = createResponse();
  await revokeShare({ params: { id: share.id }, user: { id: 'different-owner' } }, forbidden);
  assert.equal(forbidden.statusCode, 404);

  const revoked = createResponse();
  await revokeShare({ params: { id: share.id }, user: { id: 'share-owner' } }, revoked);
  assert.equal(revoked.statusCode, 200);

  const unavailable = createResponse();
  await getPublicShare({ params: { token } }, unavailable);
  assert.equal(unavailable.statusCode, 404);

  const ownerShares = createResponse();
  await listMyShares({ user: { id: 'share-owner' } }, ownerShares);
  assert.equal(ownerShares.body.shares.some((item) => item.id === share.id), false);
});

test('share creation rejects malformed snapshots', async () => {
  const response = createResponse();
  await createShare(createRequest({ ...sampleShare, snapshot: { columns: ['Pair'], rows: [['EURUSD', 'extra']] } }), response);
  assert.equal(response.statusCode, 400);
});
