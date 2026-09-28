const PortfolioSection = ({ accounts, formatCurrency }) => (
  <section id="portfolio" className="section-block">
    <div className="section-head">
      <h2>Prop-Firm Portfolio</h2>
      <span className="section-tag">Firm overview</span>
    </div>

    <div className="portfolio-grid">
      {['FundedSquad', 'FTMO', 'Funding Pips'].map((firm) => {
        const firmAccounts = accounts.filter((account) => account.propFirm === firm);
        const total = firmAccounts.reduce((sum, account) => sum + Number(account.fundedAmount || 0), 0);
        return (
          <div key={firm} className="portfolio-card">
            <h3>{firm}</h3>
            <p>{firmAccounts.length} accounts / {formatCurrency(total)}</p>
          </div>
        );
      })}
    </div>
  </section>
);

export default PortfolioSection;
