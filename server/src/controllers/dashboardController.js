import Account from '../models/Account.js';
import PlannedAccount from '../models/PlannedAccount.js';
import Trade from '../models/Trade.js';
import Payout from '../models/Payout.js';
import { isMongoConnected } from '../config/db.js';

const inMemoryData = {
  accounts: [],
  plannedAccounts: [],
  trades: [],
  payouts: [],
};

const buildDashboardPayload = (userId) => {
  const accounts = isMongoConnected()
    ? []
    : inMemoryData.accounts.filter((item) => item.user === userId);
  const plannedAccounts = isMongoConnected()
    ? []
    : inMemoryData.plannedAccounts.filter((item) => item.user === userId);
  const trades = isMongoConnected()
    ? []
    : inMemoryData.trades.filter((item) => item.user === userId);
  const payouts = isMongoConnected()
    ? []
    : inMemoryData.payouts.filter((item) => item.user === userId);

  return {
    accounts,
    plannedAccounts,
    trades,
    payouts,
    stats: {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.status === 'Active').length,
      totalFunding: accounts.reduce((sum, account) => sum + (Number(account.fundedAmount) || 0), 0),
      plannedFunding: plannedAccounts.reduce((sum, account) => sum + (Number(account.size) || 0), 0),
      combinedFunding: accounts.reduce((sum, account) => sum + (Number(account.fundedAmount) || 0), 0) + plannedAccounts.reduce((sum, account) => sum + (Number(account.size) || 0), 0),
      totalProfit: trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0),
      totalPayouts: payouts.reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0),
      failedAccounts: accounts.filter((account) => account.status === 'Failed').length,
    },
  };
};

const createLocalItem = (collection, userId, payload, prefix) => {
  const item = {
    _id: `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    user: userId,
    ...payload,
  };

  inMemoryData[collection].push(item);
  return item;
};

const updateLocalItem = (collection, userId, id, payload) => {
  const index = inMemoryData[collection].findIndex((item) => item.user === userId && item._id === id);
  if (index === -1) {
    return null;
  }

  inMemoryData[collection][index] = {
    ...inMemoryData[collection][index],
    ...payload,
  };

  return inMemoryData[collection][index];
};

const deleteLocalItem = (collection, userId, id) => {
  const index = inMemoryData[collection].findIndex((item) => item.user === userId && item._id === id);
  if (index === -1) {
    return false;
  }

  inMemoryData[collection].splice(index, 1);
  return true;
};

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!isMongoConnected()) {
      return res.json(buildDashboardPayload(userId));
    }

    const [accounts, plannedAccounts, trades, payouts] = await Promise.all([
      Account.find({ user: userId }).sort({ createdAt: -1 }),
      PlannedAccount.find({ user: userId }).sort({ createdAt: -1 }),
      Trade.find({ user: userId }).sort({ date: -1 }),
      Payout.find({ user: userId }).sort({ date: -1 }),
    ]);

    const totalFunding = accounts.reduce((sum, account) => sum + (Number(account.fundedAmount) || 0), 0);
    const plannedFunding = plannedAccounts.reduce((sum, account) => sum + (Number(account.size) || 0), 0);
    const totalProfit = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
    const totalPayouts = payouts.reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0);

    res.json({
      accounts,
      plannedAccounts,
      trades,
      payouts,
      stats: {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter((account) => account.status === 'Active').length,
        totalFunding,
        plannedFunding,
        combinedFunding: totalFunding + plannedFunding,
        totalProfit,
        totalPayouts,
        failedAccounts: accounts.filter((account) => account.status === 'Failed').length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load dashboard data', error: error.message });
  }
};

export const createAccount = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const account = createLocalItem('accounts', req.user.id, req.body, 'account');
      return res.status(201).json(account);
    }

    const account = await Account.create({
      ...req.body,
      user: req.user.id,
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create account', error: error.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const updated = updateLocalItem('accounts', req.user.id, req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Account not found' });
      }
      return res.json(updated);
    }

    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update account', error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const removed = deleteLocalItem('accounts', req.user.id, req.params.id);
      if (!removed) {
        return res.status(404).json({ message: 'Account not found' });
      }
      return res.json({ message: 'Account deleted successfully' });
    }

    const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete account', error: error.message });
  }
};

export const createPlannedAccount = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const plannedAccount = createLocalItem('plannedAccounts', req.user.id, req.body, 'planned');
      return res.status(201).json(plannedAccount);
    }

    const plannedAccount = await PlannedAccount.create({
      ...req.body,
      user: req.user.id,
    });
    res.status(201).json(plannedAccount);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create planned account', error: error.message });
  }
};

export const updatePlannedAccount = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const updated = updateLocalItem('plannedAccounts', req.user.id, req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Planned account not found' });
      }
      return res.json(updated);
    }

    const plannedAccount = await PlannedAccount.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!plannedAccount) {
      return res.status(404).json({ message: 'Planned account not found' });
    }

    res.json(plannedAccount);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update planned account', error: error.message });
  }
};

export const deletePlannedAccount = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const removed = deleteLocalItem('plannedAccounts', req.user.id, req.params.id);
      if (!removed) {
        return res.status(404).json({ message: 'Planned account not found' });
      }
      return res.json({ message: 'Planned account deleted successfully' });
    }

    const plannedAccount = await PlannedAccount.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!plannedAccount) {
      return res.status(404).json({ message: 'Planned account not found' });
    }

    res.json({ message: 'Planned account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete planned account', error: error.message });
  }
};

export const createTrade = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const trade = createLocalItem('trades', req.user.id, req.body, 'trade');
      return res.status(201).json(trade);
    }

    const trade = await Trade.create({
      ...req.body,
      user: req.user.id,
    });
    res.status(201).json(trade);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create trade', error: error.message });
  }
};

export const updateTrade = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const updated = updateLocalItem('trades', req.user.id, req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Trade not found' });
      }
      return res.json(updated);
    }

    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update trade', error: error.message });
  }
};

export const deleteTrade = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const removed = deleteLocalItem('trades', req.user.id, req.params.id);
      if (!removed) {
        return res.status(404).json({ message: 'Trade not found' });
      }
      return res.json({ message: 'Trade deleted successfully' });
    }

    const trade = await Trade.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete trade', error: error.message });
  }
};

export const createPayout = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const payout = createLocalItem('payouts', req.user.id, req.body, 'payout');
      return res.status(201).json(payout);
    }

    const payout = await Payout.create({
      ...req.body,
      user: req.user.id,
    });
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create payout', error: error.message });
  }
};

export const updatePayout = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const updated = updateLocalItem('payouts', req.user.id, req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Payout not found' });
      }
      return res.json(updated);
    }

    const payout = await Payout.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update payout', error: error.message });
  }
};

export const deletePayout = async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const removed = deleteLocalItem('payouts', req.user.id, req.params.id);
      if (!removed) {
        return res.status(404).json({ message: 'Payout not found' });
      }
      return res.json({ message: 'Payout deleted successfully' });
    }

    const payout = await Payout.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    res.json({ message: 'Payout deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete payout', error: error.message });
  }
};
