import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import createAuthToken from '../config/authToken.js';
import Account from '../models/Account.js';
import Payout from '../models/Payout.js';
import PlannedAccount from '../models/PlannedAccount.js';
import Trade from '../models/Trade.js';
import User from '../models/User.js';
import { removeInMemoryDashboardData, seedInMemoryDemoData } from './dashboardController.js';

const inMemoryUsers = [];
const DEMO_LIFETIME_MS = 10 * 24 * 60 * 60 * 1000;
const profileFields = [
  'fullName',
  'tradingAlias',
  'phone',
  'city',
  'country',
  'timezone',
  'riskProfile',
  'tradingStyle',
  'experience',
  'primaryMarkets',
  'strategy',
  'preferredPairs',
  'bio',
  'goals',
  'customFields',
  'monthlyReturnPercent',
];

const findUserById = async (id) => {
  let user;
  if (mongoose.connection.readyState === 1) {
    user = await User.findById(id);
  } else {
    user = inMemoryUsers.find((item) => item._id === id);
  }

  if (user?.isDemo && user.expiresAt && user.expiresAt <= new Date()) return null;
  return user;
};

const removeDemoUserData = async (userIds) => Promise.all([
  Account.deleteMany({ user: { $in: userIds } }),
  PlannedAccount.deleteMany({ user: { $in: userIds } }),
  Trade.deleteMany({ user: { $in: userIds } }),
  Payout.deleteMany({ user: { $in: userIds } }),
]);

export const purgeExpiredDemoAccounts = async (now = new Date()) => {
  if (mongoose.connection.readyState === 1) {
    const expiredUsers = await User.find({ isDemo: true, expiresAt: { $lte: now } }).select('_id').lean();
    if (!expiredUsers.length) return 0;

    const userIds = expiredUsers.map((user) => user._id);
    await removeDemoUserData(userIds);
    const result = await User.deleteMany({ _id: { $in: userIds }, isDemo: true, expiresAt: { $lte: now } });
    return result.deletedCount;
  }

  const expiredUsers = inMemoryUsers.filter((user) => user.isDemo && user.expiresAt <= now);
  const expiredIds = new Set(expiredUsers.map((user) => user._id));
  removeInMemoryDashboardData(expiredIds);
  for (let index = inMemoryUsers.length - 1; index >= 0; index -= 1) {
    if (expiredIds.has(inMemoryUsers[index]._id)) inMemoryUsers.splice(index, 1);
  }
  return expiredUsers.length;
};

const createDemoUser = async () => {
  const email = `demo-${randomUUID()}@demo.trading-dashboard.local`;
  const password = randomBytes(32).toString('hex');
  const user = {
    name: 'Demo Trader',
    email,
    password: await bcrypt.hash(password, 10),
    isDemo: true,
    expiresAt: new Date(Date.now() + DEMO_LIFETIME_MS),
  };

  if (mongoose.connection.readyState === 1) {
    return User.create(user);
  }

  const localUser = { ...user, _id: `local-demo-${randomUUID()}` };
  inMemoryUsers.push(localUser);
  return localUser;
};

const dateFromToday = (dayOffset) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
};

