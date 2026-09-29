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

const accountFields = [
  'name', 'propFirm', 'type', 'fundedAmount', 'balance', 'startingBalance',
  'maxDailyLoss', 'maxOverallLoss', 'profitTarget', 'nextPayoutDate',
  'payoutReceived', 'status', 'purchaseDate',
];
const plannedAccountFields = [
  'company', 'size', 'type', 'purchaseDate', 'cost', 'priority', 'notes', 'status',
];
const tradeFields = [
  'account', 'propFirm', 'pair', 'buySell', 'entryPrice', 'exitPrice', 'lotSize',
  'risk', 'rr', 'rrMode', 'reason', 'screenshot', 'notes', 'date',
];
const payoutFields = ['account', 'date', 'amount', 'method', 'status'];

const pickFields = (payload, fields) => Object.fromEntries(
  fields
    .filter((field) => Object.hasOwn(payload || {}, field))
    .map((field) => [field, payload[field]])
);

const calculateProfitPercent = ({ fundedAmount, balance, startingBalance }) => {
  const funded = Number(fundedAmount) || 0;
  const profit = (Number(balance) || 0) - (Number(startingBalance) || 0);
  return funded ? Number(((profit / funded) * 100).toFixed(2)) : 0;
};

const calculateTradePnl = ({ entryPrice, exitPrice, lotSize, buySell, pair }) => {
  const direction = buySell === 'Sell' ? -1 : 1;
  const normalizedPair = String(pair || '').toUpperCase().replace('/', '');
  const contractSize = normalizedPair === 'XAUUSD' ? 100 : 100000;
  const pnl = ((Number(exitPrice) || 0) - (Number(entryPrice) || 0))
    * direction
    * (Number(lotSize) || 0)
    * contractSize;

  return Number(pnl.toFixed(2));
};

const calculateTradeRr = ({ pnl, risk, rr, rrMode }) => {
  if (rrMode === 'manual') return Number(rr) || 0;

  const riskAmount = Number(risk) || 0;
  return riskAmount ? Number(((Number(pnl) / riskAmount) || 0).toFixed(2)) : 0;
};

const hasAccountForUser = async (userId, accountName, activeOnly = false) => {
  if (!accountName) return false;

  if (!isMongoConnected()) {
    return inMemoryData.accounts.some((account) =>
      account.user === userId
      && account.name === accountName
      && (!activeOnly || account.status === 'Active')
    );
  }

  const query = { user: userId, name: accountName };
  if (activeOnly) query.status = 'Active';
  return Boolean(await Account.exists(query));
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
    const payload = pickFields(req.body, accountFields);
    payload.profitPercent = calculateProfitPercent(payload);

    if (!isMongoConnected()) {
      const account = createLocalItem('accounts', req.user.id, payload, 'account');
      return res.status(201).json(account);
    }

    const account = await Account.create({
      ...payload,
      user: req.user.id,
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create account', error: error.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const updates = pickFields(req.body, accountFields);

    if (!isMongoConnected()) {
      const current = inMemoryData.accounts.find((item) => item.user === req.user.id && item._id === req.params.id);
      if (!current) {
        return res.status(404).json({ message: 'Account not found' });
      }

      const accountData = { ...current, ...updates };
      updates.profitPercent = calculateProfitPercent(accountData);
      return res.json(updateLocalItem('accounts', req.user.id, req.params.id, updates));
    }

    const account = await Account.findOne({ _id: req.params.id, user: req.user.id });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    Object.assign(account, updates);
    account.profitPercent = calculateProfitPercent(account);
    await account.save();
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
    const payload = pickFields(req.body, plannedAccountFields);

    if (!isMongoConnected()) {
      const plannedAccount = createLocalItem('plannedAccounts', req.user.id, payload, 'planned');
      return res.status(201).json(plannedAccount);
    }

    const plannedAccount = await PlannedAccount.create({
      ...payload,
      user: req.user.id,
    });
    res.status(201).json(plannedAccount);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create planned account', error: error.message });
  }
};

export const updatePlannedAccount = async (req, res) => {
  try {
    const payload = pickFields(req.body, plannedAccountFields);

    if (!isMongoConnected()) {
      const updated = updateLocalItem('plannedAccounts', req.user.id, req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ message: 'Planned account not found' });
      }
      return res.json(updated);
    }

    const plannedAccount = await PlannedAccount.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      payload,
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
    const payload = pickFields(req.body, tradeFields);
    if (!(await hasAccountForUser(req.user.id, payload.account, true))) {
      return res.status(400).json({ message: 'Select an active account that belongs to your profile' });
    }
    payload.pnl = calculateTradePnl(payload);
    payload.rr = calculateTradeRr(payload);

    if (!isMongoConnected()) {
      const trade = createLocalItem('trades', req.user.id, payload, 'trade');
      return res.status(201).json(trade);
    }

    const trade = await Trade.create({
      ...payload,
      user: req.user.id,
    });
    res.status(201).json(trade);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create trade', error: error.message });
  }
};

