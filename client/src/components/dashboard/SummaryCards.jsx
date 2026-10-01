import Skeleton from '../common/Skeleton';

const SummaryCards = ({ stats, formatCurrency, isLoading = false }) => {
  const cards = [
    ['Total Accounts', stats.totalAccounts],
    ['Active Accounts', stats.activeAccounts],
    ['Total Funding', formatCurrency(stats.totalFunding)],
    ['Net PnL', formatCurrency(stats.totalProfit)],
    ['Total Payouts', formatCurrency(stats.totalPayouts)],
    ['Failed Accounts', stats.failedAccounts],
    ['Planned Funding', formatCurrency(stats.plannedFunding)],
    ['Combined Funding', formatCurrency(stats.combinedFunding)],
  ];

  return (
    <section className="summary-grid">
      {cards.map(([label, value]) => (
        <div className="kpi-card" key={label}>
          <span>{label}</span>
          <strong>{isLoading ? <Skeleton className="skeleton-value" /> : value}</strong>
        </div>
      ))}
    </section>
  );
};

export default SummaryCards;