const seedDemoContent = async (user) => {
  if (!user.isDemo) return;
  if (mongoose.connection.readyState !== 1) {
    seedInMemoryDemoData(user._id);
    user.profile = {
      fullName: 'Demo Trader',
      tradingAlias: 'Northstar',
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
      riskProfile: 'Moderate',
      tradingStyle: 'Day',
      experience: '3-5 years',
      primaryMarkets: 'Forex and Gold',
      strategy: 'London breakout with strict risk limits',
      preferredPairs: 'EURUSD, GBPUSD, XAUUSD',
      bio: 'Sample profile for exploring the dashboard features.',
      goals: 'Stay consistent, protect capital, and follow the trading plan.',
    };
    return;
  }

  const claim = await User.updateOne(
    { _id: user._id, isDemo: true, demoDataSeeded: { $ne: true } },
    { $set: { demoDataSeeded: true } }
  );
  if (!claim.modifiedCount) return;

  try {
    const existingData = await Promise.all([
      Account.exists({ user: user._id }),
      PlannedAccount.exists({ user: user._id }),
      Trade.exists({ user: user._id }),
      Payout.exists({ user: user._id }),
    ]);
    if (existingData.some(Boolean)) return;

    const accounts = [
      {
        name: 'FundedSquad 100K',
        propFirm: 'FundedSquad',
        type: '2-Step',
        fundedAmount: 100000,
        startingBalance: 100000,
        balance: 103420,
        profitPercent: 3.42,
        maxDailyLoss: 5,
        maxOverallLoss: 10,
        profitTarget: 8,
        nextPayoutDate: dateFromToday(7),
        payoutReceived: 1900,
        status: 'Active',
        purchaseDate: dateFromToday(-75),
      },
      {
        name: 'Northstar 50K',
        propFirm: 'Northstar Funding',
        type: 'Evaluation',
        fundedAmount: 50000,
        startingBalance: 50000,
        balance: 51075,
        profitPercent: 2.15,
        maxDailyLoss: 5,
        maxOverallLoss: 10,
        profitTarget: 8,
        nextPayoutDate: dateFromToday(12),
        payoutReceived: 975,
        status: 'Active',
        purchaseDate: dateFromToday(-48),
      },
      {
        name: 'Apex Challenge 25K',
        propFirm: 'Apex Capital',
        type: '2-Step',
        fundedAmount: 25000,
        startingBalance: 25000,
        balance: 23600,
        profitPercent: -5.6,
        maxDailyLoss: 5,
        maxOverallLoss: 10,
        profitTarget: 8,
        payoutReceived: 0,
        status: 'Failed',
        purchaseDate: dateFromToday(-90),
      },
    ];
    await Account.create(accounts.map((account) => ({ ...account, user: user._id })));

    const plannedAccounts = [
      {
        company: 'FTMO',
        size: 100000,
        type: '2-Step',
        purchaseDate: dateFromToday(14),
        cost: 540,
        priority: 'High',
        notes: 'Next evaluation after the current payout cycle',
      },
      {
        company: 'FundedSquad',
        size: 50000,
        type: 'Evaluation',
        purchaseDate: dateFromToday(30),
        cost: 299,
        priority: 'Medium',
        notes: 'Compare evaluation rules before purchase',
      },
      {
        company: 'Nova Funding',
        size: 25000,
        type: 'Instant',
        purchaseDate: dateFromToday(45),
        cost: 169,
        priority: 'Low',
        notes: 'Optional smaller account for diversification',
      },
    ];
    await PlannedAccount.create(plannedAccounts.map((account) => ({ ...account, user: user._id })));

    const trades = [
      { account: 'FundedSquad 100K', propFirm: 'FundedSquad', pair: 'EURUSD', buySell: 'Buy', entryPrice: 1.082, exitPrice: 1.085, lotSize: 0.2, risk: 150, pnl: 60, rr: '0.4', rrMode: 'auto', reason: 'London session breakout', notes: 'Waited for a clean retest.', date: dateFromToday(-2) },
      { account: 'FundedSquad 100K', propFirm: 'FundedSquad', pair: 'EURUSD', buySell: 'Sell', entryPrice: 1.09, exitPrice: 1.087, lotSize: 0.2, risk: 120, pnl: 60, rr: '0.5', rrMode: 'auto', reason: 'Resistance rejection', notes: 'Reduced risk ahead of news.', date: dateFromToday(-4) },
      { account: 'Northstar 50K', propFirm: 'Northstar Funding', pair: 'GBPUSD', buySell: 'Sell', entryPrice: 1.27, exitPrice: 1.272, lotSize: 0.2, risk: 100, pnl: -40, rr: '-0.4', rrMode: 'auto', reason: 'Range breakdown', notes: 'Stopped at planned risk.', date: dateFromToday(-6) },
      { account: 'FundedSquad 100K', propFirm: 'FundedSquad', pair: 'XAUUSD', buySell: 'Buy', entryPrice: 2330, exitPrice: 2342, lotSize: 0.3, risk: 180, pnl: 360, rr: '2', rrMode: 'auto', reason: 'Higher-low continuation', notes: 'Partial close at first target.', date: dateFromToday(-9) },
      { account: 'Northstar 50K', propFirm: 'Northstar Funding', pair: 'GBPUSD', buySell: 'Buy', entryPrice: 1.266, exitPrice: 1.2685, lotSize: 0.2, risk: 110, pnl: 50, rr: '0.45', rrMode: 'auto', reason: 'Support retest', notes: 'Closed into nearby resistance.', date: dateFromToday(-12) },
      { account: 'FundedSquad 100K', propFirm: 'FundedSquad', pair: 'XAUUSD', buySell: 'Sell', entryPrice: 2368, exitPrice: 2357, lotSize: 0.4, risk: 200, pnl: 440, rr: '2.2', rrMode: 'auto', reason: 'Failed breakout', notes: 'Held to the planned target.', date: dateFromToday(-16) },
    ];
    await Trade.create(trades.map((trade) => ({ ...trade, user: user._id })));

    const payouts = [
      { account: 'FundedSquad 100K', date: dateFromToday(-8), amount: 1250, method: 'Bank Transfer', status: 'Approved' },
      { account: 'FundedSquad 100K', date: dateFromToday(-2), amount: 650, method: 'Crypto', status: 'Pending' },
      { account: 'Northstar 50K', date: dateFromToday(-18), amount: 975, method: 'PayPal', status: 'Approved' },
    ];
    await Payout.create(payouts.map((payout) => ({ ...payout, user: user._id })));

    user.profile = {
      fullName: 'Demo Trader',
      tradingAlias: 'Northstar',
      phone: '',
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
      riskProfile: 'Moderate',
      tradingStyle: 'Day',
      experience: '3-5 years',
      primaryMarkets: 'Forex and Gold',
      strategy: 'London breakout with strict risk limits',
      preferredPairs: 'EURUSD, GBPUSD, XAUUSD',
      bio: 'Sample profile for exploring the dashboard features.',
      goals: 'Stay consistent, protect capital, and follow the trading plan.',
      customFields: [
        { id: 'demo-broker', label: 'Broker', value: 'Demo Broker' },
        { id: 'demo-focus', label: 'Current focus', value: 'Process consistency' },
      ],
      ...(user.profile || {}),
    };
    await user.save();
  } catch (error) {
    await User.updateOne({ _id: user._id }, { $set: { demoDataSeeded: false } });
    console.error('Unable to seed demo dashboard content:', error.message);
  }
};

