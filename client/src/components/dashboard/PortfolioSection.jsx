import { useState } from 'react';
import SortControl from '../common/SortControl';
import Skeleton from '../common/Skeleton';
import { sortRows } from '../common/sortRows';

const portfolioSortOptions = [
  { value: 'firm.asc', label: 'Firm: A to Z' },
  { value: 'firm.desc', label: 'Firm: Z to A' },
  { value: 'accountCount.desc', label: 'Accounts: most to fewest' },
  { value: 'accountCount.asc', label: 'Accounts: fewest to most' },
  { value: 'fundedAmount.desc', label: 'Funding: high to low' },
  { value: 'fundedAmount.asc', label: 'Funding: low to high' },
  { value: 'balance.desc', label: 'Balance: high to low' },
  { value: 'balance.asc', label: 'Balance: low to high' },
  { value: 'profit.desc', label: 'Profit: high to low' },
  { value: 'profit.asc', label: 'Profit: low to high' },
];

const PortfolioSection = ({ accounts = [], plannedAccounts = [], formatCurrency, isLoading = false }) => {
  const [sortBy, setSortBy] = useState('firm.asc');
  const firms = [...new Set(accounts.map((account) => account.propFirm?.trim() || 'Unspecified firm'))];
  const summaries = firms.map((firm) => {
    const firmAccounts = accounts.filter((account) => (account.propFirm?.trim() || 'Unspecified firm') === firm);
    const activeAccounts = firmAccounts.filter((account) => account.status === 'Active');
    return {
      firm,
      accountCount: firmAccounts.length,
      fundedAmount: firmAccounts.reduce((total, account) => total + Number(account.fundedAmount || 0), 0),
      balance: activeAccounts.reduce((total, account) => total + Number(account.balance || 0), 0),
      profit: firmAccounts.reduce((total, account) => total + (Number(account.balance || 0) - Number(account.startingBalance || 0)), 0),
    };
  });
  const sortedSummaries = sortRows(summaries, sortBy);
  const plannedFirms = [...new Set(plannedAccounts.map((account) => account.company?.trim() || 'Unspecified firm'))];
  const plannedSummaries = plannedFirms.map((firm) => {
    const firmAccounts = plannedAccounts.filter((account) => (account.company?.trim() || 'Unspecified firm') === firm);
    return {
      firm,
      accountCount: firmAccounts.length,
      plannedFunding: firmAccounts.reduce((total, account) => total + Number(account.size || 0), 0),
      expectedCost: firmAccounts.reduce((total, account) => total + Number(account.cost || 0), 0),
    };
  }).sort((first, second) => first.firm.localeCompare(second.firm));

  return (
    <section id="portfolio" className="section-block">
      <div className="section-head">
        <h2>Prop-Firm Portfolio</h2>
        <div className="section-actions">
          <SortControl value={sortBy} options={portfolioSortOptions} onChange={setSortBy} label="Sort portfolio" />
          <span className="section-tag">Firm overview</span>
        </div>
      </div>

      {isLoading ? (
        <div className="portfolio-grid" aria-label="Loading portfolio summaries">
          {[0, 1].map((item) => (
            <div key={item} className="portfolio-card skeleton-card" aria-hidden="true">
              <Skeleton className="skeleton-line skeleton-line-wide" />
              <Skeleton className="skeleton-line skeleton-line-short" />
              {[0, 1, 2].map((line) => <Skeleton key={line} className="skeleton-line" />)}
            </div>
          ))}
        </div>
      ) : sortedSummaries.length ? (
        <div className="portfolio-grid">
          {sortedSummaries.map((summary) => (
            <div key={summary.firm} className="portfolio-card">
              <h3>{summary.firm}</h3>
              <p>{summary.accountCount} {summary.accountCount === 1 ? 'account' : 'accounts'}</p>
              <div className="portfolio-metrics">
                <span>Funded</span><strong>{formatCurrency(summary.fundedAmount)}</strong>
                <span>Active balance</span><strong>{formatCurrency(summary.balance)}</strong>
                <span>Profit</span><strong>{formatCurrency(summary.profit)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No portfolio accounts yet. Add a current account to see your prop firms here.</p>
      )}

      <div id="planned-portfolio" className="section-head planned-overview-head">
        <h2>Planned Prop-Firm Overview</h2>
      </div>

      {isLoading ? (
        <div className="portfolio-grid" aria-label="Loading planned portfolio summaries">
          {[0, 1].map((item) => (
            <div key={item} className="portfolio-card skeleton-card" aria-hidden="true">
              <Skeleton className="skeleton-line skeleton-line-wide" />
              <Skeleton className="skeleton-line skeleton-line-short" />
              {[0, 1].map((line) => <Skeleton key={line} className="skeleton-line" />)}
            </div>
          ))}
        </div>
      ) : plannedSummaries.length ? (
        <div className="portfolio-grid">
          {plannedSummaries.map((summary) => (
            <div key={summary.firm} className="portfolio-card">
              <h3>{summary.firm}</h3>
              <p>{summary.accountCount} {summary.accountCount === 1 ? 'planned account' : 'planned accounts'}</p>
              <div className="portfolio-metrics">
                <span>Planned funding</span><strong>{formatCurrency(summary.plannedFunding)}</strong>
                <span>Expected cost</span><strong>{formatCurrency(summary.expectedCost)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No planned prop firms yet. Add a plan to see it summarized here.</p>
      )}
    </section>
  );
};

export default PortfolioSection;
