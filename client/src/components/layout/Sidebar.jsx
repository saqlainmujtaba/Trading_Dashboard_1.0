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
        <Link to="/" className="brand-home" onClick={handleNavClick} aria-label="Trading dashboard home">
          <div className="brand-badge">PT</div>
          <div>
            <h2>Trading</h2>
            <p>Dashboard</p>
          </div>
        </Link>
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
        <Link to="/#overview" onClick={handleNavClick}>Overview</Link>
        <Link to="/#accounts" onClick={handleNavClick}>Accounts</Link>
        <Link to="/#planned" onClick={handleNavClick}>Planned</Link>
        <Link to="/#portfolio" onClick={handleNavClick}>Portfolio</Link>
        <Link to="/#history" onClick={handleNavClick}>History</Link>
        <Link to="/#payouts" onClick={handleNavClick}>Payouts</Link>
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
