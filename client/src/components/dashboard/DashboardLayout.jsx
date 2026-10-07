import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import Skeleton from '../common/Skeleton';
import Sidebar from '../layout/Sidebar';
import ActionIcon from '../common/ActionIcon';
import SummaryCards from './SummaryCards';
import AccountSection from './AccountSection';
import PlannedSection from './PlannedSection';
import PortfolioSection from './PortfolioSection';
import HistorySection from './HistorySection';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const defaultAccountForm = {
  name: '',
  propFirm: 'FundedSquad',
  type: 'Instant',
  fundedAmount: 50000,
  balance: 0,
  startingBalance: 0,
  forexLeverage: 0,
  indicesLeverage: 0,
  commoditiesLeverage: 0,
  cryptoLeverage: 0,
  profitPercent: 0,
  maxDailyLoss: 5,
  maxOverallLoss: 10,
  profitTarget: 10,
  nextPayoutDate: '',
  payoutReceived: 0,
  status: 'Active',
  purchaseDate: '',
};

const defaultPlannedAccountForm = {
  company: '',
  size: 100000,
  type: 'Instant',
  purchaseDate: '',
  cost: 500,
  priority: 'Medium',
  notes: '',
  status: 'Planned',
};

const calculateTradePnl = (tradeData = {}) => {
  const entryPrice = Number(tradeData.entryPrice || 0);
  const exitPrice = Number(tradeData.exitPrice || 0);
  const lotSize = Number(tradeData.lotSize || 0);
  const direction = tradeData.buySell === 'Sell' ? -1 : 1;
  const pair = (tradeData.pair || '').toUpperCase().replace('/', '');
  const contractSize = pair === 'XAUUSD' ? 100 : 100000;
  const pnl = ((exitPrice - entryPrice) * direction * lotSize * contractSize);

  return Number(pnl.toFixed(2));
};

const defaultTradeForm = {
  date: new Date().toISOString().slice(0, 10),
  account: '',
  propFirm: 'FundedSquad',
  pair: 'EURUSD',
  customPair: '',
  buySell: 'Buy',
  entryPrice: 1.1,
  exitPrice: 1.12,
  lotSize: 0.1,
  sl: 1.09,
  tp: 1.13,
  risk: 1,
  pnl: 0,
  rr: 1,
  rrMode: 'auto',
  reason: '',
  screenshot: 'Attached',
  notes: '',
};

const defaultPayoutForm = {
  date: new Date().toISOString().slice(0, 10),
  account: '',
  amount: 0,
  method: 'Bank Transfer',
  status: 'Pending',
};

