import { useState } from 'react';
import FormField from '../common/FormField';
import Skeleton from '../common/Skeleton';
import SortControl from '../common/SortControl';
import { sortRows } from '../common/sortRows';

const accountSortOptions = [
  { value: 'name.asc', label: 'Account name: A to Z' },
  { value: 'name.desc', label: 'Account name: Z to A' },
  { value: 'propFirm.asc', label: 'Prop firm: A to Z' },
  { value: 'propFirm.desc', label: 'Prop firm: Z to A' },
  { value: 'balance.desc', label: 'Balance: high to low' },
  { value: 'balance.asc', label: 'Balance: low to high' },
  { value: 'profit.desc', label: 'Profit: high to low' },
  { value: 'profit.asc', label: 'Profit: low to high' },
  { value: 'profitPercent.desc', label: 'Profit %: high to low' },
  { value: 'profitPercent.asc', label: 'Profit %: low to high' },
  { value: 'fundedAmount.desc', label: 'Funded amount: high to low' },
  { value: 'fundedAmount.asc', label: 'Funded amount: low to high' },
  { value: 'maxDailyLoss.desc', label: 'Daily loss limit: high to low' },
  { value: 'maxDailyLoss.asc', label: 'Daily loss limit: low to high' },
  { value: 'maxOverallLoss.desc', label: 'Overall loss limit: high to low' },
  { value: 'maxOverallLoss.asc', label: 'Overall loss limit: low to high' },
  { value: 'purchaseDate.desc', label: 'Purchase date: newest first' },
  { value: 'purchaseDate.asc', label: 'Purchase date: oldest first' },
  { value: 'nextPayoutDate.asc', label: 'Next payout date: soonest first' },
  { value: 'nextPayoutDate.desc', label: 'Next payout date: latest first' },
  { value: 'payoutReceived.desc', label: 'Payout received: high to low' },
  { value: 'payoutReceived.asc', label: 'Payout received: low to high' },
  { value: 'status.asc', label: 'Status: A to Z' },
  { value: 'type.asc', label: 'Account type: A to Z' },
];

const getProfitAmount = (balance, startingBalance) => Number(balance || 0) - Number(startingBalance || 0);

const getProfitPercent = (fundedAmount, balance, startingBalance) => {
  const safeFundedAmount = Number(fundedAmount || 0);
  const profit = getProfitAmount(balance, startingBalance);
  if (!safeFundedAmount) return 0;
  return (profit / safeFundedAmount) * 100;
};

const getStatusClass = (status) => String(status || 'unknown').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

