const SummaryCards = ({ stats, formatCurrency }) => (
  <section className="summary-grid">
    <div className="kpi-card"><span>Total Accounts</span><strong>{stats.totalAccounts}</strong></div>
    <div className="kpi-card"><span>Active Accounts</span><strong>{stats.activeAccounts}</strong></div>
    <div className="kpi-card"><span>Total Funding</span><strong>{formatCurrency(stats.totalFunding)}</strong></div>
    <div className="kpi-card"><span>Net PnL</span><strong>{formatCurrency(stats.totalProfit)}</strong></div>
    <div className="kpi-card"><span>Total Payouts</span><strong>{formatCurrency(stats.totalPayouts)}</strong></div>
    <div className="kpi-card"><span>Failed Accounts</span><strong>{stats.failedAccounts}</strong></div>
    <div className="kpi-card"><span>Planned Funding</span><strong>{formatCurrency(stats.plannedFunding)}</strong></div>
    <div className="kpi-card"><span>Combined Funding</span><strong>{formatCurrency(stats.combinedFunding)}</strong></div>
  </section>
);

export default SummaryCards;
