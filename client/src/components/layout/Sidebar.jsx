import { useState } from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({ user, theme, onToggleTheme, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  let profileName = '';

  try {
    profileName = JSON.parse(localStorage.getItem('profileData') || '{}').fullName || '';
  } catch {
    profileName = '';
  }

  const displayName = profileName || user?.name || 'Trader';

  const handleNavClick = () => setIsMobileMenuOpen(false);

  return (
    <aside className="sidebar">
      <div className="brand-wrap">
        <div className="brand-badge">PT</div>
        <div>
          <h2>Trading</h2>
          <p>Dashboard</p>
        </div>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={`nav-links ${isMobileMenuOpen ? 'nav-links-open' : ''}`}>
        <a href="/dashboard#overview" onClick={handleNavClick}>Overview</a>
        <a href="/dashboard#accounts" onClick={handleNavClick}>Accounts</a>
        <a href="/dashboard#planned" onClick={handleNavClick}>Planned</a>
        <a href="/dashboard#portfolio" onClick={handleNavClick}>Portfolio</a>
        <a href="/dashboard#history" onClick={handleNavClick}>History</a>
        <Link to="/analytics" onClick={handleNavClick}>Analytics</Link>
        <Link to="/profile" onClick={handleNavClick}>Profile</Link>

        <div className="mobile-sidebar-footer">
          <div className="user-summary">
            <span className="status-dot" />
            {displayName}
          </div>
          <button className="secondary-btn" onClick={onToggleTheme}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="danger-btn" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="sidebar-footer desktop-sidebar-footer">
        <div className="user-summary">
          <span className="status-dot" />
          {displayName}
        </div>
        <button className="secondary-btn" onClick={onToggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <button className="danger-btn" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  );
};

export default Sidebar;
