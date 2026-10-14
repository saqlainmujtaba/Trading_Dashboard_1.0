import mongoose from 'mongoose';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import DirectMessage from '../models/DirectMessage.js';

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  tradingAlias: user.profile?.tradingAlias || '',
  country: user.profile?.country || '',
  bio: user.profile?.bio || '',
});

export const searchUsers = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 80);
    const filter = { _id: { $ne: req.user.id }, isDemo: { $ne: true } };
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(escaped, 'i') }, { 'profile.tradingAlias': new RegExp(escaped, 'i') }];
    }
    const users = await User.find(filter).select('name profile.tradingAlias profile.country profile.bio').sort({ name: 1 }).limit(50).lean();
    const ids = users.map((user) => user._id);
    const relations = await FriendRequest.find({ $or: [{ from: req.user.id, to: { $in: ids } }, { to: req.user.id, from: { $in: ids } }] }).lean();
    res.json(users.map((user) => {
      const relation = relations.find((item) => String(item.from) === String(user._id) || String(item.to) === String(user._id));
      let connection = 'none';
      if (relation?.status === 'accepted') connection = 'friend';
      else if (relation?.status === 'pending') connection = String(relation.from) === String(req.user.id) ? 'sent' : 'received';
      return { ...publicUser(user), connection, requestId: relation?._id || null };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Could not search users.', error: error.message });
  }
};

export const getConnections = async (req, res) => {
  try {
    const relations = await FriendRequest.find({ $or: [{ from: req.user.id }, { to: req.user.id }] }).sort({ updatedAt: -1 }).lean();
    const ids = [...new Set(relations.map((item) => String(item.from) === String(req.user.id) ? item.to : item.from).map(String))];
    const users = await User.find({ _id: { $in: ids } }).select('name profile.tradingAlias profile.country profile.bio').lean();
    const userMap = new Map(users.map((user) => [String(user._id), publicUser(user)]));
    const friends = [];
    const incoming = [];
    const outgoing = [];
    relations.forEach((relation) => {
      const isFrom = String(relation.from) === String(req.user.id);
      const otherId = isFrom ? relation.to : relation.from;
      const user = userMap.get(String(otherId));
      if (!user) return;
      if (relation.status === 'accepted') friends.push(user);
      if (relation.status === 'pending') (isFrom ? outgoing : incoming).push({ ...user, requestId: relation._id });
    });
    res.json({ friends, incoming, outgoing });
  } catch (error) {
    res.status(500).json({ message: 'Could not load friends.', error: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const recentMessages = await DirectMessage.find({ $or: [{ from: req.user.id }, { to: req.user.id }] })
      .sort({ createdAt: -1 }).limit(500).lean();
    const peers = [];
    const latest = new Map();
    recentMessages.forEach((message) => {
      const peerId = String(message.from) === String(req.user.id) ? message.to : message.from;
      const key = String(peerId);
      if (!latest.has(key)) {
        peers.push(peerId);
        latest.set(key, message);
      }
    });
    const users = await User.find({ _id: { $in: peers } }).select('name role profile.tradingAlias profile.country profile.bio').lean();
    const userMap = new Map(users.map((person) => [String(person._id), person]));
    res.json(peers.map((peerId) => {
      const person = userMap.get(String(peerId));
      const message = latest.get(String(peerId));
      return { ...publicUser(person || { _id: peerId, name: 'Former user' }), isAdmin: person?.role === 'admin', lastMessage: message.text, updatedAt: message.createdAt };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Could not load your chats.', error: error.message });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid user.' });
    const recipient = await User.findById(req.params.userId).select('_id isDemo');
    if (!recipient || recipient.isDemo || String(recipient._id) === String(req.user.id)) return res.status(404).json({ message: 'User not found.' });
    const existing = await FriendRequest.findOne({ $or: [{ from: req.user.id, to: recipient._id }, { from: recipient._id, to: req.user.id }] });
    if (existing?.status === 'accepted') return res.status(409).json({ message: 'You are already friends.' });
    if (existing?.status === 'pending') return res.status(409).json({ message: 'A friend request is already pending.' });
    if (existing) {
      existing.from = req.user.id;
      existing.to = recipient._id;
      existing.status = 'pending';
      await existing.save();
      return res.status(201).json({ requestId: existing._id });
    }
    const request = await FriendRequest.create({ from: req.user.id, to: recipient._id });
    return res.status(201).json({ requestId: request._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A friend request is already pending.' });
    return res.status(500).json({ message: 'Could not send friend request.', error: error.message });
  }
};

export const respondFriendRequest = async (req, res) => {
  const { status } = req.body || {};
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Choose accepted or rejected.' });
  try {
    const request = await FriendRequest.findOneAndUpdate(
      { _id: req.params.requestId, to: req.user.id, status: 'pending' },
      { $set: { status } },
      { new: true },
    );
    if (!request) return res.status(404).json({ message: 'Pending friend request not found.' });
    res.json({ status: request.status });
  } catch (error) {
    res.status(500).json({ message: 'Could not update friend request.', error: error.message });
  }
};

const canChat = async (currentUserId, otherUserId) => {
  const [currentUser, otherUser, relation] = await Promise.all([
    User.findById(currentUserId).select('role'),
    User.findById(otherUserId).select('role'),
    FriendRequest.exists({ status: 'accepted', $or: [{ from: currentUserId, to: otherUserId }, { from: otherUserId, to: currentUserId }] }),
  ]);
  return currentUser?.role === 'admin' || otherUser?.role === 'admin' || Boolean(relation);
};

export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid user.' });
    if (!(await canChat(req.user.id, userId))) return res.status(403).json({ message: 'Add this user as a friend to start a chat.' });
    const messages = await DirectMessage.find({ $or: [{ from: req.user.id, to: userId }, { from: userId, to: req.user.id }] }).sort({ createdAt: 1 }).limit(300).lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Could not load messages.', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 4000) return res.status(400).json({ message: 'Message must be between 1 and 4000 characters.' });
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId) || String(userId) === String(req.user.id)) return res.status(400).json({ message: 'Invalid recipient.' });
    if (!(await User.exists({ _id: userId, isDemo: { $ne: true } }))) return res.status(404).json({ message: 'User not found.' });
    if (!(await canChat(req.user.id, userId))) return res.status(403).json({ message: 'Add this user as a friend to start a chat.' });
    const message = await DirectMessage.create({ from: req.user.id, to: userId, text });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Could not send message.', error: error.message });
  }
};
