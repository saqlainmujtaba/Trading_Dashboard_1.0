import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AuthScreen = ({ onAuthSuccess }) => {
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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

    setLoading(true);
    try {
      if (view === 'login') {
        const response = await api.post('/auth/login', { email, password: form.password });
        completeAuth(response.data);
      } else {
        const response = await api.post('/auth/register', { ...form, name: form.name.trim(), email, password: form.password });
        completeAuth(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
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

  const setPage = (nextView) => {
    setView(nextView);
    setError('');
    setForm((previous) => ({ ...previous, password: '' }));
  };
  const titles = {
    login: 'Login to Dashboard',
    register: 'Create Account',
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

          {error && <div className="error-box" role="alert">{error}</div>}

          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? 'Please wait...' : (view === 'login' ? 'Login' : 'Create account')}
          </button>
        </form>

        {view === 'login' && (
          <div className="auth-demo-actions">
            <span className="auth-divider">OR</span>
            <button className="secondary-btn" type="button" disabled={loading} onClick={handleDemoLogin}>
              {loading ? 'Please wait...' : 'Login with demo'}
            </button>
            <small>Starts a private demo account that expires after 10 days.</small>
          </div>
        )}

        <button className="link-btn" type="button" onClick={() => setPage(view === 'login' ? 'register' : 'login')}>
          {view === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