export const registerUser = async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  if (email === 'demo@trading.com') {
    return res.status(400).json({ message: 'This email is reserved for the private demo login.' });
  }

  try {
    const existingUser = mongoose.connection.readyState === 1
      ? await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      : inMemoryUsers.find((user) => user.email.toLowerCase() === email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const userData = {
      name,
      email,
      password: await bcrypt.hash(password, 10),
    };
    const user = mongoose.connection.readyState === 1
      ? await User.create(userData)
      : { ...userData, _id: `local-${randomUUID()}` };
    if (mongoose.connection.readyState !== 1) inMemoryUsers.push(user);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: createAuthToken(user),
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'User already exists' });
    return res.status(500).json({ message: 'Could not create account.', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (email.trim().toLowerCase() === 'demo@trading.com') {
    return res.status(401).json({ message: 'Use Login with demo to create your private demo account.' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      const user = inMemoryUsers.find((item) => item.email.toLowerCase() === email);

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: createAuthToken(user),
      });
    }

    const user = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    await seedDemoContent(user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: createAuthToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

export const createDemoSession = async (_req, res) => {
  try {
    const user = await createDemoUser();
    await seedDemoContent(user);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      demoExpiresAt: user.expiresAt,
      token: createAuthToken(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create a demo account', error: error.message });
  }
};

export const getMe = async (req, res) => {
  res.json({
    _id: req.user.id,
    name: req.user.name,
    email: req.user.email,
  });
};

export const getTraderProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      ...(user.profile || {}),
      fullName: user.profile?.fullName || user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load trader profile', error: error.message });
  }
};

export const updateTraderProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof req.body?.email === 'string' && req.body.email !== user.email) {
      return res.status(400).json({ message: 'Email cannot be changed' });
    }

    const updates = Object.fromEntries(
      profileFields
        .filter((field) => Object.hasOwn(req.body || {}, field))
        .map((field) => [field, req.body[field]])
    );

    if (Object.hasOwn(updates, 'monthlyReturnPercent')) {
      const monthlyReturnPercent = Number(updates.monthlyReturnPercent);
      if (!Number.isFinite(monthlyReturnPercent) || monthlyReturnPercent < -100) {
        return res.status(400).json({ message: 'Monthly return must be a valid percentage of -100 or higher.' });
      }
      updates.monthlyReturnPercent = monthlyReturnPercent;
    }

    if (Array.isArray(updates.customFields)) {
      updates.customFields = updates.customFields
        .filter((field) => field && typeof field === 'object')
        .map((field) => ({
          id: String(field.id || ''),
          label: String(field.label || ''),
          value: String(field.value || ''),
        }))
        .filter((field) => field.label && field.value);
    }

    user.profile = { ...(user.profile || {}), ...updates };
    if (mongoose.connection.readyState === 1) {
      await user.save();
    }

    res.json({
      ...user.profile,
      fullName: user.profile.fullName || user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not save trader profile', error: error.message });
  }
};
