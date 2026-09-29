import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import createAuthToken from '../config/authToken.js';
import Account from '../models/Account.js';
import Payout from '../models/Payout.js';
import PlannedAccount from '../models/PlannedAccount.js';
import Trade from '../models/Trade.js';
import User from '../models/User.js';

const inMemoryUsers = [];
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
];

const findUserById = async (id) => {
  if (mongoose.connection.readyState === 1) {
    return User.findById(id);
  }

  return inMemoryUsers.find((user) => user._id === id);
};

const ensureDemoUser = async () => {
  if (inMemoryUsers.some((user) => user.email === 'demo@trading.com')) {
    return;
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  inMemoryUsers.push({
    _id: 'demo-user',
    name: 'Demo Trader',
    email: 'demo@trading.com',
    password: hashedPassword,
  });
};

const dateFromToday = (dayOffset) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
};

const seedDemoContent = async (user) => {
  if (user.email.toLowerCase() !== 'demo@trading.com') return;

  const claim = await User.updateOne(
    { _id: user._id, demoDataSeeded: { $ne: true } },
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
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await ensureDemoUser();
      const existingUser = inMemoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const newUser = {
        _id: `local-${Date.now()}`,
        name,
        email,
        password: await bcrypt.hash(password, salt),
      };
      inMemoryUsers.push(newUser);

      return res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        token: createAuthToken(newUser),
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: createAuthToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await ensureDemoUser();
      const user = inMemoryUsers.find((item) => item.email.toLowerCase() === email.toLowerCase());

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

    let user = await User.findOne({ email });
    if (!user && email.toLowerCase() === 'demo@trading.com' && password === 'password123') {
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        user = await User.create({
          name: 'Demo Trader',
          email: 'demo@trading.com',
          password: hashedPassword,
        });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
        user = await User.findOne({ email: 'demo@trading.com' });
      }
    }

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
