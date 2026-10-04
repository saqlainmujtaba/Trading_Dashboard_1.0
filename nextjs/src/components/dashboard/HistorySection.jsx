import { useRef, useState } from "react";
import FormField from "../common/FormField";
import Skeleton from '../common/Skeleton';
import SortControl from '../common/SortControl';
import { sortRows } from '../common/sortRows';
import { parseTradeFile } from '../../utils/tradeImport';

const tradeSortOptions = [
  { value: 'date.desc', label: 'Date: newest first' },
  { value: 'date.asc', label: 'Date: oldest first' },
  { value: 'account.asc', label: 'Account: A to Z' },
  { value: 'account.desc', label: 'Account: Z to A' },
  { value: 'propFirm.asc', label: 'Prop firm: A to Z' },
  { value: 'propFirm.desc', label: 'Prop firm: Z to A' },
  { value: 'pair.asc', label: 'Pair: A to Z' },
  { value: 'pair.desc', label: 'Pair: Z to A' },
  { value: 'buySell.asc', label: 'Direction: Buy to Sell' },
  { value: 'buySell.desc', label: 'Direction: Sell to Buy' },
  { value: 'risk.desc', label: 'Risk amount: high to low' },
  { value: 'risk.asc', label: 'Risk amount: low to high' },
  { value: 'pnl.desc', label: 'Profit / loss: high to low' },
  { value: 'pnl.asc', label: 'Profit / loss: low to high' },
  { value: 'rr.desc', label: 'Risk-to-reward: high to low' },
  { value: 'rr.asc', label: 'Risk-to-reward: low to high' },
  { value: 'reason.asc', label: 'Setup reason: A to Z' },
  { value: 'notes.asc', label: 'Notes: A to Z' },
];

