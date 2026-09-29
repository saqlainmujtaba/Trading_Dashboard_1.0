import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import Sidebar from '../layout/Sidebar';
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

const DashboardLayout = ({ user, dashboardData, onLogout, onRefresh, theme, onToggleTheme }) => {
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

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

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

  const updateAccountField = (field, value) => {
    const nextForm = { ...accountForm, [field]: value };

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
      onRefresh();
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
      onRefresh();
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
      onRefresh();
    } catch (error) {
      console.error('Unable to save trade', error);
    }
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
      onRefresh();
    } catch (error) {
      console.error('Unable to save payout', error);
    }
  };

  const deleteAccount = async (id) => {
    await api.delete(`/dashboard/accounts/${id}`);
    onRefresh();
  };

  const deletePlanned = async (id) => {
    await api.delete(`/dashboard/planned-accounts/${id}`);
    onRefresh();
  };

  const deleteTrade = async (id) => {
    await api.delete(`/dashboard/trades/${id}`);
    onRefresh();
  };

  const deletePayout = async (id) => {
    await api.delete(`/dashboard/payouts/${id}`);
    onRefresh();
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
            <span className="chip success">{stats.activeAccounts} Active</span>
          </div>
        </header>

        <SummaryCards stats={stats} formatCurrency={formatCurrency} />

        <PortfolioSection accounts={accounts} formatCurrency={formatCurrency} />

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
        />

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
          handlePayoutSubmit={handlePayoutSubmit}
          formatCurrency={formatCurrency}
          deleteTrade={deleteTrade}
          deletePayout={deletePayout}
          showTradeForm={showTradeForm}
          setShowTradeForm={setShowTradeForm}
          showPayoutForm={showPayoutForm}
          setShowPayoutForm={setShowPayoutForm}
          confirmDelete={confirmDelete}
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
                  className="danger-btn"
                  onClick={() => {
                    deleteConfirm.onConfirm();
                    setDeleteConfirm(null);
                  }}
                >
                  Delete
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
