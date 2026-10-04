import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AuthScreen = ({ onAuthSuccess }) => {
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const completeAuth = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify({ name: userData.name, email: userData.email }));
    onAuthSuccess(userData);
    navigate('/');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError('Enter your email address.');
      return;
    }
    if (view === 'login' && !form.password) {
      setError('Enter your password.');
      return;
    }
    if (view === 'register' && (!form.name.trim() || !form.password)) {
      setError('Enter your name and password.');
      return;
    }
    if (view === 'verify-email' && !/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    if (view === 'reset-password' && (!/^\d{6}$/.test(otp.trim()) || newPassword.length < 8)) {
      setError('Enter the 6-digit code and a password of at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (view === 'login') {
        const response = await api.post('/auth/login', { email, password: form.password });
        completeAuth(response.data);
      } else if (view === 'register') {
        const response = await api.post('/auth/register', { ...form, name: form.name.trim(), email, password: form.password });
        setView('verify-email');
        setNotice(response.data.message);
      } else if (view === 'verify-email') {
        const response = await api.post('/auth/verify-email', { email, otp: otp.trim() });
        completeAuth(response.data);
      } else if (view === 'forgot-password') {
        const response = await api.post('/auth/forgot-password', { email });
        setView('reset-password');
        setNotice(response.data.message);
      } else {
        const response = await api.post('/auth/reset-password', {
          email,
          otp: otp.trim(),
          password: newPassword,
        });
        setView('login');
        setOtp('');
        setNewPassword('');
        setForm((previous) => ({ ...previous, password: '' }));
        setNotice(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await api.post('/auth/demo');
      completeAuth(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const isRegistration = view === 'verify-email';
      const response = await api.post(
        isRegistration ? '/auth/register' : '/auth/forgot-password',
        isRegistration
          ? { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() }
          : { email: form.email.trim().toLowerCase() }
      );
      setNotice(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const setPage = (nextView) => {
    setView(nextView);
    setError('');
    setNotice('');
    setOtp('');
    setForm((previous) => ({ ...previous, password: '' }));
  };
  const isPasswordView = view === 'login' || view === 'register';
  const titles = {
    login: 'Login to Dashboard',
    register: 'Create Account',
    'verify-email': 'Verify your email',
    'forgot-password': 'Forgot password',
    'reset-password': 'Reset password',
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-badge large">PT</div>
          <h1>{titles[view]}</h1>
          <p>Personal Trading Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {view === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Name</label>
              <input id="auth-name" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your full name" />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
          </div>

          {isPasswordView && (
            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={view === 'register' ? 'At least 8 characters' : 'Your password'}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'View'}
                </button>
              </div>
            </div>
          )}

          {(view === 'verify-email' || view === 'reset-password') && (
            <div className="form-group">
              <label htmlFor="auth-otp">6-digit email code</label>
              <input id="auth-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
            </div>
          )}

          {view === 'reset-password' && (
            <div className="form-group">
              <label htmlFor="auth-new-password">New password</label>
              <div className="password-input-wrap">
                <input id="auth-new-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((previous) => !previous)}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? 'Hide' : 'View'}
                </button>
              </div>
            </div>
          )}

          {view === 'login' && (
            <button className="link-btn auth-inline-link" type="button" onClick={() => setPage('forgot-password')}>
              Forgot password?
            </button>
          )}

          {notice && <div className="success-box" role="status">{notice}</div>}
          {error && <div className="error-box" role="alert">{error}</div>}

          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? 'Please wait...' : ({
              login: 'Login',
              register: 'Send verification code',
              'verify-email': 'Verify email and create account',
              'forgot-password': 'Send reset code',
              'reset-password': 'Reset password',
            })[view]}
          </button>
        </form>

        {(view === 'verify-email' || view === 'reset-password') && (
          <button className="link-btn" type="button" disabled={loading} onClick={resendOtp}>
            Resend code
          </button>
        )}

        {view === 'login' && (
          <div className="auth-demo-actions">
            <span className="auth-divider">OR</span>
            <button className="secondary-btn" type="button" disabled={loading} onClick={handleDemoLogin}>
              {loading ? 'Please wait...' : 'Login with demo'}
            </button>
            <small>Starts a private demo account that expires after 10 days.</small>
          </div>
        )}

        {view === 'login' || view === 'register' ? (
          <button className="link-btn" type="button" onClick={() => setPage(view === 'login' ? 'register' : 'login')}>
            {view === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        ) : (
          <button className="link-btn" type="button" onClick={() => setPage('login')}>
            Back to login
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