export const importTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountName = String(req.body?.account || '').trim();
    const rows = req.body?.trades;
    if (!accountName || !Array.isArray(rows) || rows.length === 0 || rows.length > 1000) {
      return res.status(400).json({ message: 'Choose an account and provide between 1 and 1,000 trades.' });
    }

    const account = isMongoConnected()
      ? await Account.findOne({ user: userId, name: accountName, status: 'Active' }).select('propFirm').lean()
      : inMemoryData.accounts.find((item) => item.user === userId && item.name === accountName && item.status === 'Active');
    if (!account) {
      return res.status(400).json({ message: 'Choose an active account that belongs to your profile.' });
    }

    const normalizedRows = [];
    for (const [index, row] of rows.entries()) {
      const payload = pickFields(row, tradeFields);
      const importedPnl = Number(row.pnl);
      const hasImportedPnl = row.pnl !== null && row.pnl !== undefined && row.pnl !== '' && Number.isFinite(importedPnl);
      const entryPrice = Number(payload.entryPrice) || 0;
      const exitPrice = Number(payload.exitPrice) || 0;
      const lotSize = Number(payload.lotSize) || 0;
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ''));
      if (!validDate || !payload.pair || !['Buy', 'Sell'].includes(payload.buySell)
        || (!hasImportedPnl && (!entryPrice || !exitPrice))) {
        return res.status(400).json({ message: `Imported trade on row ${index + 1} is missing a valid date, symbol, direction, or price/P&L.` });
      }

      const trade = {
        ...payload,
        account: accountName,
        propFirm: account.propFirm || payload.propFirm || '',
        entryPrice,
        exitPrice,
        lotSize,
        risk: Number(payload.risk) || 0,
        pnl: hasImportedPnl ? importedPnl : calculateTradePnl({ ...payload, entryPrice, exitPrice, lotSize }),
        rrMode: row.rr !== null && row.rr !== undefined && row.rr !== '' ? 'manual' : 'auto',
        externalId: String(row.externalId || '').slice(0, 100),
      };
      trade.rr = calculateTradeRr({ ...trade, rr: row.rr });
      normalizedRows.push(trade);
    }

    const seenExternalIds = new Set();
    const duplicateExternalIds = new Set();
    for (const trade of normalizedRows) {
      if (!trade.externalId) continue;
      if (seenExternalIds.has(trade.externalId)) duplicateExternalIds.add(trade.externalId);
      seenExternalIds.add(trade.externalId);
    }
    const existingExternalIds = new Set();
    const externalIds = [...seenExternalIds].filter((id) => !duplicateExternalIds.has(id));
    if (externalIds.length) {
      if (isMongoConnected()) {
        const existingTrades = await Trade.find({ user: userId, account: accountName, externalId: { $in: externalIds } })
          .select('externalId')
          .lean();
        existingTrades.forEach((trade) => existingExternalIds.add(trade.externalId));
      } else {
        inMemoryData.trades
          .filter((trade) => trade.user === userId && trade.account === accountName && externalIds.includes(trade.externalId))
          .forEach((trade) => existingExternalIds.add(trade.externalId));
      }
    }

    const newTrades = normalizedRows.filter((trade) => !trade.externalId
      || (!duplicateExternalIds.has(trade.externalId) && !existingExternalIds.has(trade.externalId)));
    const duplicateCount = normalizedRows.length - newTrades.length;
    if (!newTrades.length) {
      return res.json({ imported: 0, duplicates: duplicateCount });
    }

    if (isMongoConnected()) {
      await Trade.insertMany(newTrades.map((trade) => ({ ...trade, user: userId })));
    } else {
      newTrades.forEach((trade) => createLocalItem('trades', userId, trade, 'trade'));
    }

    res.status(201).json({ imported: newTrades.length, duplicates: duplicateCount });
  } catch (error) {
    res.status(500).json({ message: 'Unable to import trades', error: error.message });
  }
};

