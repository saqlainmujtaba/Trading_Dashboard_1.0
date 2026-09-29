import { useState } from 'react';
import SortControl from '../common/SortControl';
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

const PortfolioSection = ({ accounts = [], formatCurrency }) => {
  const [sortBy, setSortBy] = useState('firm.asc');
  const firms = [...new Set(accounts.map((account) => account.propFirm?.trim() || 'Unspecified firm'))];
  const summaries = firms.map((firm) => {
    const firmAccounts = accounts.filter((account) => (account.propFirm?.trim() || 'Unspecified firm') === firm);
    return {
      firm,
      accountCount: firmAccounts.length,
      fundedAmount: firmAccounts.reduce((total, account) => total + Number(account.fundedAmount || 0), 0),
      balance: firmAccounts.reduce((total, account) => total + Number(account.balance || 0), 0),
      startingBalance: firmAccounts.reduce((total, account) => total + Number(account.startingBalance || 0), 0),
    };
  });
  const sortedSummaries = sortRows(summaries, sortBy);

  return (
    <section id="portfolio" className="section-block">
      <div className="section-head">
        <h2 data-tour="portfolio-heading">Prop-Firm Portfolio</h2>
        <div className="section-actions">
          <SortControl value={sortBy} options={portfolioSortOptions} onChange={setSortBy} label="Sort portfolio" />
          <span className="section-tag">Firm overview</span>
        </div>
      </div>

      {sortedSummaries.length ? (
        <div className="portfolio-grid">
          {sortedSummaries.map((summary) => (
            <div key={summary.firm} className="portfolio-card">
              <h3>{summary.firm}</h3>
              <p>{summary.accountCount} {summary.accountCount === 1 ? 'account' : 'accounts'}</p>
              <div className="portfolio-metrics">
                <span>Funded</span><strong>{formatCurrency(summary.fundedAmount)}</strong>
                <span>Balance</span><strong>{formatCurrency(summary.balance)}</strong>
                <span>Profit</span><strong>{formatCurrency(summary.balance - summary.startingBalance)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">Add a current account to see its prop firm here.</p>
      )}
    </section>
  );
};

export default PortfolioSection;