const payoutSortOptions = [
  { value: 'date.desc', label: 'Date: newest first' },
  { value: 'date.asc', label: 'Date: oldest first' },
  { value: 'account.asc', label: 'Account: A to Z' },
  { value: 'account.desc', label: 'Account: Z to A' },
  { value: 'amount.desc', label: 'Amount: high to low' },
  { value: 'amount.asc', label: 'Amount: low to high' },
  { value: 'method.asc', label: 'Payment method: A to Z' },
  { value: 'method.desc', label: 'Payment method: Z to A' },
  { value: 'status.asc', label: 'Status: A to Z' },
  { value: 'status.desc', label: 'Status: Z to A' },
];

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
  onImportTrades,
  handlePayoutSubmit,
  formatCurrency,
  deleteTrade,
  deletePayout,
  showTradeForm,
  setShowTradeForm,
  showPayoutForm,
  setShowPayoutForm,
  confirmDelete,
  isLoading = false,
  isTradesLoading = false,
  isPayoutsLoading = false,
}) => {
  const importFileRef = useRef(null);
  const [tradeSortBy, setTradeSortBy] = useState('date.desc');
  const [tradePageSize, setTradePageSize] = useState(10);
  const [tradePage, setTradePage] = useState(1);
  const [payoutSortBy, setPayoutSortBy] = useState('date.desc');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isParsingImport, setIsParsingImport] = useState(false);
  const [isImportingTrades, setIsImportingTrades] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importSkippedCount, setImportSkippedCount] = useState(0);
  const [importFileName, setImportFileName] = useState('');
  const [importAccount, setImportAccount] = useState('');
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState('');
  const sortedTrades = sortRows(trades || [], tradeSortBy);
  const tradePageCount = tradePageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(sortedTrades.length / tradePageSize));
  const currentTradePage = Math.min(tradePage, tradePageCount);
  const visibleTrades = tradePageSize === 'all'
    ? sortedTrades
    : sortedTrades.slice((currentTradePage - 1) * tradePageSize, currentTradePage * tradePageSize);
  const firstVisibleTrade = sortedTrades.length ? (currentTradePage - 1) * (tradePageSize === 'all' ? sortedTrades.length : tradePageSize) + 1 : 0;
  const lastVisibleTrade = tradePageSize === 'all'
    ? sortedTrades.length
    : Math.min(currentTradePage * tradePageSize, sortedTrades.length);
  const sortedPayouts = sortRows(payouts || [], payoutSortBy);
  const payoutAccountOptions = [
    ...new Set(accounts.map((account) => account?.name).filter(Boolean)),
  ];
  const activeAccountOptions = [
    ...new Set(
      accounts
        .filter((account) => account?.status === 'Active')
        .map((account) => account?.name)
        .filter(Boolean)
    ),
  ];
  const tradePairOptions = ['GBPUSD', 'EURUSD', 'XAUUSD', 'CUSTOM'];
  const normalizedTradePair = String(tradeForm.pair || '').toUpperCase().replace('/', '');
  const selectedTradePair = tradePairOptions.includes(normalizedTradePair)
    ? normalizedTradePair
    : 'CUSTOM';

  const handleTradeFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImportOpen(true);
    setIsParsingImport(true);
    setImportFileName(file.name);
    setImportRows([]);
    setImportSkippedCount(0);
    setImportAccount(activeAccountOptions[0] || '');
    setImportError('');
    setImportResult('');
    try {
      const result = await parseTradeFile(file);
      setImportRows(result.trades);
      setImportSkippedCount(result.rejectedCount);
    } catch (error) {
      setImportError(error.message || 'Could not read this trade-history file.');
    } finally {
      setIsParsingImport(false);
    }
  };

  const submitTradeImport = async () => {
    setIsImportingTrades(true);
    setImportError('');
    try {
      const result = await onImportTrades(importAccount, importRows);
      setImportResult(result.imported === 0 && result.duplicates > 0
        ? `All ${result.duplicates} trades already exist in this account. Nothing new was added.`
        : `Imported ${result.imported} new trades; skipped ${result.duplicates} duplicates.`);
      setImportRows([]);
    } catch (error) {
      setImportError(error.response?.data?.message || 'Could not import trades. Please try again.');
    } finally {
      setIsImportingTrades(false);
    }
  };

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
            <SortControl value={tradeSortBy} options={tradeSortOptions} onChange={setTradeSortBy} label="Sort trades" />
            <input ref={importFileRef} className="visually-hidden" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleTradeFile} />
            <button type="button" className="secondary-btn" onClick={() => importFileRef.current?.click()}>Import CSV / Excel</button>
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

        {isImportOpen && (
          <div className="modal-backdrop" onClick={() => setIsImportOpen(false)}>
            <div className="modal-panel trade-import-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow">Trade journal import</p>
                  <h3>Review imported trades</h3>
                </div>
                <button type="button" className="icon-close" onClick={() => setIsImportOpen(false)} aria-label="Close import">×</button>
              </div>
              <p className="import-file-name">{importFileName}</p>
              {isParsingImport ? (
                <p className="empty-state">Reading and matching trade columns...</p>
              ) : (
                <>
                  <div className="import-summary">
                    <span><strong>{importRows.length}</strong> ready to import</span>
                    <span><strong>{importSkippedCount}</strong> skipped or duplicate rows</span>
                  </div>
                  <label className="field-group import-account-field">
                    <span>Save trades to account</span>
                    <select value={importAccount} onChange={(event) => setImportAccount(event.target.value)}>
                      <option value="">Select active account</option>
                      {activeAccountOptions.map((account) => <option key={account} value={account}>{account}</option>)}
                    </select>
                  </label>
                  {importRows.length > 0 && (
                    <div className="table-wrap import-preview-table">
                      <table>
                        <thead><tr><th>Date</th><th>Pair</th><th>Side</th><th>Entry</th><th>Exit</th><th>Lots</th><th>P/L</th></tr></thead>
                        <tbody>
                          {importRows.map((trade) => (
                            <tr key={trade.externalId}>
                              <td>{trade.date}</td><td>{trade.pair}</td><td>{trade.buySell}</td>
                              <td>{trade.entryPrice}</td><td>{trade.exitPrice}</td><td>{trade.lotSize}</td>
                              <td>{trade.pnl == null ? 'Auto' : formatCurrency(trade.pnl)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {importError && <div className="error-box" role="alert">{importError}</div>}
              {importResult && <p className="import-result" role="status">{importResult}</p>}
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setIsImportOpen(false)}>Close</button>
                {!isParsingImport && !importResult && (
                  <button type="button" className="primary-btn" disabled={!importRows.length || !importAccount || isImportingTrades} onClick={submitTradeImport}>
                    {isImportingTrades ? 'Importing...' : `Import ${importRows.length} trades`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
                  <FormField label="SL">
                    <input
                      type="number"
                      step="0.0001"
                      value={tradeForm.sl}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, sl: Number(e.target.value) })
                      }
                      placeholder="1.0900"
                    />
                  </FormField>
                  <FormField label="TP">
                    <input
                      type="number"
                      step="0.0001"
                      value={tradeForm.tp}
                      onChange={(e) =>
                        setTradeForm({ ...tradeForm, tp: Number(e.target.value) })
                      }
                      placeholder="1.1300"
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
                <th>Entry</th>
                <th>Exit</th>
                <th>Lot</th>
                <th>SL</th>
                <th>TP</th>
                <th>Risk ($)</th>
                <th>P/L</th>
                <th>R:R</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isTradesLoading ? [0, 1, 2, 3, 4].map((row) => (
                <tr key={row} aria-hidden="true">
                  <td colSpan="15"><Skeleton className="skeleton-table-row" /></td>
                </tr>
              )) : visibleTrades.length ? visibleTrades.map((trade) => (
                <tr key={trade._id}>
                  <td>{trade.date}</td>
                  <td>{trade.account}</td>
                  <td>{trade.propFirm}</td>
                  <td>{trade.pair}</td>
                  <td>{trade.buySell}</td>
                  <td>{Number(trade.entryPrice || 0).toFixed(5)}</td>
                  <td>{Number(trade.exitPrice || 0).toFixed(5)}</td>
                  <td>{Number(trade.lotSize || 0).toFixed(2)}</td>
                  <td>{Number(trade.sl || 0).toFixed(5)}</td>
                  <td>{Number(trade.tp || 0).toFixed(5)}</td>
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
                          sl: Number(trade.sl || defaultTradeForm.sl),
                          tp: Number(trade.tp || defaultTradeForm.tp),
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
              )) : (
                <tr>
                  <td colSpan="15" className="empty-cell">No trade history yet. Add a trade or import your history to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="trade-pagination" aria-label="Trade history pages">
          <label className="trade-page-size" htmlFor="trade-page-size">
            <span>Rows per page</span>
            <select
              id="trade-page-size"
              value={tradePageSize}
              onChange={(event) => {
                const nextSize = event.target.value === 'all' ? 'all' : Number(event.target.value);
                setTradePageSize(nextSize);
                setTradePage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </label>
          <span className="trade-page-summary">
            Showing {firstVisibleTrade}-{lastVisibleTrade} of {sortedTrades.length} trades
          </span>
          <div className="trade-page-buttons">
            <button
              type="button"
              className="secondary-btn"
              disabled={currentTradePage <= 1 || tradePageSize === 'all'}
              onClick={() => setTradePage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <span>Page {currentTradePage} of {tradePageCount}</span>
            <button
              type="button"
              className="secondary-btn"
              disabled={currentTradePage >= tradePageCount || tradePageSize === 'all'}
              onClick={() => setTradePage((page) => Math.min(tradePageCount, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div id="payouts">
        <div className="section-head">
          <h2>Payouts</h2>
          <div className="section-actions">
            <SortControl value={payoutSortBy} options={payoutSortOptions} onChange={setPayoutSortBy} label="Sort payouts" />
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
          {isLoading || isPayoutsLoading ? [0, 1].map((item) => (
            <div key={item} className="payout-card skeleton-card" aria-hidden="true">
              <div className="skeleton-stack">
                <Skeleton className="skeleton-line skeleton-line-short" />
                <Skeleton className="skeleton-line skeleton-line-wide" />
              </div>
              <div className="skeleton-stack">
                <Skeleton className="skeleton-line skeleton-line-short" />
                <Skeleton className="skeleton-line" />
              </div>
            </div>
          )) : sortedPayouts.length ? sortedPayouts.map((payout) => (
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
          )) : (
            <p className="empty-state">No payouts yet. Add a payout to track payments from your accounts.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default HistorySection;