export const updateTrade = async (req, res) => {
  try {
    const updates = pickFields(req.body, tradeFields);

    if (!isMongoConnected()) {
      const current = inMemoryData.trades.find((item) => item.user === req.user.id && item._id === req.params.id);
      if (!current) {
        return res.status(404).json({ message: 'Trade not found' });
      }

      const tradeData = { ...current, ...updates };
      if (!(await hasAccountForUser(req.user.id, tradeData.account, true))) {
        return res.status(400).json({ message: 'Select an active account that belongs to your profile' });
      }
      updates.pnl = calculateTradePnl(tradeData);
      updates.rr = calculateTradeRr({ ...tradeData, ...updates });
      return res.json(updateLocalItem('trades', req.user.id, req.params.id, updates));
    }

    const trade = await Trade.findOne({ _id: req.params.id, user: req.user.id });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    const tradeData = { ...trade.toObject(), ...updates };
    if (!(await hasAccountForUser(req.user.id, tradeData.account, true))) {
      return res.status(400).json({ message: 'Select an active account that belongs to your profile' });
    }
    Object.assign(trade, updates);
    trade.pnl = calculateTradePnl(trade);
    trade.rr = calculateTradeRr(trade);
    await trade.save();
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
    const payload = pickFields(req.body, payoutFields);
    if (!(await hasAccountForUser(req.user.id, payload.account))) {
      return res.status(400).json({ message: 'Select an account that belongs to your profile' });
    }

    if (!isMongoConnected()) {
      const payout = createLocalItem('payouts', req.user.id, payload, 'payout');
      return res.status(201).json(payout);
    }

    const payout = await Payout.create({
      ...payload,
      user: req.user.id,
    });
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create payout', error: error.message });
  }
};

export const updatePayout = async (req, res) => {
  try {
    const updates = pickFields(req.body, payoutFields);

    if (!isMongoConnected()) {
      const current = inMemoryData.payouts.find((item) => item.user === req.user.id && item._id === req.params.id);
      if (!current) {
        return res.status(404).json({ message: 'Payout not found' });
      }

      const payoutData = { ...current, ...updates };
      if (!(await hasAccountForUser(req.user.id, payoutData.account))) {
        return res.status(400).json({ message: 'Select an account that belongs to your profile' });
      }
      return res.json(updateLocalItem('payouts', req.user.id, req.params.id, updates));
    }

    const payout = await Payout.findOne({ _id: req.params.id, user: req.user.id });

    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    const payoutData = { ...payout.toObject(), ...updates };
    if (!(await hasAccountForUser(req.user.id, payoutData.account))) {
      return res.status(400).json({ message: 'Select an account that belongs to your profile' });
    }
    Object.assign(payout, updates);
    await payout.save();
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
