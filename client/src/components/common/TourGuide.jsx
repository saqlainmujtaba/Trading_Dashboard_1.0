import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const tourSteps = [
  {
    path: '/',
    target: '.summary-grid .kpi-card:first-child',
    title: 'Your trading overview',
    description: 'Start here for a quick read on active accounts, funding, profit, and payouts.',
  },
  {
    path: '/',
    target: '#portfolio .section-head',
    title: 'Prop-firm portfolio',
    description: 'Compare account counts, funded amounts, balances, and profit by firm.',
  },
  {
    path: '/',
    target: '#accounts .section-head',
    title: 'Current accounts',
    description: 'Add and manage funded accounts, track their limits, balances, and status.',
  },
  {
    path: '/',
    target: '#planned .section-head',
    title: 'Plan what is next',
    description: 'Keep upcoming challenges and purchases organized by date, cost, and priority.',
  },
  {
    path: '/',
    target: '#history .section-head',
    title: 'Trades and payouts',
    description: 'Log trades, import trade files, and record payout requests in one history.',
  },
  {
    path: '/analytics',
    target: '[data-tour-target="analytics"]',
    title: 'Trade analytics',
    description: 'Review performance, filter your journal, compare accounts, and export reports.',
  },
  {
    path: '/profile',
    target: '[data-tour-target="profile"]',
    title: 'Your trader profile',
    description: 'Add your trading preferences, experience, strategy, and personal goals.',
  },
];

const TourGuide = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const step = tourSteps[stepIndex];
  const storageKey = `trading-dashboard-tour:${user?._id || user?.id || user?.email || 'user'}`;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setIsOpen(true);
  }, [storageKey]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (location.pathname !== step.path) {
      navigate(step.path);
      return undefined;
    }

    let frameId;
    let cleanupListeners = () => {};
    const timeoutId = window.setTimeout(() => {
      const target = document.querySelector(step.target);
      if (!target) {
        setTargetRect(null);
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const measure = () => {
        const rect = target.getBoundingClientRect();
        setTargetRect({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height });
      };
      frameId = window.requestAnimationFrame(measure);
      window.addEventListener('scroll', measure, true);
      window.addEventListener('resize', measure);
      cleanupListeners = () => {
        window.removeEventListener('scroll', measure, true);
        window.removeEventListener('resize', measure);
      };
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
      cleanupListeners();
    };
  }, [isOpen, location.pathname, navigate, step]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeTour();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const closeTour = () => {
    localStorage.setItem(storageKey, 'complete');
    setIsOpen(false);
    setTargetRect(null);
  };

  const startTour = () => {
    setStepIndex(0);
    setIsOpen(true);
  };

  const goToStep = (nextIndex) => {
    setTargetRect(null);
    setStepIndex(nextIndex);
  };

  const preferredDialogWidth = Math.min(360, window.innerWidth - 32);
  const hasRoomBelow = targetRect && window.innerHeight - targetRect.bottom >= 250;
  const hasRoomAbove = targetRect && targetRect.top >= 250;
  const rightSpace = targetRect ? window.innerWidth - targetRect.right - 32 : 0;
  const leftSpace = targetRect ? targetRect.left - 32 : 0;
  const placeBesideRight = targetRect && !hasRoomBelow && !hasRoomAbove && rightSpace >= 280;
  const placeBesideLeft = targetRect && !hasRoomBelow && !hasRoomAbove && !placeBesideRight && leftSpace >= 280;
  const dialogWidth = placeBesideRight
    ? Math.min(preferredDialogWidth, rightSpace)
    : placeBesideLeft
      ? Math.min(preferredDialogWidth, leftSpace)
      : preferredDialogWidth;
  const dialogLeft = targetRect
    ? placeBesideRight
      ? targetRect.right + 16
      : placeBesideLeft
        ? targetRect.left - dialogWidth - 16
        : Math.min(Math.max(16, targetRect.left + (targetRect.width - dialogWidth) / 2), window.innerWidth - dialogWidth - 16)
    : 16;
  const dialogTop = targetRect
    ? hasRoomBelow
      ? targetRect.bottom + 16
      : hasRoomAbove
        ? targetRect.top - 240
        : Math.min(Math.max(16, targetRect.top + (targetRect.height - 230) / 2), window.innerHeight - 246)
    : Math.max(16, window.innerHeight / 2 - 100);

  return (
    <>
      {!isOpen && (
        <button type="button" className="tour-launcher" onClick={startTour} aria-label="Start product tour" title="Take a tour">
          <span aria-hidden="true">?</span>
          <span>Tour</span>
        </button>
      )}
      {isOpen && (
        <div className="tour-layer">
          {targetRect ? (
            <>
              <div className="tour-shade" style={{ top: 0, left: 0, right: 0, height: Math.max(0, targetRect.top) }} />
              <div className="tour-shade" style={{ top: targetRect.bottom, left: 0, right: 0, bottom: 0 }} />
              <div className="tour-shade" style={{ top: targetRect.top, left: 0, width: Math.max(0, targetRect.left), height: targetRect.height }} />
              <div className="tour-shade" style={{ top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height }} />
              <div
                className="tour-spotlight"
                style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }}
              />
            </>
          ) : <div className="tour-shade tour-shade-full" />}

          <section
            className="tour-dialog"
            style={{ width: dialogWidth, left: dialogLeft, top: dialogTop }}
            role="dialog"
            aria-label="Product tour"
            aria-live="polite"
          >
            <div className="tour-dialog-topline">
              <span>GETTING STARTED</span>
              <button type="button" className="tour-close" onClick={closeTour} aria-label="Close tour">×</button>
            </div>
            <p className="tour-progress">Step {stepIndex + 1} of {tourSteps.length}</p>
            <h2>{step.title}</h2>
            <p className="tour-description">{step.description}</p>
            <div className="tour-dialog-actions">
              <button type="button" className="tour-skip" onClick={closeTour}>Skip tour</button>
              <div className="tour-step-actions">
                {stepIndex > 0 && (
                  <button type="button" className="tour-back" onClick={() => goToStep(stepIndex - 1)}>Back</button>
                )}
                <button
                  type="button"
                  className="tour-next"
                  onClick={() => (stepIndex === tourSteps.length - 1 ? closeTour() : goToStep(stepIndex + 1))}
                >
                  {stepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
                  {stepIndex < tourSteps.length - 1 && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default TourGuide;