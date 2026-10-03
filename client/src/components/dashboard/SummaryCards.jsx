import Skeleton from '../common/Skeleton';

const SummaryCards = ({ stats, formatCurrency, isLoading = false, loadingSections = new Set() }) => {
  const cards = [
    ['Total Accounts', stats.totalAccounts, ['accounts']],
    ['Active Accounts', stats.activeAccounts, ['accounts']],
    ['Total Funding', formatCurrency(stats.totalFunding), ['accounts']],
    ['Active PnL', formatCurrency(stats.totalProfit - stats.totalPayouts), ['trades', 'payouts']],
    ['Total Payouts', formatCurrency(stats.totalPayouts), ['payouts']],
    ['Failed Accounts', stats.failedAccounts, ['accounts']],
    ['Planned Funding', formatCurrency(stats.plannedFunding), ['planned']],
    ['Expected Combined Funding', formatCurrency(stats.combinedFunding), ['accounts', 'planned']],
  ];

  return (
    <section className="summary-grid">
      {cards.map(([label, value, sections]) => (
        <div className="kpi-card" key={label}>
          <span>{label}</span>
          <strong>{isLoading || sections.some((section) => loadingSections.has(section))
            ? <Skeleton className="skeleton-value" />
            : value}</strong>
        </div>
      ))}
    </section>
  );
};

export default SummaryCards;
