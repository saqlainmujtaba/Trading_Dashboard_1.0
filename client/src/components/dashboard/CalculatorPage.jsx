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
  const [activeCalculator, setActiveCalculator] = useState('profit-loss');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [swapRate, setSwapRate] = useState('0');
  const [swapNights, setSwapNights] = useState('1');

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
  const effectiveEntryPrice = entryPrice !== '' && Number.isFinite(parsedEntryPrice) && parsedEntryPrice > 0
    ? parsedEntryPrice
    : null;
  const effectiveExitPrice = exitPrice !== '' && Number.isFinite(parsedExitPrice) && parsedExitPrice > 0
    ? parsedExitPrice
    : null;
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
  const swapTotal = Number(swapRate || 0) * currentPnlLots * parsePositiveNumber(swapNights);
  const updateValue = (setter) => (event) => {
    setter(event.target.value);
    setHasCalculated(false);
  };

  const selectInstrument = (event) => {
    const value = event.target.value.toUpperCase();
    setInstrumentSearch(value);
    setHasCalculated(false);
    const selected = instruments.find((item) => item.symbol === value);
    if (selected) {
      setInstrumentSymbol(selected.symbol);
      setEntryPrice('');
      setExitPrice('');
    }
  };

  const resetCalculator = () => {
    setHasCalculated(false);
    setBalance('10000');
    setLeverage('100');
    setMarginLots('1');
    setRiskPercent('1');
    setStopDistance('20');
    setPnlLots('1');
    setDirection('Buy');
    setEntryPrice('');
    setExitPrice('');
    setSwapRate('0');
    setSwapNights('1');
  };

  const result = (() => {
    if (!hasCalculated) return null;
    if (activeCalculator === 'margin') {
      if (marginRequired === null) return { title: 'Margin unavailable', detail: 'Wait for a market quote to load.' };
      return { title: `${formatNumber(marginRequired)} ${accountCurrency}`, detail: `Estimated margin · ${formatNumber(remainingBalance)} ${accountCurrency} balance after margin` };
    }
    if (activeCalculator === 'profit-loss') {
      if (profitLoss === null) return { title: 'Enter entry and exit prices', detail: 'Add valid prices to estimate your potential P/L.' };
      return { title: `${profitLoss >= 0 ? '+' : ''}${formatNumber(profitLoss)} ${accountCurrency}`, detail: `${direction} · ${formatNumber(currentPnlLots, 4)} lots` };
    }
    if (activeCalculator === 'lot-size') {
      if (recommendedLots === null) return { title: 'Lot size unavailable', detail: 'Wait for a market quote and check your stop distance.' };
      return { title: `${formatNumber(recommendedLots, 4)} lots`, detail: `${formatNumber(riskAmount)} ${accountCurrency} risk · ${formatNumber(currentRiskPercent, 2)}% of balance` };
    }
    return {
      title: `${swapTotal >= 0 ? '+' : ''}${formatNumber(swapTotal)} ${accountCurrency}`,
      detail: `${direction} · ${formatNumber(currentPnlLots, 4)} lots · ${formatNumber(swapNights, 0)} overnight${Number(swapNights) === 1 ? '' : 's'}`,
    };
  })();

  return (
    <div className="app-shell">
      <Sidebar user={user} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      <main className="content calculator-page">
        <header className="calculator-hero">
          <Link className="calculator-back-link" to="/">Back to dashboard</Link>
          <p className="eyebrow">Trading tools</p>
          <h1>Plan every trade<br />Down to the last pip</h1>
          <p>Margin, profit, lot size, and overnight swap. All in one place.</p>
        </header>

        <nav className="calculator-tabs" aria-label="Calculator type">
          {[
            ['margin', 'Margin'],
            ['profit-loss', 'Profit/Loss'],
            ['lot-size', 'Lot Size'],
            ['swap', 'Swap'],
          ].map(([key, label]) => (
            <button key={key} type="button" className={activeCalculator === key ? 'calculator-tab calculator-tab-active' : 'calculator-tab'}
              onClick={() => { setActiveCalculator(key); setHasCalculated(false); }} aria-pressed={activeCalculator === key}>
              {label}
            </button>
          ))}
        </nav>

        <section className="calculator-workspace">
          <div className="calculator-form-column">
            <h2>{activeCalculator === 'margin' ? 'Margin' : activeCalculator === 'profit-loss' ? 'Profit / Loss' : activeCalculator === 'lot-size' ? 'Lot Size' : 'Overnight Swap'}</h2>
            <p className="calculator-description">
              {activeCalculator === 'margin' && 'Estimate the margin needed to open your position.'}
              {activeCalculator === 'profit-loss' && 'See your potential P/L before you place the trade.'}
              {activeCalculator === 'lot-size' && 'Calculate position size from balance, risk, and stop distance.'}
              {activeCalculator === 'swap' && 'Estimate overnight financing using your broker’s swap rate.'}
            </p>

            <div className="calculator-fields">
              <label className="field-group">
                <span>Instrument</span>
                <input list="calculator-instruments" value={instrumentSearch} onChange={selectInstrument}
                  placeholder="Search or select instrument" aria-label="Search or select a market instrument" />
                <datalist id="calculator-instruments">
                  {instruments.map((item) => <option key={item.symbol} value={item.symbol}>{item.name}</option>)}
                </datalist>
              </label>
              <div className="calculator-inline-controls">
                <label className="field-group">
                  <span>Account balance</span>
                  <input type="number" min="0" step="any" value={balance} onChange={updateValue(setBalance)} />
                </label>
                <label className="field-group">
                  <span>Currency</span>
                  <select value={accountCurrency} onChange={(event) => { setAccountCurrency(event.target.value); setHasCalculated(false); }}>
                    {accountCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>

              {activeCalculator === 'margin' && <>
                <label className="field-group"><span>Leverage (1:X)</span><input type="number" min="1" step="1" value={leverage} onChange={updateValue(setLeverage)} /></label>
                <CalculatorLotControl value={marginLots} onChange={(value) => { setMarginLots(value); setHasCalculated(false); }} currentLots={currentMarginLots} />
              </>}
              {activeCalculator === 'profit-loss' && <>
                <div className="field-group"><span>Trade type</span><CalculatorDirectionToggle direction={direction} onChange={(value) => { setDirection(value); setHasCalculated(false); }} /></div>
                <label className="field-group"><span>Entry price ({quoteUnit})</span><input type="number" min="0" step="any" value={entryPrice} placeholder={quote ? String(quote) : 'Enter entry price'} onChange={updateValue(setEntryPrice)} /></label>
                <label className="field-group"><span>Exit price ({quoteUnit})</span><input type="number" min="0" step="any" value={exitPrice} placeholder={quote ? String(quote) : 'Enter exit price'} onChange={updateValue(setExitPrice)} /></label>
                <CalculatorLotControl value={pnlLots} onChange={(value) => { setPnlLots(value); setHasCalculated(false); }} currentLots={currentPnlLots} />
              </>}
              {activeCalculator === 'lot-size' && <>
                <label className="field-group"><span>Risk percentage (%)</span><input type="number" min="0" step="any" value={riskPercent} onChange={updateValue(setRiskPercent)} /></label>
                <label className="field-group"><span>Stop distance ({instrument.kind === 'forex' ? 'pips' : `${quoteUnit} price`})</span><input type="number" min="0" step="any" value={stopDistance} onChange={updateValue(setStopDistance)} /></label>
              </>}
              {activeCalculator === 'swap' && <>
                <div className="field-group"><span>Trade type</span><CalculatorDirectionToggle direction={direction} onChange={(value) => { setDirection(value); setHasCalculated(false); }} /></div>
                <label className="field-group"><span>Broker swap rate · {direction} per lot / night ({accountCurrency})</span><input type="number" step="any" value={swapRate} onChange={updateValue(setSwapRate)} /></label>
                <label className="field-group"><span>Lot size</span><input type="number" min="0" step="any" value={pnlLots} onChange={updateValue(setPnlLots)} /></label>
                <label className="field-group"><span>Overnight holds</span><input type="number" min="0" step="1" value={swapNights} onChange={updateValue(setSwapNights)} /></label>
              </>}
            </div>

            <div className="calculator-market-status" aria-live="polite">
              <span>{instrument.symbol}: {isLoadingQuote ? 'fetching quote...' : quote ? `${formatNumber(quote, quoteDigits)} ${quoteUnit}` : 'quote unavailable'}</span>
              <span>{quoteUpdated}</span>
            </div>
            {quoteError && <p className="calculator-quote-error" role="alert">{quoteError}</p>}
            <div className="calculator-actions">
              <button type="button" className="calculator-reset-btn" onClick={resetCalculator}>Reset</button>
              <button type="button" className="calculator-calculate-btn" onClick={() => setHasCalculated(true)}>Calculate</button>
            </div>
          </div>

          <aside className="calculator-result-panel" aria-live="polite">
            <span>{activeCalculator === 'profit-loss' ? 'Estimated Profit / Loss' : activeCalculator === 'lot-size' ? 'Suggested Lot Size' : activeCalculator === 'swap' ? 'Estimated Swap' : 'Estimated Margin'}</span>
            {result ? <><strong>{result.title}</strong><small>{result.detail}</small></> : <small>Enter values and click Calculate</small>}
          </aside>

          <footer className="calculator-disclaimer">
            <strong>Disclaimer</strong>
            <p>Results are estimates for informational purposes only and may differ from actual outcomes because of market conditions, broker specifications, fees, and swap policies. Public market-data quotes may be delayed. Verify instrument terms with your broker.</p>
            {activeCalculator === 'swap' && <p>Enter the swap rate from your broker. Positive or negative rates are supported; triple-swap nights are not applied automatically.</p>}
          </footer>
        </section>
      </main>
    </div>
  );
};

