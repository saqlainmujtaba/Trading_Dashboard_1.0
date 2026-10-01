import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim() || (!isLogin && !form.name.trim())) {
      setError(isLogin ? 'Enter your email and password.' : 'Enter your name, email, and password.');
      return;
    }

    setLoading(true);
    try {
      const authMode = isLogin ? 'login' : 'register';
      const response = await api.post(`/auth/${authMode}`, { ...form, email: form.email.trim() });
      completeAuth(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const completeAuth = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify({ name: userData.name, email: userData.email }));
    onAuthSuccess(userData);
    navigate('/');
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-badge large">PT</div>
          <h1>{isLogin ? 'Login to Dashboard' : 'Create Account'}</h1>
          <p>Personal Trading Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="demo@trading.com" />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="password123"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'View'}
              </button>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {isLogin && (
          <div className="auth-demo-actions">
            <span className="auth-divider">OR</span>
            <button className="secondary-btn" type="button" disabled={loading} onClick={handleDemoLogin}>
              {loading ? 'Please wait...' : 'Login with demo'}
            </button>
            <small>Starts a private demo account that expires after 10 days.</small>
          </div>
        )}

        <button className="link-btn" type="button" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
