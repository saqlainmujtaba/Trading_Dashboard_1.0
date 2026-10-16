import Skeleton from '../common/Skeleton';

const SummaryCards = ({ stats, formatCurrency, isLoading = false, loadingSections = new Set() }) => {
  const cards = [
    ['Total Accounts', stats.totalAccounts, ['accounts']],
    ['Active Accounts', stats.activeAccounts, ['accounts']],
    ['Challenges Passed', stats.challengePassed, ['accounts']],
    ['Total Funding', formatCurrency(stats.totalFunding), ['accounts']],
    ['Challenge Capital', formatCurrency(stats.challengeFunding), ['accounts']],
    ['Estimated Monthly Return', formatCurrency(stats.monthlyReturn), ['accounts']],
    ['Active Funded Amount', formatCurrency(stats.projectedActiveFunding), ['accounts']],
    ['Active PnL', formatCurrency(stats.totalProfit - stats.totalPayouts), ['trades', 'payouts']],
    ['Total Payouts', formatCurrency(stats.totalPayouts), ['payouts']],
    ['Failed Accounts', stats.failedAccounts, ['accounts']],
    ['Planned Funding', formatCurrency(stats.plannedFunding), ['planned']],
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
