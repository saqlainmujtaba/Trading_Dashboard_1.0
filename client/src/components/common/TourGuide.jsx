import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const steps = [
  { path: '/', hash: '#overview', target: 'dashboard-overview', title: 'Your trading dashboard', body: 'This is your home base. The sidebar moves between sections, Analytics, and your profile.' },
  { path: '/', hash: '#overview', target: 'dashboard-summary', title: 'Performance at a glance', body: 'These summary figures update from your accounts, trades, payouts, and planned funding.' },
  { path: '/', hash: '#portfolio', target: 'portfolio-heading', title: 'Prop-firm portfolio', body: 'Compare total funding, balance, and profit across the firms where you hold accounts.' },
  { path: '/', hash: '#accounts', target: 'accounts-heading', title: 'Current accounts', body: 'Add and manage funded or evaluation accounts. Their status, balances, limits, and payout details appear here.' },
  { path: '/', hash: '#planned', target: 'planned-heading', title: 'Planned accounts', body: 'Keep upcoming challenges, expected costs, sizes, and priorities in one place.' },
  { path: '/', hash: '#history', target: 'manual-trade-button', title: 'Add trades manually', body: 'Use Add trade to record a position by hand. P/L and risk-to-reward update from the values you enter.' },
  { path: '/', hash: '#history', target: 'trade-import-button', title: 'Import platform history', body: 'Import CSV or XLSX history from supported MT5, cTrader, or MatchTrader exports. Review the preview and choose an active account before saving.' },
  { path: '/', hash: '#history', target: 'trade-pagination', title: 'Browse trade history', body: 'Sort trades and choose 10, 20, 50, 100, or all rows. Previous and Next change only this table.' },
  { path: '/', hash: '#history', target: 'payouts-heading', title: 'Track payouts', body: 'Add payouts to an account and follow amounts, payment methods, dates, and status.' },
  { path: '/analytics', hash: '', target: 'analytics-filters', title: 'Filter analytics', body: 'Search trades and narrow the charts and report by date, account, pair, direction, and result.' },
  { path: '/analytics', hash: '', target: 'analytics-chart-types', title: 'Choose chart types', body: 'Switch each chart between the available visualizations. Time-series and status charts offer the types that best fit their data.' },
  { path: '/analytics', hash: '', target: 'analytics-exports', title: 'Export your report', body: 'Download the currently filtered trade report as CSV or PDF.' },
  { path: '/profile', hash: '', target: 'profile-overview', title: 'Your trader profile', body: 'Review and edit your personal details, trading style, markets, strategy, and goals.' },
];

const TourGuide = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const step = steps[stepIndex];

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return undefined;
    if (location.pathname !== step.path || location.hash !== step.hash) {
      navigate(`${step.path}${step.hash}`, { replace: false });
      return undefined;
    }

    let attempts = 0;
    let measureTimer;
    const locateTarget = () => {
      attempts += 1;
      const target = document.querySelector(`[data-tour="${step.target}"]`);
      if (!target) {
        if (attempts >= 30) {
          window.clearInterval(targetTimer);
          setTargetRect(null);
        }
        return;
      }

      window.clearInterval(targetTimer);
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      measureTimer = window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        setTargetRect({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height });
      }, 500);
    };
    const targetTimer = window.setInterval(locateTarget, 100);

    return () => {
      window.clearInterval(targetTimer);
      window.clearTimeout(measureTimer);
    };
  }, [location.hash, location.pathname, navigate, open, step]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setStepIndex((index) => Math.min(steps.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setStepIndex((index) => Math.max(0, index - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const popoverWidth = Math.min(380, window.innerWidth - 32);
  const popoverHeight = 300;
  const popoverStyle = targetRect
    ? {
      left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - popoverWidth / 2, window.innerWidth - popoverWidth - 16)),
      top: targetRect.bottom + popoverHeight + 16 < window.innerHeight
        ? targetRect.bottom + 16
        : Math.max(16, targetRect.top - popoverHeight - 16),
      width: popoverWidth,
    }
    : { left: '50%', top: '50%', width: popoverWidth, transform: 'translate(-50%, -50%)' };

  return (
    <div className="tour-backdrop" role="presentation">
      {targetRect && (
        <div
          className="tour-spotlight"
          aria-hidden="true"
          style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }}
        />
      )}
      <section className="tour-popover" role="dialog" aria-modal="true" aria-labelledby="tour-title" style={popoverStyle}>
        <div className="tour-progress-track"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
        <p className="eyebrow">Dashboard tour · {stepIndex + 1} of {steps.length}</p>
        <h2 id="tour-title">{step.title}</h2>
        <p className="tour-copy">{step.body}</p>
        <div className="tour-actions">
          <button className="link-btn tour-skip" type="button" onClick={onClose}>Skip tour</button>
          <div className="tour-step-actions">
            <button className="secondary-btn" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => Math.max(0, index - 1))}>Back</button>
            {stepIndex < steps.length - 1 ? (
              <button className="primary-btn" type="button" onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}>Next</button>
            ) : (
              <button className="primary-btn" type="button" onClick={onClose}>Finish tour</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TourGuide;
