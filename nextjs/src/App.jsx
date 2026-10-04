import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import api from './api';
import AuthScreen from './components/auth/AuthScreen';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProfilePage from './components/dashboard/ProfilePage';
import TourGuide from './components/common/TourGuide';
import SharePublicRoute from './components/common/SharePublicRoute';

const TradeAnalyticsPage = lazy(() => import('./components/dashboard/TradeAnalyticsPage'));
const CalculatorPage = lazy(() => import('./components/dashboard/CalculatorPage'));
const dashboardSections = ['accounts', 'planned', 'trades', 'payouts'];

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const createEmptyDashboardData = () => ({
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

const App = () => {
  const location = useLocation();
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem('token')) return null;
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [dashboardData, setDashboardData] = useState(createEmptyDashboardData);
  const [isReady, setIsReady] = useState(() => !localStorage.getItem('token'));
  const [isDashboardLoading, setIsDashboardLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const [loadingSections, setLoadingSections] = useState(() => (
    localStorage.getItem('token') ? new Set(dashboardSections) : new Set()
  ));
  const loadingSectionCounts = useRef({});

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event) => {
      if (event.key === 'theme' && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme(event.newValue);
      }
    };

    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  useEffect(() => {
    const expireSession = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsDashboardLoading(false);
      loadingSectionCounts.current = {};
      setLoadingSections(new Set());
      setUser(null);
    };

    window.addEventListener('auth:expired', expireSession);
    return () => window.removeEventListener('auth:expired', expireSession);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let lastActivityAt = Date.now();
    const markActivity = () => { lastActivityAt = Date.now(); };
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    const refreshOnVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      markActivity();
      api.get('/auth/me').catch(() => {});
    };
    document.addEventListener('visibilitychange', refreshOnVisibility);

    const refreshActiveSession = () => {
      const wasRecentlyActive = Date.now() - lastActivityAt < 15 * 60 * 1000;
      if (document.visibilityState !== 'visible' || !wasRecentlyActive) return;
      api.get('/auth/me').catch(() => {});
    };
    const intervalId = window.setInterval(refreshActiveSession, 10 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [user]);

  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));

  const loadDashboardData = async (sections = null) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsDashboardLoading(false);
      setLoadingSections(new Set());
      return;
    }

    const requestedSections = sections || dashboardSections;
    requestedSections.forEach((section) => {
      loadingSectionCounts.current[section] = (loadingSectionCounts.current[section] || 0) + 1;
    });
    setLoadingSections((current) => new Set([...current, ...requestedSections]));
    if (!sections) setIsDashboardLoading(true);

    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      requestedSections.forEach((section) => {
        loadingSectionCounts.current[section] -= 1;
      });
      setLoadingSections((current) => {
        const next = new Set(current);
        requestedSections.forEach((section) => {
          if (!loadingSectionCounts.current[section]) next.delete(section);
        });
        return next;
      });
      if (!sections) setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsDashboardLoading(false);
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
        setIsDashboardLoading(false);
        loadingSectionCounts.current = {};
        setLoadingSections(new Set());
        setUser(null);
      } finally {
        setIsReady(true);
      }
    };

    validateSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setDashboardData(createEmptyDashboardData());
    setIsDashboardLoading(false);
    loadingSectionCounts.current = {};
    setLoadingSections(new Set());
    setUser(null);
  };

  const handleAuthSuccess = (userData) => {
    setDashboardData(createEmptyDashboardData());
    setUser(userData);
    loadDashboardData();
  };

  if (!isReady) {
    return (
      <DashboardLayout
        user={user || { name: 'Trader' }}
        dashboardData={dashboardData}
        onRefresh={loadDashboardData}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        isLoading
        loadingSections={loadingSections}
      />
    );
  }

  const dashboardPage = user ? (
    <DashboardLayout
      user={user}
      dashboardData={dashboardData}
      onRefresh={loadDashboardData}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
      isLoading={isDashboardLoading}
      loadingSections={loadingSections}
    />
  ) : (
    <Navigate to="/" replace />
  );

  return (
    <>
      <Routes>
      <Route path="/share/:token" element={<SharePublicRoute />} />
      <Route
        path="/"
        element={user ? dashboardPage : <AuthScreen onAuthSuccess={handleAuthSuccess} />}
      />
      <Route
        path="/dashboard"
        element={<Navigate to={`/${location.search}${location.hash}`} replace />}
      />
      <Route
        path="/analytics"
        element={
          user ? (
            <Suspense fallback={(
              <DashboardLayout
                user={user}
                dashboardData={dashboardData}
                onRefresh={loadDashboardData}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                isLoading
                loadingSections={loadingSections}
              />
            )}>
              <TradeAnalyticsPage
                user={user}
                dashboardData={dashboardData}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            </Suspense>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/calculator"
        element={
          user ? (
            <Suspense fallback={(
              <DashboardLayout
                user={user}
                dashboardData={dashboardData}
                onRefresh={loadDashboardData}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                isLoading
                loadingSections={loadingSections}
              />
            )}>
              <CalculatorPage
                user={user}
                accounts={dashboardData.accounts}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            </Suspense>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          user ? (
            <ProfilePage
              user={user}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <TourGuide user={user} />}
    </>
  );
};

export default App;
