import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Sidebar from '../layout/Sidebar';

const AdminPage = ({ user, onLogout, theme, onToggleTheme }) => {
  const [data, setData] = useState({ users: [], totalUsers: 0, totalAdmins: 0 });
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setError('');
    try {
      const response = await api.get('/admin/users');
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const inspectUser = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setSelected(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load user records.');
    }
  };

  const changeRole = async (target, role) => {
    try {
      await api.patch(`/admin/users/${target._id}/role`, { role });
      await loadUsers();
      if (selected?.user?._id === target._id) {
        setSelected((current) => ({ ...current, user: { ...current.user, role } }));
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not change user role.');
    }
  };

  const users = data.users.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="app-shell">
      <Sidebar user={user} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      <main className="content">
        <header className="topbar">
          <div><p className="eyebrow">Admin control</p><h1>User management</h1></div>
          <Link className="secondary-btn" to="/">Back to dashboard</Link>
        </header>
        {error && <div className="error-box" role="alert">{error}</div>}
        <div className="admin-stats-grid">
          <div className="profile-card"><span className="muted">Total users</span><strong>{data.totalUsers}</strong></div>
          <div className="profile-card"><span className="muted">Admins</span><strong>{data.totalAdmins}</strong></div>
        </div>
        <section className="section-block">
          <div className="section-head"><div><p className="eyebrow">Accounts and stored records</p><h2>Users</h2></div><button className="secondary-btn" onClick={loadUsers}>Refresh</button></div>
          <input aria-label="Search users" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="muted">Loading users…</p> : (
            <div className="admin-user-list">
              {users.map((item) => (
                <article className="admin-user-row" key={item._id}>
                  <div className="admin-user-main">
                    <strong>{item.name}</strong><span className="muted">{item.email}</span>
                    <small>{item.counts.accounts} accounts · {item.counts.trades} trades · {item.counts.plannedAccounts} planned · {item.counts.payouts} payouts</small>
                  </div>
                  <label className="admin-role-control"><span>Role</span>
                    <select aria-label={`Role for ${item.name}`} value={item.role} onChange={(event) => changeRole(item, event.target.value)}>
                      <option value="user">User</option><option value="admin">Admin</option>
                    </select>
                  </label>
                  <button className="secondary-btn" onClick={() => inspectUser(item._id)}>View stored data</button>
                </article>
              ))}
              {!users.length && <p className="empty-state">No matching users.</p>}
            </div>
          )}
        </section>
        {selected && (
          <section className="section-block">
            <div className="section-head"><div><p className="eyebrow">{selected.user.email}</p><h2>{selected.user.name} — stored data</h2></div><button className="secondary-btn" onClick={() => setSelected(null)}>Close</button></div>
            <div className="admin-record-grid">
              {['profile', 'accounts', 'plannedAccounts', 'trades', 'payouts'].map((key) => (
                <details className="profile-card admin-record" key={key} open={key === 'profile'}>
                  <summary>{key === 'plannedAccounts' ? 'Planned accounts' : key[0].toUpperCase() + key.slice(1)} ({Array.isArray(selected[key]) ? selected[key].length : 'profile'})</summary>
                  <pre>{JSON.stringify(selected[key], null, 2)}</pre>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
