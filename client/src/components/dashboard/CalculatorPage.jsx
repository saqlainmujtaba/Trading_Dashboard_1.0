import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';

const currencyNames = {
  AUD: 'Australian dollar',
  CAD: 'Canadian dollar',
  CHF: 'Swiss franc',
  EUR: 'Euro',
  GBP: 'British pound',
  JPY: 'Japanese yen',
  NZD: 'New Zealand dollar',
  USD: 'US dollar',
};

const forexCurrencies = Object.keys(currencyNames);
const cryptoInstruments = [
  { symbol: 'BTCUSD', base: 'BTC', quote: 'USD', name: 'Bitcoin', kind: 'crypto', coinId: 'bitcoin', contractSize: 1 },
  { symbol: 'ETHUSD', base: 'ETH', quote: 'USD', name: 'Ethereum', kind: 'crypto', coinId: 'ethereum', contractSize: 1 },
  { symbol: 'BNBUSD', base: 'BNB', quote: 'USD', name: 'BNB', kind: 'crypto', coinId: 'binancecoin', contractSize: 1 },
  { symbol: 'SOLUSD', base: 'SOL', quote: 'USD', name: 'Solana', kind: 'crypto', coinId: 'solana', contractSize: 1 },
  { symbol: 'XRPUSD', base: 'XRP', quote: 'USD', name: 'XRP', kind: 'crypto', coinId: 'ripple', contractSize: 1 },
  { symbol: 'ADAUSD', base: 'ADA', quote: 'USD', name: 'Cardano', kind: 'crypto', coinId: 'cardano', contractSize: 1 },
  { symbol: 'DOGEUSD', base: 'DOGE', quote: 'USD', name: 'Dogecoin', kind: 'crypto', coinId: 'dogecoin', contractSize: 1 },
  { symbol: 'LTCUSD', base: 'LTC', quote: 'USD', name: 'Litecoin', kind: 'crypto', coinId: 'litecoin', contractSize: 1 },
  { symbol: 'DOTUSD', base: 'DOT', quote: 'USD', name: 'Polkadot', kind: 'crypto', coinId: 'polkadot', contractSize: 1 },
  { symbol: 'AVAXUSD', base: 'AVAX', quote: 'USD', name: 'Avalanche', kind: 'crypto', coinId: 'avalanche-2', contractSize: 1 },
];

const instruments = [
  ...forexCurrencies.flatMap((base) => forexCurrencies
    .filter((quote) => quote !== base)
    .map((quote) => ({
      symbol: `${base}${quote}`,
      base,
      quote,
      name: `${currencyNames[base]} / ${currencyNames[quote]}`,
      kind: 'forex',
      contractSize: 100000,
    }))),
  { symbol: 'XAUUSD', base: 'XAU', quote: 'USD', name: 'Gold / US dollar', kind: 'gold', contractSize: 100 },
  ...cryptoInstruments,
];

const accountCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

const parsePositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const fetchJson = async (url, signal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Quote provider returned HTTP ${response.status}.`);
  return response.json();
};

const fetchFxRate = async (base, quote, signal) => {
  if (base === quote) return { rate: 1, date: null };
  const result = await fetchJson(
    `https://api.frankfurter.dev/v1/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`,
    signal
  );
  const rate = Number(result.rates?.[quote]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`No ${base}/${quote} conversion rate is available.`);
  return { rate, date: result.date };
};

