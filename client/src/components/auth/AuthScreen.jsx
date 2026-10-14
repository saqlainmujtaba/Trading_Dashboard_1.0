import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AuthScreen = ({ onAuthSuccess }) => {
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const completeAuth = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify({ name: userData.name, email: userData.email, role: userData.role || 'user' }));
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

    setLoading(true);
    try {
      if (view === 'login') {
        if (!form.password) throw new Error('Enter your password.');
        const response = await api.post('/auth/login', { email, password: form.password });
        completeAuth(response.data);
      } else if (view === 'register') {
        if (!form.name.trim() || !form.password) throw new Error('Enter your name and password.');
        const response = await api.post('/auth/register', { name: form.name.trim(), email, password: form.password });
        setView('verify-email');
        setForm((current) => ({ ...current, password: '' }));
        setNotice(response.data.message || `We sent a six-digit verification code to ${email}.`);
      } else if (view === 'verify-email') {
        const response = await api.post('/auth/verify-email', { email, code: form.code.trim() });
        completeAuth(response.data);
      } else if (view === 'forgot-password') {
        const response = await api.post('/auth/forgot-password', { email });
        setView('reset-password');
        setNotice(response.data.message || 'If a verified account uses this email, a reset code has been sent.');
      } else if (view === 'reset-password') {
        const response = await api.post('/auth/reset-password', { email, code: form.code.trim(), password: form.password });
        setView('login');
        setForm((current) => ({ ...current, password: '' }));
        setNotice(response.data.message || 'Password reset. You can now log in.');
      }
    } catch (requestError) {
      if (requestError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setView('verify-email');
        setNotice('Enter the verification code sent to your email.');
      }
      if (requestError.response?.data?.requiresEmailVerification) {
        setView('verify-email');
        setForm((current) => ({ ...current, password: '' }));
      }
      setError(requestError.response?.data?.message || requestError.message || 'Authentication failed. Please try again.');
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
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await api.post('/auth/resend-verification', { email: form.email.trim().toLowerCase() });
      setNotice(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const setPage = (nextView) => {
    setView(nextView);
    setError('');
    setNotice('');
    setForm((previous) => ({ ...previous, password: '', code: '' }));
  };

  const titles = {
    login: 'Login to Dashboard',
    register: 'Create Account',
    'verify-email': 'Verify your email',
    'forgot-password': 'Forgot password',
    'reset-password': 'Reset password',
  };
  const needsCode = view === 'verify-email' || view === 'reset-password';
  const needsPassword = view === 'login' || view === 'register' || view === 'reset-password';

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
            <input id="auth-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" readOnly={view === 'verify-email' || view === 'reset-password'} />
          </div>

          {needsCode && (
            <div className="form-group">
              <label htmlFor="auth-code">Six-digit code</label>
              <input id="auth-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="000000" />
            </div>
          )}

          {needsPassword && (
            <div className="form-group">
              <label htmlFor="auth-password">{view === 'reset-password' ? 'New password' : 'Password'}</label>
              <div className="password-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={view === 'login' ? 'Your password' : 'At least 8 characters'}
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'View'}
                </button>
              </div>
            </div>
          )}

          {notice && <div className="success-box" role="status">{notice}</div>}
          {error && <div className="error-box" role="alert">{error}</div>}

          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? 'Please wait...' : ({ login: 'Login', register: 'Send verification code', 'verify-email': 'Verify email', 'forgot-password': 'Send reset code', 'reset-password': 'Save new password' }[view])}
          </button>
        </form>

        {view === 'login' && (
          <div className="auth-demo-actions">
            <button className="link-btn" type="button" onClick={() => setPage('forgot-password')}>Forgot password?</button>
            <span className="auth-divider">OR</span>
            <button className="secondary-btn" type="button" disabled={loading} onClick={handleDemoLogin}>
              {loading ? 'Please wait...' : 'Login with demo'}
            </button>
            <small>Starts a private demo account that expires after 10 days.</small>
          </div>
        )}

        {view === 'verify-email' && <button className="link-btn" type="button" disabled={loading} onClick={resendVerification}>Resend verification code</button>}
        {view === 'reset-password' && <button className="link-btn" type="button" disabled={loading} onClick={() => setPage('forgot-password')}>Send another reset code</button>}
        {view === 'forgot-password' && <button className="link-btn" type="button" onClick={() => setPage('login')}>Back to login</button>}
        {(view === 'login' || view === 'register') && (
          <button className="link-btn" type="button" onClick={() => setPage(view === 'login' ? 'register' : 'login')}>
            {view === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        )}
        {(view === 'verify-email' || view === 'reset-password') && <button className="link-btn" type="button" onClick={() => setPage('login')}>Back to login</button>}
      </div>
    </div>
  );
};

export default AuthScreen;