const CalculatorLotControl = ({ value, onChange, currentLots }) => (
  <div className="calculator-lot-control">
    <label className="field-group">
      <span>Lot size</span>
      <div className="calculator-stepper">
        <button type="button" onClick={() => onChange(String(Math.max(0.01, currentLots - 0.01)))} aria-label="Decrease lot size">−</button>
        <input type="number" min="0.01" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} />
        <button type="button" onClick={() => onChange(String(currentLots + 0.01))} aria-label="Increase lot size">+</button>
      </div>
    </label>
    <div className="calculator-presets" aria-label="Lot size presets">
      {[0.01, 0.1, 0.5, 1, 2].map((lots) => <button key={lots} type="button" onClick={() => onChange(String(lots))}>{lots}</button>)}
    </div>
  </div>
);

const CalculatorDirectionToggle = ({ direction, onChange }) => (
  <div className="calculator-direction-toggle">
    {['Buy', 'Sell'].map((tradeDirection) => (
      <button type="button" key={tradeDirection} className={direction === tradeDirection ? 'calculator-direction-active' : ''}
        onClick={() => onChange(tradeDirection)}>
        {tradeDirection === 'Buy' ? '↑ Buy' : '↓ Sell'}
      </button>
    ))}
  </div>
);

export default CalculatorPage;