const fetchInstrumentQuote = async (instrument, signal) => {
  if (instrument.kind === 'forex') {
    return fetchFxRate(instrument.base, instrument.quote, signal);
  }
  if (instrument.kind === 'gold') {
    const result = await fetchJson('https://api.gold-api.com/price/XAU', signal);
    const rate = Number(result.price);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('The gold quote provider returned an invalid price.');
    return { rate, date: result.updatedAt || null };
  }

  const result = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(instrument.coinId)}&vs_currencies=usd`,
    signal
  );
  const rate = Number(result[instrument.coinId]?.usd);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('The crypto quote provider returned an invalid price.');
  return { rate, date: null };
};

const formatNumber = (value, digits = 2) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
}).format(Number(value) || 0);

const CalculatorPage = ({ user, theme, onToggleTheme, onLogout }) => {
  const [instrumentSymbol, setInstrumentSymbol] = useState('EURUSD');
  const [instrumentSearch, setInstrumentSearch] = useState('EURUSD');
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [quote, setQuote] = useState(null);
  const [baseToAccountRate, setBaseToAccountRate] = useState(null);
  const [quoteToAccountRate, setQuoteToAccountRate] = useState(null);
  const [rateDate, setRateDate] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [balance, setBalance] = useState('10000');
  const [leverage, setLeverage] = useState('100');
  const [marginLots, setMarginLots] = useState('1');
  const [riskPercent, setRiskPercent] = useState('1');
  const [stopDistance, setStopDistance] = useState('20');
  const [pnlLots, setPnlLots] = useState('1');
  const [direction, setDirection] = useState('Buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');

  const instrument = useMemo(
    () => instruments.find((item) => item.symbol === instrumentSymbol) || instruments[0],
    [instrumentSymbol]
  );

  useEffect(() => {
    const selected = instruments.find((item) => item.symbol === instrumentSearch.trim().toUpperCase());
    if (selected) {
      setInstrumentSymbol(selected.symbol);
    }
  }, [instrumentSearch]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let requestTimedOut = false;
    const timeoutId = window.setTimeout(
      () => {
        requestTimedOut = true;
        controller.abort();
      },
      15000
    );

    const loadQuoteAndConversions = async () => {
      setIsLoadingQuote(true);
      setQuoteError('');
      setQuote(null);
      setBaseToAccountRate(null);
      setQuoteToAccountRate(null);
      setRateDate(null);
      try {
        const quoteCurrency = instrument.kind === 'forex' ? instrument.quote : 'USD';
        const baseCurrency = instrument.kind === 'forex' ? instrument.base : 'USD';
        const [marketQuote, baseConversion, quoteConversion] = await Promise.all([
          fetchInstrumentQuote(instrument, signal),
          fetchFxRate(baseCurrency, accountCurrency, signal),
          fetchFxRate(quoteCurrency, accountCurrency, signal),
        ]);
        if (signal.aborted) return;
        setQuote(marketQuote.rate);
        setBaseToAccountRate(baseConversion.rate);
        setQuoteToAccountRate(quoteConversion.rate);
        setRateDate(marketQuote.date || baseConversion.date || quoteConversion.date);
      } catch (error) {
        if (requestTimedOut) {
          setQuoteError('Market data request timed out. Please try again.');
        } else if (error.name !== 'AbortError') {
          console.error('Failed to fetch calculator market data', error);
          setQuoteError(error.message || 'Could not fetch a market quote. Please try again.');
        }
      } finally {
        if (requestTimedOut || !signal.aborted) setIsLoadingQuote(false);
      }
    };

    loadQuoteAndConversions();
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [instrument, accountCurrency]);

  const convertedBalance = parsePositiveNumber(balance);
  const currentLeverage = parsePositiveNumber(leverage);
  const currentMarginLots = parsePositiveNumber(marginLots);
  const currentRiskPercent = parsePositiveNumber(riskPercent);
  const currentStopDistance = parsePositiveNumber(stopDistance);
  const currentPnlLots = parsePositiveNumber(pnlLots);
  const contractSize = instrument.contractSize;
  const referencePrice = Number(quote) || 0;
  const hasConversions = baseToAccountRate !== null && quoteToAccountRate !== null;
  const hasMarketData = quote !== null && hasConversions;
  const notionalPerLot = hasConversions
    ? instrument.kind === 'forex'
      ? contractSize * baseToAccountRate
      : referencePrice * contractSize * baseToAccountRate
    : 0;
  const marginRequired = hasMarketData && currentLeverage > 0
    ? notionalPerLot * currentMarginLots / currentLeverage
    : null;
  const remainingBalance = marginRequired === null ? null : convertedBalance - marginRequired;
  const pipSize = instrument.kind === 'forex'
    ? (instrument.quote === 'JPY' ? 0.01 : 0.0001)
    : 1;
  const riskPerLot = hasConversions ? currentStopDistance * pipSize * contractSize * quoteToAccountRate : 0;
  const riskAmount = convertedBalance * currentRiskPercent / 100;
  const recommendedLots = hasMarketData && riskPerLot > 0 ? riskAmount / riskPerLot : null;
  const parsedEntryPrice = Number(entryPrice);
  const parsedExitPrice = Number(exitPrice);
  const effectiveEntryPrice = entryPrice === ''
    ? referencePrice
    : Number.isFinite(parsedEntryPrice) && parsedEntryPrice > 0 ? parsedEntryPrice : null;
  const effectiveExitPrice = exitPrice === ''
    ? referencePrice
    : Number.isFinite(parsedExitPrice) && parsedExitPrice > 0 ? parsedExitPrice : null;
  const directionMultiplier = direction === 'Sell' ? -1 : 1;
  const profitLoss = hasMarketData && effectiveEntryPrice !== null && effectiveExitPrice !== null
    ? (effectiveExitPrice - effectiveEntryPrice)
      * directionMultiplier * currentPnlLots * contractSize * quoteToAccountRate
    : null;
  const quoteUnit = instrument.kind === 'forex' ? instrument.quote : 'USD';
  const quoteDigits = instrument.kind === 'forex'
    ? (instrument.quote === 'JPY' ? 3 : 5)
    : instrument.kind === 'gold'
      ? 2
      : referencePrice >= 1 ? 2 : referencePrice >= 0.01 ? 4 : 6;
  const quoteUpdated = rateDate
    ? `Quote reference: ${rateDate.slice(0, 10)}`
    : 'Quote reference from public market-data sources';

  const selectInstrument = (event) => {
    const value = event.target.value.toUpperCase();
    setInstrumentSearch(value);
    const selected = instruments.find((item) => item.symbol === value);
    if (selected) {
      setInstrumentSymbol(selected.symbol);
      setEntryPrice('');
      setExitPrice('');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      <main className="content calculator-page">
        <header className="topbar">
          <div>
            <p className="eyebrow">Trading tools</p>
            <h1>Trading Calculator</h1>
          </div>
          <div className="topbar-actions">
            <Link className="secondary-btn" to="/">Back to dashboard</Link>
          </div>
        </header>

        <section className="analytics-panel calculator-market-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Market quote</p>
              <h2>Select instrument</h2>
            </div>
            {quote && <span className="section-tag">{isLoadingQuote ? 'Updating quote' : 'Quote available'}</span>}
          </div>
          <div className="calculator-market-controls">
            <label className="field-group">
              <span>Search or select pair / symbol</span>
              <input
                list="calculator-instruments"
                value={instrumentSearch}
                onChange={selectInstrument}
                placeholder="Search EURUSD, XAUUSD, BTCUSD..."
                aria-label="Search or select a market instrument"
              />
              <datalist id="calculator-instruments">
                {instruments.map((item) => (
                  <option key={item.symbol} value={item.symbol}>{item.name}</option>
                ))}
              </datalist>
            </label>
            <label className="field-group">
              <span>Account currency</span>
              <select value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value)}>
                {accountCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </label>
            <div className="calculator-live-quote" aria-live="polite">
              <span>{instrument.symbol} rate</span>
              <strong>{isLoadingQuote ? 'Fetching...' : quote ? `${formatNumber(quote, quoteDigits)} ${quoteUnit}` : 'Unavailable'}</strong>
              <small>{quoteUpdated}</small>
            </div>
          </div>
          {quoteError && <p className="error-text" role="alert">{quoteError}</p>}
          <p className="muted">Forex rates use Frankfurter reference data; gold and crypto quotes use public no-key APIs. Rates may be delayed and are for estimates only.</p>
        </section>

        <section className="calculator-grid" aria-label="Trading calculators">
          <article className="analytics-panel calculator-card">
            <p className="eyebrow">Buying power</p>
            <h2>Margin Calculator</h2>
            <p className="muted">Estimate margin required from balance, leverage, and position size.</p>
            <div className="calculator-fields">
              <label className="field-group">
                <span>Account balance ({accountCurrency})</span>
                <input type="number" min="0" step="any" value={balance} onChange={(event) => setBalance(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Leverage (1:X)</span>
                <input type="number" min="1" step="1" value={leverage} onChange={(event) => setLeverage(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Position size (lots)</span>
                <input type="number" min="0" step="any" value={marginLots} onChange={(event) => setMarginLots(event.target.value)} />
              </label>
            </div>
            <div className="calculator-result" aria-live="polite">
              <div><span>Estimated margin required</span><strong>{marginRequired === null ? (isLoadingQuote ? 'Fetching quote...' : 'Unavailable') : `${formatNumber(marginRequired)} ${accountCurrency}`}</strong></div>
              <div><span>Balance after margin</span><strong className={remainingBalance !== null && remainingBalance < 0 ? 'negative-number' : ''}>{remainingBalance === null ? (isLoadingQuote ? 'Fetching quote...' : 'Unavailable') : `${formatNumber(remainingBalance)} ${accountCurrency}`}</strong></div>
            </div>
            <p className="muted">Contract size: {formatNumber(contractSize, 0)} {instrument.kind === 'gold' ? 'troy oz per lot' : instrument.kind === 'crypto' ? 'coin per lot' : 'base currency units per lot'}.</p>
          </article>

          <article className="analytics-panel calculator-card">
            <p className="eyebrow">Risk management</p>
            <h2>Lot Size Calculator</h2>
            <p className="muted">Size the position to match your balance, risk percentage, and stop distance.</p>
            <div className="calculator-fields">
              <label className="field-group">
                <span>Account balance ({accountCurrency})</span>
                <input type="number" min="0" step="any" value={balance} onChange={(event) => setBalance(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Risk (%)</span>
                <input type="number" min="0" step="any" value={riskPercent} onChange={(event) => setRiskPercent(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Stop distance ({instrument.kind === 'forex' ? 'pips' : `${quoteUnit} price`})</span>
                <input type="number" min="0" step="any" value={stopDistance} onChange={(event) => setStopDistance(event.target.value)} />
              </label>
            </div>
            <div className="calculator-result" aria-live="polite">
              <div><span>Cash risk</span><strong>{formatNumber(riskAmount)} {accountCurrency}</strong></div>
              <div><span>Suggested position size</span><strong>{recommendedLots === null ? (isLoadingQuote ? 'Fetching quote...' : 'Unavailable') : `${formatNumber(recommendedLots, 4)} lots`}</strong></div>
            </div>
            <p className="muted">{instrument.kind === 'forex' ? `Pip size: ${pipSize} ${quoteUnit}.` : `Contract convention: ${formatNumber(contractSize, 0)} ${instrument.kind === 'gold' ? 'oz' : 'coin'} per lot.`}</p>
          </article>

          <article className="analytics-panel calculator-card">
            <p className="eyebrow">Trade outcome</p>
            <h2>Profit / Loss Calculator</h2>
            <p className="muted">Estimate the trade result using entry, exit, direction, and position size.</p>
            <div className="calculator-fields">
              <label className="field-group">
                <span>Direction</span>
                <select value={direction} onChange={(event) => setDirection(event.target.value)}>
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </label>
              <label className="field-group">
                <span>Position size (lots)</span>
                <input type="number" min="0" step="any" value={pnlLots} onChange={(event) => setPnlLots(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Entry price ({quoteUnit})</span>
                <input type="number" min="0" step="any" value={entryPrice} placeholder={quote ? String(quote) : 'Enter price'} onChange={(event) => setEntryPrice(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Exit price ({quoteUnit})</span>
                <input type="number" min="0" step="any" value={exitPrice} placeholder={quote ? String(quote) : 'Enter price'} onChange={(event) => setExitPrice(event.target.value)} />
              </label>
            </div>
            <div className="calculator-result" aria-live="polite">
              <div><span>Estimated profit / loss</span><strong className={profitLoss !== null && profitLoss >= 0 ? 'positive-number' : 'negative-number'}>{profitLoss === null ? (isLoadingQuote ? 'Fetching quote...' : 'Unavailable') : `${formatNumber(profitLoss)} ${accountCurrency}`}</strong></div>
              <div><span>Converted from</span><strong>{quoteToAccountRate === null ? 'Conversion unavailable' : `${quoteUnit} → ${accountCurrency} (${formatNumber(quoteToAccountRate, 5)})`}</strong></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default CalculatorPage;
