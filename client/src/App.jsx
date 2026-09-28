import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import api from './api';
import AuthScreen from './components/auth/AuthScreen';
import DashboardLayout from './components/dashboard/DashboardLayout';
import TradeAnalyticsPage from './components/dashboard/TradeAnalyticsPage';

const App = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [dashboardData, setDashboardData] = useState({
    accounts: [],
    plannedAccounts: [],
    trades: [],
    payouts: [],
    stats: {
      totalAccounts: 0,
      activeAccounts: 0,
      totalFunding: 0,
      plannedFunding: 0,
      combinedFunding: 0,
      totalProfit: 0,
      totalPayouts: 0,
      failedAccounts: 0,
    },
  });

  const [isReady, setIsReady] = useState(false);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    }
  };

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsReady(true);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        await loadDashboardData();
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsReady(true);
      }
    };

    validateSession();
  }, []);

  if (!isReady) return <div className="loading-screen">Loading dashboard...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <AuthScreen onAuthSuccess={(userData) => { setUser(userData); loadDashboardData(); }} />}
      />
      <Route
        path="/dashboard"
        element={
          user ? (
            <DashboardLayout
              user={user}
              dashboardData={dashboardData}
              onRefresh={loadDashboardData}
              onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
              }}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/analytics"
        element={
          user ? (
            <TradeAnalyticsPage
              user={user}
              dashboardData={dashboardData}
              onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
              }}
              theme={localStorage.getItem('theme') || 'light'}
              onToggleTheme={() => {
                const nextTheme = (localStorage.getItem('theme') || 'light') === 'light' ? 'dark' : 'light';
                localStorage.setItem('theme', nextTheme);
                window.location.reload();
              }}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
};

export default App;
