import User from '../models/User.js';
import Account from '../models/Account.js';
import PlannedAccount from '../models/PlannedAccount.js';
import Trade from '../models/Trade.js';
import Payout from '../models/Payout.js';

const models = { accounts: Account, plannedAccounts: PlannedAccount, trades: Trade, payouts: Payout };
const userSummary = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || 'user',
  isDemo: Boolean(user.isDemo),
  createdAt: user.createdAt,
  profile: user.profile || {},
});

export const listAdminUsers = async (_req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    const [accounts, plannedAccounts, trades, payouts] = await Promise.all([
      Account.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]),
      PlannedAccount.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]),
      Trade.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]),
      Payout.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]),
    ]);
    const countMaps = Object.fromEntries(Object.entries({ accounts, plannedAccounts, trades, payouts }).map(([key, rows]) => [
      key, new Map(rows.map((row) => [String(row._id), row.count])),
    ]));
    res.json({
      totalUsers: users.length,
      totalAdmins: users.filter((user) => user.role === 'admin').length,
      users: users.map((user) => ({
        ...userSummary(user),
        counts: Object.fromEntries(Object.keys(countMaps).map((key) => [key, countMaps[key].get(String(user._id)) || 0])),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load users.', error: error.message });
  }
};

export const getAdminUserData = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const records = Object.fromEntries(await Promise.all(Object.entries(models).map(async ([key, Model]) => [
      key, await Model.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
    ])));
    res.json({ user: userSummary(user), ...records });
  } catch (error) {
    res.status(500).json({ message: 'Could not load user data.', error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be user or admin.' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (String(user._id) === String(req.adminUser._id) && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin access.' });
    }
    user.role = role;
    await user.save();
    res.json({ _id: user._id, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Could not update user role.', error: error.message });
  }
};