const AccountSection = ({
  accounts,
  accountForm,
  setAccountForm,
  editingAccountId,
  setEditingAccountId,
  defaultAccountForm,
  handleAccountSubmit,
  formatCurrency,
  deleteAccount,
  updateAccountField,
  showAccountForm,
  setShowAccountForm,
  confirmDelete,
  isLoading = false,
}) => {
  const [sortBy, setSortBy] = useState('name.asc');
  const computedProfit = getProfitAmount(accountForm.balance, accountForm.startingBalance);
  const computedProfitPercent = getProfitPercent(accountForm.fundedAmount, accountForm.balance, accountForm.startingBalance);
  const sortedAccounts = sortRows(accounts, sortBy);

  const handleFieldChange = (field, value) => {
    if (typeof updateAccountField === 'function') {
      updateAccountField(field, value);
      return;
    }

    const nextForm = { ...accountForm, [field]: value };
    if (['fundedAmount', 'balance', 'startingBalance'].includes(field)) {
      const fundedAmount = Number(nextForm.fundedAmount || 0);
      const balance = Number(nextForm.balance || 0);
      const startingBalance = Number(nextForm.startingBalance || 0);
      const profit = balance - startingBalance;
      nextForm.profitPercent = fundedAmount ? Number(((profit / fundedAmount) * 100).toFixed(2)) : 0;
    }
    setAccountForm(nextForm);
  };

  return (
    <section id="accounts" className="section-block">
      <div className="section-head">
        <h2>Current Accounts</h2>
        <div className="section-actions">
          <SortControl value={sortBy} options={accountSortOptions} onChange={setSortBy} label="Sort accounts" />
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              if (!showAccountForm) {
                setShowAccountForm(true);
                return;
              }
              setShowAccountForm(false);
              setEditingAccountId(null);
              setAccountForm(defaultAccountForm);
            }}
          >
            {showAccountForm ? 'Close form' : 'Add account'}
          </button>
          <span className="section-tag">Live portfolio</span>
        </div>
      </div>

      {showAccountForm && (
        <div className="modal-backdrop" onClick={() => { setShowAccountForm(false); setEditingAccountId(null); setAccountForm(defaultAccountForm); }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAccountId ? 'Edit account' : 'New account'}</h3>
              <button type="button" className="icon-close" onClick={() => { setShowAccountForm(false); setEditingAccountId(null); setAccountForm(defaultAccountForm); }}>×</button>
            </div>
            <form className="crud-form modal-form" onSubmit={handleAccountSubmit}>
              <div className="form-grid">
                <FormField label="Account name" required hint="Use a clear name like: FundedSquad 100K or My Main Account">
                  <input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="e.g. FundedSquad 100K" required />
                </FormField>
                <FormField label="Prop firm" hint="Name of the prop firm you are trading with">
                  <input value={accountForm.propFirm} onChange={(e) => setAccountForm({ ...accountForm, propFirm: e.target.value })} placeholder="e.g. FundedSquad" />
                </FormField>
                <FormField label="Account type" hint="Challenge type or model type">
                  <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}>
                    <option>Instant</option>
                    <option>2-Step</option>
                    <option>Evaluation</option>
                  </select>
                </FormField>
                <FormField label="Funded amount" hint="Total account size provided by the prop firm">
                  <input type="number" value={accountForm.fundedAmount} onChange={(e) => handleFieldChange('fundedAmount', Number(e.target.value))} placeholder="50000" />
                </FormField>
                <FormField label="Starting balance" hint="Your account balance when the challenge started">
                  <input type="number" value={accountForm.startingBalance} onChange={(e) => handleFieldChange('startingBalance', Number(e.target.value))} placeholder="0" />
                </FormField>
                <FormField label="Current balance" hint="Live equity or current account balance">
                  <input type="number" value={accountForm.balance} onChange={(e) => handleFieldChange('balance', Number(e.target.value))} placeholder="0" />
                </FormField>
                <div className="account-leverage-settings">
                  <h4>Instrument leverage (1:X)</h4>
                  <p className="muted">Enter this account’s leverage for each market category. Leave 0 if the prop firm does not offer that category.</p>
                  <div className="form-grid">
                    <FormField label="Forex leverage">
                      <input type="number" min="0" step="1" value={accountForm.forexLeverage ?? 0} onChange={(e) => handleFieldChange('forexLeverage', Number(e.target.value))} placeholder="e.g. 100" />
                    </FormField>
                    <FormField label="Indices leverage">
                      <input type="number" min="0" step="1" value={accountForm.indicesLeverage ?? 0} onChange={(e) => handleFieldChange('indicesLeverage', Number(e.target.value))} placeholder="e.g. 50" />
                    </FormField>
                    <FormField label="Commodities leverage">
                      <input type="number" min="0" step="1" value={accountForm.commoditiesLeverage ?? 0} onChange={(e) => handleFieldChange('commoditiesLeverage', Number(e.target.value))} placeholder="e.g. 20" />
                    </FormField>
                    <FormField label="Crypto leverage">
                      <input type="number" min="0" step="1" value={accountForm.cryptoLeverage ?? 0} onChange={(e) => handleFieldChange('cryptoLeverage', Number(e.target.value))} placeholder="e.g. 5" />
                    </FormField>
                  </div>
                </div>
                <FormField label="Profit %" hint="Auto-calculated from current profit divided by funded amount">
                  <input type="number" value={accountForm.profitPercent} readOnly placeholder="0" />
                </FormField>
                <FormField label="Max daily loss %" hint="Daily drawdown limit set by the prop firm">
                  <input type="number" value={accountForm.maxDailyLoss} onChange={(e) => setAccountForm({ ...accountForm, maxDailyLoss: Number(e.target.value) })} placeholder="5" />
                </FormField>
                <FormField label="Max overall loss %" hint="Maximum total drawdown permitted">
                  <input type="number" value={accountForm.maxOverallLoss} onChange={(e) => setAccountForm({ ...accountForm, maxOverallLoss: Number(e.target.value) })} placeholder="10" />
                </FormField>
                <FormField label="Profit target %" hint="Target required to complete the challenge">
                  <input type="number" value={accountForm.profitTarget} onChange={(e) => setAccountForm({ ...accountForm, profitTarget: Number(e.target.value) })} placeholder="10" />
                </FormField>
                <FormField label="Next payout date" hint="When your next payout is expected">
                  <input type="date" value={accountForm.nextPayoutDate} onChange={(e) => setAccountForm({ ...accountForm, nextPayoutDate: e.target.value })} />
                </FormField>
                <FormField label="Purchase date" hint="Date you bought or activated this account">
                  <input type="date" value={accountForm.purchaseDate} onChange={(e) => setAccountForm({ ...accountForm, purchaseDate: e.target.value })} />
                </FormField>
                <FormField label="Payout received" hint="Total amount already paid out on this account">
                  <input type="number" value={accountForm.payoutReceived} onChange={(e) => setAccountForm({ ...accountForm, payoutReceived: Number(e.target.value) })} placeholder="0" />
                </FormField>
                <FormField label="Account status" hint="Current state of the account">
                  <select value={accountForm.status} onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}>
                    <option>Active</option>
                    <option>Paused</option>
                    <option>Failed</option>
                    <option>Closed</option>
                  </select>
                </FormField>
              </div>

              <div className="auto-calc-box">
                <div>
                  <span>Live profit</span>
                  <strong>{formatCurrency(computedProfit)}</strong>
                </div>
                <div>
                  <span>Profit vs funded</span>
                  <strong>{computedProfitPercent.toFixed(2)}%</strong>
                </div>
                <div>
                  <span>Current balance</span>
                  <strong>{formatCurrency(accountForm.balance)}</strong>
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-btn" type="submit">{editingAccountId ? 'Update account' : 'Save account'}</button>
                <button type="button" className="secondary-btn" onClick={() => { setShowAccountForm(false); setEditingAccountId(null); setAccountForm(defaultAccountForm); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isLoading && !accounts.some((account) => account.status === 'Active') && (
        <p className="empty-state">No active accounts yet. Add an account to start tracking your portfolio.</p>
      )}

      <div className="account-grid">
        {isLoading ? [0, 1].map((item) => (
          <article key={item} className="account-card skeleton-card" aria-hidden="true">
            <Skeleton className="skeleton-line skeleton-line-wide" />
            <div className="skeleton-lines-grid">
              {[0, 1, 2, 3, 4, 5].map((line) => <Skeleton key={line} className="skeleton-line" />)}
            </div>
          </article>
        )) : sortedAccounts.map((account) => (
          <article key={account._id || account.id} className="account-card">
            <div className="account-top">
              <div>
                <p className="muted">{account.propFirm}</p>
                <h3>{account.name}</h3>
              </div>
              <span className={`status-pill status-${getStatusClass(account.status)}`}>{account.status || 'Unknown'}</span>
            </div>
            <div className="detail-grid">
              <div><label>Account type</label><p>{account.type}</p></div>
              <div><label>Purchase date</label><p>{account.purchaseDate}</p></div>
              <div><label>Funded amount</label><p>{formatCurrency(account.fundedAmount)}</p></div>
              <div><label>Current balance</label><p>{formatCurrency(account.balance)}</p></div>
              <div><label>Starting balance</label><p>{formatCurrency(account.startingBalance)}</p></div>
              <div><label>Profit $</label><p>{formatCurrency(Number(account.balance || 0) - Number(account.startingBalance || 0))}</p></div>
              <div><label>Profit %</label><p>{((Number(account.balance || 0) - Number(account.startingBalance || 0)) / Math.max(Number(account.fundedAmount || 0), 1) * 100).toFixed(2)}%</p></div>
              <div><label>Max daily loss</label><p>{account.maxDailyLoss}%</p></div>
              <div><label>Max overall loss</label><p>{account.maxOverallLoss}%</p></div>
              <div><label>Profit target</label><p>{account.profitTarget}%</p></div>
              <div><label>Next payout date</label><p>{account.nextPayoutDate}</p></div>
              <div><label>Payout received</label><p>{formatCurrency(account.payoutReceived)}</p></div>
            </div>
            <div className="row-actions">
              <button className="secondary-btn" type="button" onClick={() => { setAccountForm(account); setEditingAccountId(account._id); setShowAccountForm(true); }}>Edit</button>
              <button
                className="danger-btn"
                type="button"
                onClick={() => {
                  confirmDelete({
                    title: 'Delete account?',
                    message: `This will permanently remove "${account.name}" from your portfolio. This action cannot be undone.`,
                    onConfirm: () => deleteAccount(account._id),
                  });
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AccountSection;