const DashboardLayout = ({ user, dashboardData, onLogout, onRefresh, theme, onToggleTheme, isLoading = false, loadingSections = new Set(), errorMessage = '' }) => {
  const location = useLocation();
  const [accountForm, setAccountForm] = useState(defaultAccountForm);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [plannedForm, setPlannedForm] = useState(defaultPlannedAccountForm);
  const [editingPlannedId, setEditingPlannedId] = useState(null);
  const [showPlannedForm, setShowPlannedForm] = useState(false);
  const [tradeForm, setTradeForm] = useState(defaultTradeForm);
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState(defaultPayoutForm);
  const [editingPayoutId, setEditingPayoutId] = useState(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [monthlyReturnPercent, setMonthlyReturnPercent] = useState('0');
  const [isLoadingMonthlyReturn, setIsLoadingMonthlyReturn] = useState(true);
  const [isSavingMonthlyReturn, setIsSavingMonthlyReturn] = useState(false);
  const [monthlyReturnMessage, setMonthlyReturnMessage] = useState('');
  const [monthlyReturnError, setMonthlyReturnError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMonthlyReturn = async () => {
      setIsLoadingMonthlyReturn(true);
      setMonthlyReturnError('');
      try {
        const response = await api.get('/auth/profile');
        if (isMounted) {
          const savedPercentage = Number(response.data.monthlyReturnPercent ?? 0);
          setMonthlyReturnPercent(String(Number.isFinite(savedPercentage) ? savedPercentage : 0));
        }
      } catch (error) {
        console.error('Failed to load monthly return setting', error);
        if (isMounted) setMonthlyReturnError('Could not load the saved monthly return setting.');
      } finally {
        if (isMounted) setIsLoadingMonthlyReturn(false);
      }
    };

    loadMonthlyReturn();
    return () => { isMounted = false; };
  }, [user?._id]);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;

    const timeout = setTimeout(() => {
      const section = document.getElementById(hash);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [location.hash, location.pathname]);

  const stats = useMemo(() => ({
    totalAccounts: dashboardData?.stats?.totalAccounts || dashboardData?.accounts?.length || 0,
    activeAccounts: dashboardData?.stats?.activeAccounts || 0,
    totalFunding: dashboardData?.stats?.totalFunding || 0,
    totalProfit: dashboardData?.stats?.totalProfit || 0,
    totalPayouts: dashboardData?.stats?.totalPayouts || 0,
    failedAccounts: dashboardData?.stats?.failedAccounts || 0,
    plannedFunding: dashboardData?.stats?.plannedFunding || 0,
    combinedFunding: dashboardData?.stats?.combinedFunding || 0,
  }), [dashboardData]);

  const accounts = dashboardData?.accounts || [];
  const plannedAccounts = dashboardData?.plannedAccounts || [];
  const trades = dashboardData?.trades || [];
  const payouts = dashboardData?.payouts || [];
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'Active'),
    [accounts]
  );
  const monthlyReturnByAccount = useMemo(() => {
    const parsedPercentage = Number(monthlyReturnPercent);
    const percentage = Number.isFinite(parsedPercentage) ? parsedPercentage : 0;
    return activeAccounts.map((account) => {
      const parsedFundedAmount = Number(account.fundedAmount);
      const fundedAmount = Number.isFinite(parsedFundedAmount) ? parsedFundedAmount : 0;
      const monthlyReturn = Number((fundedAmount * percentage / 100).toFixed(2));
      return {
        id: account._id || account.name,
        name: account.name,
        fundedAmount,
        monthlyReturn,
      };
    });
  }, [activeAccounts, monthlyReturnPercent]);
  const monthlyReturnTotal = monthlyReturnByAccount.reduce((sum, account) => sum + account.monthlyReturn, 0);
  const projectedActiveFunding = monthlyReturnByAccount.reduce((sum, account) => sum + account.fundedAmount, 0);

  const saveMonthlyReturn = async () => {
    const percentage = Number(monthlyReturnPercent);
    if (!Number.isFinite(percentage) || percentage < -100) {
      setMonthlyReturnError('Enter a valid monthly return percentage of -100 or higher.');
      setMonthlyReturnMessage('');
      return;
    }

    setIsSavingMonthlyReturn(true);
    setMonthlyReturnError('');
    setMonthlyReturnMessage('');
    try {
      const response = await api.put('/auth/profile', { monthlyReturnPercent: percentage });
      const savedPercentage = Number(response.data.monthlyReturnPercent);
      setMonthlyReturnPercent(String(Number.isFinite(savedPercentage) ? savedPercentage : percentage));
      setMonthlyReturnMessage('Monthly return saved.');
    } catch (error) {
      console.error('Failed to save monthly return setting', error);
      setMonthlyReturnError(error.response?.data?.message || 'Could not save the monthly return setting.');
    } finally {
      setIsSavingMonthlyReturn(false);
    }
  };

  const updateAccountField = (field, value) => {
    const nextForm = { ...accountForm, [field]: value };

    if (field === 'startingBalance' && !editingAccountId) {
      nextForm.balance = Number(value) || 0;
    }

    if (['fundedAmount', 'balance', 'startingBalance'].includes(field)) {
      const fundedAmount = Number(nextForm.fundedAmount || 0);
      const balance = Number(nextForm.balance || 0);
      const startingBalance = Number(nextForm.startingBalance || 0);
      const profit = balance - startingBalance;
      const profitPercent = fundedAmount ? (profit / fundedAmount) * 100 : 0;
      nextForm.profitPercent = Number(profitPercent.toFixed(2));
    }

    setAccountForm(nextForm);
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingAccountId) {
        await api.put(`/dashboard/accounts/${editingAccountId}`, accountForm);
      } else {
        await api.post('/dashboard/accounts', accountForm);
      }
      setAccountForm(defaultAccountForm);
      setEditingAccountId(null);
      setShowAccountForm(false);
      onRefresh(['accounts']);
    } catch (error) {
      console.error('Unable to save account', error);
    }
  };

  const handlePlannedSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingPlannedId) {
        await api.put(`/dashboard/planned-accounts/${editingPlannedId}`, plannedForm);
      } else {
        await api.post('/dashboard/planned-accounts', plannedForm);
      }
      setPlannedForm(defaultPlannedAccountForm);
      setEditingPlannedId(null);
      setShowPlannedForm(false);
      onRefresh(['planned']);
    } catch (error) {
      console.error('Unable to save planned account', error);
    }
  };

  const handleTradeSubmit = async (event) => {
    event.preventDefault();

    const normalizedPair = tradeForm.pair === 'CUSTOM' ? tradeForm.customPair : tradeForm.pair;
    const payload = {
      ...tradeForm,
      pair: normalizedPair,
      pnl: calculateTradePnl({
        ...tradeForm,
        pair: normalizedPair,
      }),
      rr: Number(tradeForm.rr) || 0,
      rrMode: tradeForm.rrMode,
      customPair: undefined,
    };

    try {
      if (editingTradeId) {
        await api.put(`/dashboard/trades/${editingTradeId}`, payload);
      } else {
        await api.post('/dashboard/trades', payload);
      }
      setTradeForm(defaultTradeForm);
      setEditingTradeId(null);
      setShowTradeForm(false);
      onRefresh(['trades', 'accounts']);
    } catch (error) {
      console.error('Unable to save trade', error);
    }
  };

  const handleTradeImport = async (account, importedTrades) => {
    const response = await api.post('/dashboard/trades/import', { account, trades: importedTrades });
    await onRefresh(['trades', 'accounts']);
    return response.data;
  };

  const handlePayoutSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingPayoutId) {
        await api.put(`/dashboard/payouts/${editingPayoutId}`, payoutForm);
      } else {
        await api.post('/dashboard/payouts', payoutForm);
      }
      setPayoutForm(defaultPayoutForm);
      setEditingPayoutId(null);
      setShowPayoutForm(false);
      onRefresh(['payouts', 'accounts']);
    } catch (error) {
      console.error('Unable to save payout', error);
    }
  };

  const deleteAccount = async (id) => {
    await api.delete(`/dashboard/accounts/${id}`);
    onRefresh(['accounts']);
  };

  const deletePlanned = async (id) => {
    await api.delete(`/dashboard/planned-accounts/${id}`);
    onRefresh(['planned']);
  };

  const deleteTrade = async (id) => {
    await api.delete(`/dashboard/trades/${id}`);
    await onRefresh(['trades', 'accounts']);
  };

  const deleteTrades = async (ids) => {
    for (const id of ids) {
      await api.delete(`/dashboard/trades/${id}`);
    }
    await onRefresh(['trades', 'accounts']);
  };

  const deletePayout = async (id) => {
    await api.delete(`/dashboard/payouts/${id}`);
    await onRefresh(['payouts', 'accounts']);
  };

  const confirmDelete = ({ title, message, onConfirm }) => {
    setDeleteConfirm({ title, message, onConfirm });
  };

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      />

      <main className="content" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">Portfolio Summary</p>
            <h1>Prop Firm Overview</h1>
          </div>
          <div className="topbar-actions">
            {isLoading || loadingSections.has('accounts')
              ? <Skeleton className="skeleton-chip" />
              : <span className="chip success">{stats.activeAccounts} Active</span>}
          </div>
        </header>
        {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}

        <SummaryCards
          stats={{ ...stats, monthlyReturn: monthlyReturnTotal, projectedActiveFunding }}
          formatCurrency={formatCurrency}
          isLoading={isLoading}
          loadingSections={loadingSections}
        />

        <PortfolioSection
          accounts={accounts}
          plannedAccounts={plannedAccounts}
          formatCurrency={formatCurrency}
          isLoading={isLoading || loadingSections.has('accounts') || loadingSections.has('planned')}
        />

        <AccountSection
          accounts={accounts}
          accountForm={accountForm}
          setAccountForm={setAccountForm}
          editingAccountId={editingAccountId}
          setEditingAccountId={setEditingAccountId}
          defaultAccountForm={defaultAccountForm}
          handleAccountSubmit={handleAccountSubmit}
          formatCurrency={formatCurrency}
          deleteAccount={deleteAccount}
          updateAccountField={updateAccountField}
          showAccountForm={showAccountForm}
          setShowAccountForm={setShowAccountForm}
          confirmDelete={confirmDelete}
          isLoading={isLoading || loadingSections.has('accounts')}
          ownerName={user?.name}
          trades={trades}
        />

        <section id="monthly-return" className="section-block monthly-return-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Projection</p>
              <h2>Monthly Return Calculator</h2>
            </div>
          </div>
          <div className="monthly-return-panel">
            <div className="form-group monthly-return-input">
              <label htmlFor="monthly-return-percent">Monthly return</label>
              <div className="input-suffix-wrap">
                <input
                  id="monthly-return-percent"
                  type="number"
                  min="-100"
                  step="0.01"
                  value={monthlyReturnPercent}
                  onChange={(event) => {
                    setMonthlyReturnPercent(event.target.value);
                    setMonthlyReturnMessage('');
                    setMonthlyReturnError('');
                  }}
                  disabled={isLoadingMonthlyReturn || isSavingMonthlyReturn}
                />
                <span>%</span>
              </div>
            </div>
            <div className="monthly-return-save">
              <button
                className="primary-btn"
                type="button"
                onClick={saveMonthlyReturn}
                disabled={isLoadingMonthlyReturn || isSavingMonthlyReturn}
              >
                {isSavingMonthlyReturn ? 'Saving...' : 'Save monthly return'}
              </button>
              {monthlyReturnMessage && <span className="success-text" role="status">{monthlyReturnMessage}</span>}
              {monthlyReturnError && <span className="error-text" role="alert">{monthlyReturnError}</span>}
            </div>
            <p className="muted">Estimated return is shown separately as a payout and is not added to active funded capital.</p>
            {isLoading || loadingSections.has('accounts') ? (
              <Skeleton className="skeleton-value" />
            ) : monthlyReturnByAccount.length > 0 ? (
              <div className="monthly-return-list">
                {monthlyReturnByAccount.map((account) => (
                  <div className="monthly-return-item" key={account.id}>
                    <span>{account.name}</span>
                    <span>
                      Funded: <strong>{formatCurrency(account.fundedAmount)}</strong>
                      {' · Est. payout: '}
                      <strong>{formatCurrency(account.monthlyReturn)}</strong>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Add an active account to see its monthly return projection.</p>
            )}
          </div>
        </section>

        <PlannedSection
          plannedAccounts={plannedAccounts}
          plannedForm={plannedForm}
          setPlannedForm={setPlannedForm}
          editingPlannedId={editingPlannedId}
          setEditingPlannedId={setEditingPlannedId}
          defaultPlannedAccountForm={defaultPlannedAccountForm}
          handlePlannedSubmit={handlePlannedSubmit}
          formatCurrency={formatCurrency}
          deletePlanned={deletePlanned}
          showPlannedForm={showPlannedForm}
          setShowPlannedForm={setShowPlannedForm}
          confirmDelete={confirmDelete}
          isLoading={isLoading || loadingSections.has('planned')}
        />

        <HistorySection
          accounts={accounts}
          trades={trades}
          payouts={payouts}
          tradeForm={tradeForm}
          setTradeForm={setTradeForm}
          payoutForm={payoutForm}
          setPayoutForm={setPayoutForm}
          editingTradeId={editingTradeId}
          setEditingTradeId={setEditingTradeId}
          editingPayoutId={editingPayoutId}
          setEditingPayoutId={setEditingPayoutId}
          defaultTradeForm={defaultTradeForm}
          defaultPayoutForm={defaultPayoutForm}
          handleTradeSubmit={handleTradeSubmit}
          onImportTrades={handleTradeImport}
          handlePayoutSubmit={handlePayoutSubmit}
          formatCurrency={formatCurrency}
          deleteTrade={deleteTrade}
          deleteTrades={deleteTrades}
          deletePayout={deletePayout}
          showTradeForm={showTradeForm}
          setShowTradeForm={setShowTradeForm}
          showPayoutForm={showPayoutForm}
          setShowPayoutForm={setShowPayoutForm}
          confirmDelete={confirmDelete}
          isLoading={isLoading}
          isTradesLoading={loadingSections.has('trades')}
          isPayoutsLoading={loadingSections.has('payouts')}
          ownerName={user?.name}
        />

        {deleteConfirm && (
          <div className="confirm-backdrop" onClick={() => setDeleteConfirm(null)}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">!</div>
              <h3>{deleteConfirm.title}</h3>
              <p>{deleteConfirm.message}</p>
              <div className="confirm-actions">
                <button type="button" className="secondary-btn" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-btn icon-action-button"
                  aria-label="Confirm delete"
                  title="Confirm delete"
                  onClick={() => {
                    deleteConfirm.onConfirm();
                    setDeleteConfirm(null);
                  }}
                >
                  <ActionIcon name="delete" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardLayout;
