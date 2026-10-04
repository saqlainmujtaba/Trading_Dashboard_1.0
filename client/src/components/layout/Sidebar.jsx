import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ user, theme, onToggleTheme, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [areHomeSectionsOpen, setAreHomeSectionsOpen] = useState(false);
  const [activeHomeSection, setActiveHomeSection] = useState('overview');
  const location = useLocation();
  let profileName = '';

  try {
    profileName = JSON.parse(localStorage.getItem('profileData') || '{}').fullName || '';
  } catch {
    profileName = '';
  }

  const displayName = profileName || user?.name || 'Trader';

  const handleNavClick = () => setIsMobileMenuOpen(false);
  const isHome = location.pathname === '/' || location.pathname === '/dashboard';
  const isSectionActive = (section) => isHome && activeHomeSection === section;
  const isPageActive = (path) => location.pathname === path;

  useEffect(() => {
    if (!isHome) setAreHomeSectionsOpen(false);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return undefined;

    const sections = ['overview', 'portfolio', 'accounts', 'monthly-return', 'planned', 'history', 'payouts'];
    const updateActiveSection = () => {
      const activationLine = Math.min(180, window.innerHeight * 0.3);
      let currentSection = sections[0];

      sections.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (section && section.getBoundingClientRect().top <= activationLine) {
          currentSection = sectionId;
        }
      });

      setActiveHomeSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [isHome, location.pathname]);

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
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={`nav-links ${isMobileMenuOpen ? 'nav-links-open' : ''}`}>
        <div className="nav-page-group">
          <Link
            className={`nav-page-link ${isHome ? 'nav-link-active' : ''}`}
            to="/"
            onClick={() => {
              setAreHomeSectionsOpen(true);
              handleNavClick();
            }}
            aria-current={isHome ? 'page' : undefined}
            aria-expanded={areHomeSectionsOpen}
            aria-controls="home-section-links"
          >
            Home
          </Link>
          {areHomeSectionsOpen && (
            <div id="home-section-links" className="nav-section-links" aria-label="Home sections">
              <Link className={isSectionActive('overview') ? 'nav-link-active' : ''} to="/#overview" onClick={handleNavClick} aria-current={isSectionActive('overview') ? 'location' : undefined}>Overview</Link>
              <Link className={isSectionActive('portfolio') ? 'nav-link-active' : ''} to="/#portfolio" onClick={handleNavClick} aria-current={isSectionActive('portfolio') ? 'location' : undefined}>Portfolio</Link>
              <Link className={isSectionActive('accounts') ? 'nav-link-active' : ''} to="/#accounts" onClick={handleNavClick} aria-current={isSectionActive('accounts') ? 'location' : undefined}>Accounts</Link>
              <Link className={isSectionActive('monthly-return') ? 'nav-link-active' : ''} to="/#monthly-return" onClick={handleNavClick} aria-current={isSectionActive('monthly-return') ? 'location' : undefined}>Monthly Return</Link>
              <Link className={isSectionActive('planned') ? 'nav-link-active' : ''} to="/#planned" onClick={handleNavClick} aria-current={isSectionActive('planned') ? 'location' : undefined}>Planned</Link>
              <Link className={isSectionActive('history') ? 'nav-link-active' : ''} to="/#history" onClick={handleNavClick} aria-current={isSectionActive('history') ? 'location' : undefined}>History</Link>
              <Link className={isSectionActive('payouts') ? 'nav-link-active' : ''} to="/#payouts" onClick={handleNavClick} aria-current={isSectionActive('payouts') ? 'location' : undefined}>Payouts</Link>
            </div>
          )}
        </div>
        <div className="nav-page-links" aria-label="Separate pages">
          <Link className={isPageActive('/analytics') ? 'nav-link-active' : ''} to="/analytics" onClick={handleNavClick} aria-current={isPageActive('/analytics') ? 'page' : undefined}>Analytics</Link>
          <Link className={isPageActive('/profile') ? 'nav-link-active' : ''} to="/profile" onClick={handleNavClick} aria-current={isPageActive('/profile') ? 'page' : undefined}>Profile</Link>
        </div>

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
