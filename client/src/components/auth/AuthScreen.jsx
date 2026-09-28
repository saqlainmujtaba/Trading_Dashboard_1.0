import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: 'demo@trading.com', password: 'password123' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post(isLogin ? '/auth/login' : '/auth/register', form);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({ name: response.data.name, email: response.data.email }));
      onAuthSuccess(response.data);
      navigate('/dashboard');
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
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                required
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

        <button className="link-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
