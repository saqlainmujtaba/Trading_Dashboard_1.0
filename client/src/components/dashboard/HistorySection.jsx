import { useState } from "react";
import FormField from "../common/FormField";
const HistorySection = ({
  accounts = [],
  trades,
  payouts,
  tradeForm,
  setTradeForm,
  payoutForm,
  setPayoutForm,
  editingTradeId,
  setEditingTradeId,
  editingPayoutId,
  setEditingPayoutId,
  defaultTradeForm,
  defaultPayoutForm,
  handleTradeSubmit,
  handlePayoutSubmit,
  formatCurrency,
  deleteTrade,
  deletePayout,
  showTradeForm,
  setShowTradeForm,
  showPayoutForm,
  setShowPayoutForm,
  confirmDelete,
}) => {
  const payoutAccountOptions = [
    ...new Set(accounts.map((account) => account?.name).filter(Boolean)),
  ];
  const activeAccountOptions = [
    ...new Set(
      accounts
        .filter((account) => account?.status !== 'Failed')
        .map((account) => account?.name)
        .filter(Boolean)
    ),
  ];
  const tradePairOptions = ['GBPUSD', 'EURUSD', 'XAUUSD', 'CUSTOM'];
  const normalizedTradePair = String(tradeForm.pair || '').toUpperCase().replace('/', '');
  const selectedTradePair = tradePairOptions.includes(normalizedTradePair)
    ? normalizedTradePair
    : 'CUSTOM';

  const calculateTradeMetrics = (nextTrade) => {
    const normalizedPair = nextTrade.pair === 'CUSTOM' ? (nextTrade.customPair || '') : (nextTrade.pair || '');
    const entryPrice = Number(nextTrade.entryPrice || 0);
    const exitPrice = Number(nextTrade.exitPrice || 0);
    const lotSize = Number(nextTrade.lotSize || 0);
    const direction = nextTrade.buySell === 'Sell' ? -1 : 1;
    const safePair = (normalizedPair || '').toUpperCase().replace('/', '');
    const contractSize = safePair === 'XAUUSD' ? 100 : 100000;
    const computedPnl = Number((((exitPrice - entryPrice) * direction * lotSize * contractSize)).toFixed(2));
    const riskAmount = Number(nextTrade.risk || 0);
    const computedRr = riskAmount > 0 ? Number((computedPnl / riskAmount).toFixed(2)) : 0;

    return {
      pnl: computedPnl,
      rr: computedRr,
    };
  };

  const updateTradeForm = (changes) => {
    const nextTrade = { ...tradeForm, ...changes };

    if ('entryPrice' in changes || 'exitPrice' in changes || 'lotSize' in changes || 'buySell' in changes || 'pair' in changes || 'risk' in changes) {
      const metrics = calculateTradeMetrics(nextTrade);
      nextTrade.pnl = metrics.pnl;
      if (nextTrade.rrMode !== 'manual') {
        nextTrade.rr = metrics.rr;
      }
    }

    setTradeForm(nextTrade);
  };

  return (
    <section id="history" className="section-block history-layout">
      <div>
        <div className="section-head">
          <h2>Trade History</h2>
          <div className="section-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                if (!showTradeForm) {
                  setShowTradeForm(true);
                  return;
                }
                setShowTradeForm(false);
                setEditingTradeId(null);
                setTradeForm(defaultTradeForm);
              }}
            >
              {showTradeForm ? "Close form" : "Add trade"}
            </button>
            <span className="section-tag">Records</span>
          </div>
        </div>

        {showTradeForm && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setShowTradeForm(false);
              setEditingTradeId(null);
              setTradeForm(defaultTradeForm);
            }}
          >
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingTradeId ? "Edit trade" : "New trade"}</h3>
                <button
                  type="button"
                  className="icon-close"
                  onClick={() => {
                    setShowTradeForm(false);
                    setEditingTradeId(null);
                    setTradeForm(defaultTradeForm);
                  }}
                >
                  ×
                </button>
              </div>
              <form
                className="crud-form modal-form"
                onSubmit={handleTradeSubmit}
              >
                <div className="form-grid">
                  <FormField label="Trade date">
                    <input
                      type="date"
                      value={tradeForm.date}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, date: e.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    label="Account"
                    required
                    hint="Choose an active account"
                  >
                    <select
                      value={tradeForm.account || ""}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, account: e.target.value })
                      }
                      required
                    >
                      <option value="">Select account</option>
                      {activeAccountOptions.length === 0 ? (
                        <option value="" disabled>No active accounts</option>
                      ) : (
                        activeAccountOptions.map((accountName) => (
                          <option key={accountName} value={accountName}>
                            {accountName}
                          </option>
                        ))
                      )}
                    </select>
                  </FormField>
                  <FormField label="Prop firm">
                    <input
                      value={tradeForm.propFirm}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, propFirm: e.target.value })
                      }
                      placeholder="e.g. FundedSquad"
                    />
                  </FormField>
                  <FormField label="Currency pair" required>
                    <select
                      value={selectedTradePair}
                      onChange={(e) => {
                        const nextPair = e.target.value;
                        updateTradeForm({
                          pair: nextPair,
                          customPair: nextPair === 'CUSTOM' ? tradeForm.customPair || '' : '',
                        });
                      }}
                    >
                      <option value="GBPUSD">GBPUSD</option>
                      <option value="EURUSD">EURUSD</option>
                      <option value="XAUUSD">XAUUSD</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {selectedTradePair === 'CUSTOM' && (
                      <input
                        className="custom-pair-input"
                        value={tradeForm.customPair || tradeForm.pair || ''}
                        onChange={(e) => {
                          const nextValue = e.target.value.toUpperCase();
                          updateTradeForm({
                            customPair: nextValue,
                            pair: 'CUSTOM',
                          });
                        }}
                        placeholder="Enter pair e.g. NAS100"
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </FormField>
                  <FormField label="Direction">
                    <select
                      value={tradeForm.buySell}
                      onChange={(e) =>
                        updateTradeForm({ buySell: e.target.value })
                      }
                    >
                      <option>Buy</option>
                      <option>Sell</option>
                    </select>
                  </FormField>
                  <FormField label="Entry price">
                    <input
                      type="number"
                      step="0.0001"
                      value={tradeForm.entryPrice}
                      onChange={(e) =>
                        updateTradeForm({ entryPrice: Number(e.target.value) })
                      }
                      placeholder="1.1000"
                    />
                  </FormField>
                  <FormField label="Exit price">
                    <input
                      type="number"
                      step="0.0001"
                      value={tradeForm.exitPrice}
                      onChange={(e) =>
                        updateTradeForm({ exitPrice: Number(e.target.value) })
                      }
                      placeholder="1.1200"
                    />
                  </FormField>
                  <FormField label="Lot size">
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.lotSize}
                      onChange={(e) =>
                        updateTradeForm({ lotSize: Number(e.target.value) })
                      }
                      placeholder="0.10"
                    />
                  </FormField>
                  <FormField label="Risk amount ($)" className="premium-field">
                    <input
                      type="number"
                      value={tradeForm.risk}
                      onChange={(e) =>
                        updateTradeForm({ risk: Number(e.target.value) })
                      }
                      placeholder="100"
                    />
                  </FormField>
                  <FormField label="P/L (auto)">
                    <input
                      type="number"
                      value={tradeForm.pnl}
                      readOnly
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Risk-to-reward" className="premium-field">
                    <input
                      value={tradeForm.rr}
                      onChange={(e) => {
                        setTradeForm({
                          ...tradeForm,
                          rr: Number(e.target.value),
                          rrMode: 'manual',
                        });
                      }}
                      placeholder="1"
                    />
                  </FormField>
                  <FormField label="Setup reason">
                    <input
                      value={tradeForm.reason}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, reason: e.target.value })
                      }
                      placeholder="Breakout / liquidity sweep"
                    />
                  </FormField>
                  <FormField label="Screenshot link">
                    <input
                      value={tradeForm.screenshot}
                      onChange={(e) =>
                        setTradeForm({
                          ...tradeForm,
                          screenshot: e.target.value,
                        })
                      }
                      placeholder="Paste screenshot URL"
                    />
                  </FormField>
                  <FormField label="Notes">
                    <input
                      value={tradeForm.notes}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, notes: e.target.value })
                      }
                      placeholder="Any trade notes"
                    />
                  </FormField>
                </div>
                <div className="form-actions">
                  <button className="primary-btn" type="submit">
                    {editingTradeId ? "Update trade" : "Save trade"}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShowTradeForm(false);
                      setEditingTradeId(null);
                      setTradeForm(defaultTradeForm);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Prop firm</th>
                <th>Pair</th>
                <th>Buy/Sell</th>
                <th>Risk ($)</th>
                <th>P/L</th>
                <th>R:R</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade._id}>
                  <td>{trade.date}</td>
                  <td>{trade.account}</td>
                  <td>{trade.propFirm}</td>
                  <td>{trade.pair}</td>
                  <td>{trade.buySell}</td>
                  <td>{formatCurrency(trade.risk)}</td>
                  <td>
                    {trade.pnl > 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </td>
                  <td>{trade.rr}</td>
                  <td>{trade.notes}</td>
                  <td className="action-stack">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => {
                        const normalizedPair = String(trade.pair || '').toUpperCase().replace('/', '');
                        const isCustomPair = !tradePairOptions.includes(normalizedPair);

                        setTradeForm({
                          ...defaultTradeForm,
                          ...trade,
                          rrMode: trade.rrMode || 'auto',
                          pair: isCustomPair ? 'CUSTOM' : normalizedPair,
                          customPair: isCustomPair ? normalizedPair : '',
                          rr: Number(trade.rr) || 0,
                          risk: Number(trade.risk) || 0,
                          entryPrice: Number(trade.entryPrice || defaultTradeForm.entryPrice),
                          exitPrice: Number(trade.exitPrice || defaultTradeForm.exitPrice),
                          lotSize: Number(trade.lotSize || defaultTradeForm.lotSize),
                          pnl: Number(trade.pnl || 0),
                        });
                        setEditingTradeId(trade._id);
                        setShowTradeForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-btn"
                      type="button"
                      onClick={() => {
                        confirmDelete({
                          title: 'Delete trade?',
                          message: `This will permanently remove the trade for "${trade.account}" on ${trade.date}. This action cannot be undone.`,
                          onConfirm: () => deleteTrade(trade._id),
                        });
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="section-head">
          <h2>Payouts</h2>
          <div className="section-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                // console.log('ADD PAYOUT CLICK - accounts:', accounts);
                // console.log('ADD PAYOUT CLICK - payoutAccountOptions:', payoutAccountOptions);

                if (!showPayoutForm) {
                  setShowPayoutForm(true);
                  return;
                }
                setShowPayoutForm(false);
                setEditingPayoutId(null);
                setPayoutForm(defaultPayoutForm);
              }}
            >
              {showPayoutForm ? "Close form" : "Add Payout"}
            </button>
            <span className="section-tag">Payments</span>
          </div>
        </div>

        {showPayoutForm && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setShowPayoutForm(false);
              setEditingPayoutId(null);
              setPayoutForm(defaultPayoutForm);
            }}
          >
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingPayoutId ? "Edit payout" : "New payout"}</h3>
                <button
                  type="button"
                  className="icon-close"
                  onClick={() => {
                    setShowPayoutForm(false);
                    setEditingPayoutId(null);
                    setPayoutForm(defaultPayoutForm);
                  }}
                >
                  ×
                </button>
              </div>
              <form
                className="crud-form modal-form"
                onSubmit={handlePayoutSubmit}
              >
                <div className="form-grid">
                  <FormField label="Payout date">
                    <input
                      type="date"
                      value={payoutForm.date}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, date: e.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    label="Account"
                    required
                    hint="Choose from your current accounts"
                  >
                    <select
                      value={payoutForm.account || ""}
                      onChange={(e) =>
                        setPayoutForm({
                          ...payoutForm,
                          account: e.target.value,
                        })
                      }
                      required
                      disabled={!payoutAccountOptions.length}
                    >
                      <option value="">
                        {payoutAccountOptions.length
                          ? "Select account"
                          : "No current accounts available"}
                      </option>
                      {payoutAccountOptions.map((accountName) => (
                        <option key={accountName} value={accountName}>
                          {accountName}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Amount">
                    <input
                      type="number"
                      value={payoutForm.amount}
                      onChange={(e) =>
                        setPayoutForm({
                          ...payoutForm,
                          amount: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Payment method">
                    <input
                      value={payoutForm.method}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, method: e.target.value })
                      }
                      placeholder="Bank Transfer"
                    />
                  </FormField>
                  <FormField label="Status">
                    <select
                      value={payoutForm.status}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, status: e.target.value })
                      }
                    >
                      <option>Pending</option>
                      <option>Approved</option>
                      <option>Rejected</option>
                    </select>
                  </FormField>
                </div>
                <div className="form-actions">
                  <button className="primary-btn" type="submit">
                    {editingPayoutId ? "Update payout" : "Save payout"}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShowPayoutForm(false);
                      setEditingPayoutId(null);
                      setPayoutForm(defaultPayoutForm);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="payout-list">
          {payouts.map((payout) => (
            <div key={payout._id} className="payout-card">
              <div>
                <span className="muted">{payout.date}</span>
                <h4>{payout.account}</h4>
              </div>
              <div className="payout-meta">
                <p>{formatCurrency(payout.amount)}</p>
                <span>{payout.method}</span>
                <small>{payout.status}</small>
                <div className="row-actions compact-actions">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setPayoutForm(payout);
                      setEditingPayoutId(payout._id);
                      setShowPayoutForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-btn"
                    type="button"
                    onClick={() => {
                      confirmDelete({
                        title: 'Delete payout?',
                        message: `This will permanently remove the payout for "${payout.account}" worth ${formatCurrency(payout.amount)}. This action cannot be undone.`,
                        onConfirm: () => deletePayout(payout._id),
                      });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HistorySection;
