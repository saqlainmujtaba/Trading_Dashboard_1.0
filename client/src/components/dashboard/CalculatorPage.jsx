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
  { symbol: 'BTCUSD', base: 'BTC', quote: 'USD', name: 'Bitcoin', kind: 'crypto', assetClass: 'crypto', coinId: 'bitcoin', contractSize: 1 },
  { symbol: 'ETHUSD', base: 'ETH', quote: 'USD', name: 'Ethereum', kind: 'crypto', assetClass: 'crypto', coinId: 'ethereum', contractSize: 1 },
  { symbol: 'BNBUSD', base: 'BNB', quote: 'USD', name: 'BNB', kind: 'crypto', assetClass: 'crypto', coinId: 'binancecoin', contractSize: 1 },
  { symbol: 'SOLUSD', base: 'SOL', quote: 'USD', name: 'Solana', kind: 'crypto', assetClass: 'crypto', coinId: 'solana', contractSize: 1 },
  { symbol: 'XRPUSD', base: 'XRP', quote: 'USD', name: 'XRP', kind: 'crypto', assetClass: 'crypto', coinId: 'ripple', contractSize: 1 },
  { symbol: 'ADAUSD', base: 'ADA', quote: 'USD', name: 'Cardano', kind: 'crypto', assetClass: 'crypto', coinId: 'cardano', contractSize: 1 },
  { symbol: 'DOGEUSD', base: 'DOGE', quote: 'USD', name: 'Dogecoin', kind: 'crypto', assetClass: 'crypto', coinId: 'dogecoin', contractSize: 1 },
  { symbol: 'LTCUSD', base: 'LTC', quote: 'USD', name: 'Litecoin', kind: 'crypto', assetClass: 'crypto', coinId: 'litecoin', contractSize: 1 },
  { symbol: 'DOTUSD', base: 'DOT', quote: 'USD', name: 'Polkadot', kind: 'crypto', assetClass: 'crypto', coinId: 'polkadot', contractSize: 1 },
  { symbol: 'AVAXUSD', base: 'AVAX', quote: 'USD', name: 'Avalanche', kind: 'crypto', assetClass: 'crypto', coinId: 'avalanche-2', contractSize: 1 },
];

const indexInstruments = [
  { symbol: 'US30', base: 'US30', quote: 'USD', name: 'Dow Jones 30', kind: 'index', assetClass: 'indices', yahooSymbol: '%5EDJI', contractSize: 1 },
  { symbol: 'NAS100', base: 'NAS100', quote: 'USD', name: 'Nasdaq 100', kind: 'index', assetClass: 'indices', yahooSymbol: '%5ENDX', contractSize: 1 },
  { symbol: 'SPX500', base: 'SPX500', quote: 'USD', name: 'S&P 500', kind: 'index', assetClass: 'indices', yahooSymbol: '%5EGSPC', contractSize: 1 },
  { symbol: 'UK100', base: 'UK100', quote: 'GBP', name: 'FTSE 100', kind: 'index', assetClass: 'indices', yahooSymbol: '%5EFTSE', contractSize: 1 },
  { symbol: 'GER40', base: 'GER40', quote: 'EUR', name: 'DAX 40', kind: 'index', assetClass: 'indices', yahooSymbol: '%5EGDAXI', contractSize: 1 },
  { symbol: 'JP225', base: 'JP225', quote: 'JPY', name: 'Nikkei 225', kind: 'index', assetClass: 'indices', yahooSymbol: '%5EN225', contractSize: 1 },
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
      assetClass: 'forex',
      contractSize: 100000,
    }))),
  { symbol: 'XAUUSD', base: 'XAU', quote: 'USD', name: 'Gold / US dollar', kind: 'gold', assetClass: 'commodities', contractSize: 100 },
  ...indexInstruments,
  ...cryptoInstruments,
];

const accountCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addCalendarDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return toLocalDateInput(nextDate);
};

const countSwapRollovers = (openDate, closeDate, tripleSwapWeekday) => {
  if (!openDate || !closeDate || closeDate <= openDate) return null;
  const currentDate = new Date(`${openDate}T12:00:00`);
  const close = new Date(`${closeDate}T12:00:00`);
  let standardRollovers = 0;
  let tripleRollovers = 0;

  while (currentDate < close) {
    const weekday = currentDate.getDay();
    if (weekday > 0 && weekday < 6) {
      if (weekdays[weekday] === tripleSwapWeekday) tripleRollovers += 1;
      else standardRollovers += 1;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    standardRollovers,
    tripleRollovers,
    weightedRollovers: standardRollovers + tripleRollovers * 3,
  };
};

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

  if (instrument.kind === 'index') {
    const result = await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${instrument.yahooSymbol}?range=1d&interval=1m`,
      signal
    );
    const chart = result.chart?.result?.[0];
    const rate = Number(chart?.meta?.regularMarketPrice);
    if (!Number.isFinite(rate) || rate <= 0) {
      const providerError = result.chart?.error?.description;
      throw new Error(providerError || `No live quote is available for ${instrument.name}.`);
    }
    const timestamp = Number(chart.meta.regularMarketTime);
    return { rate, date: Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : null };
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

const CalculatorPage = ({ user, accounts = [], theme, onToggleTheme, onLogout }) => {
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
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [leverage, setLeverage] = useState('100');
  const [marginLots, setMarginLots] = useState('1');
  const [riskPercent, setRiskPercent] = useState('1');
  const [riskAmountInput, setRiskAmountInput] = useState('100');
  const [riskMode, setRiskMode] = useState('percent');
  const [stopDistance, setStopDistance] = useState('20');
  const [pnlLots, setPnlLots] = useState('1');
  const [direction, setDirection] = useState('Buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [activeCalculator, setActiveCalculator] = useState('profit-loss');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [swapRate, setSwapRate] = useState('0');
  const [swapOpenDate, setSwapOpenDate] = useState(() => toLocalDateInput(new Date()));
  const [swapCloseDate, setSwapCloseDate] = useState(() => addCalendarDays(new Date(), 1));
  const [tripleSwapWeekday, setTripleSwapWeekday] = useState('Wednesday');

  const instrument = useMemo(
    () => instruments.find((item) => item.symbol === instrumentSymbol) || instruments[0],
    [instrumentSymbol]
  );
  const selectedAccount = accounts.find((account) => String(account._id || account.id) === selectedAccountId);
  const leverageField = `${instrument.assetClass}Leverage`;
  const selectedAccountLeverage = selectedAccount
    ? parsePositiveNumber(selectedAccount[leverageField])
    : 0;
  const activeLeverage = selectedAccount ? selectedAccountLeverage : parsePositiveNumber(leverage);

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
        const quoteCurrency = instrument.quote;
        const baseCurrency = instrument.kind === 'forex' ? instrument.base : quoteCurrency;
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
  const currentLeverage = activeLeverage;
  const currentMarginLots = parsePositiveNumber(marginLots);
  const currentRiskPercent = riskMode === 'percent'
    ? parsePositiveNumber(riskPercent)
    : convertedBalance > 0 ? parsePositiveNumber(riskAmountInput) / convertedBalance * 100 : 0;
  const currentRiskAmount = riskMode === 'amount'
    ? parsePositiveNumber(riskAmountInput)
    : convertedBalance * currentRiskPercent / 100;
  const currentStopDistance = parsePositiveNumber(stopDistance);
  const currentPnlLots = parsePositiveNumber(pnlLots);
  const contractSize = instrument.contractSize;
  const referencePrice = Number(quote) || 0;
  const hasConversions = baseToAccountRate !== null && quoteToAccountRate !== null;
  const hasMarketData = quote !== null && hasConversions;
  const notionalPerLot = hasConversions
    ? instrument.kind === 'forex'
      ? referencePrice * contractSize * quoteToAccountRate
      : referencePrice * contractSize * (
        instrument.kind === 'index' ? quoteToAccountRate : baseToAccountRate
      )
    : 0;
  const marginRequired = hasMarketData && currentLeverage > 0
    ? notionalPerLot * currentMarginLots / currentLeverage
    : null;
  const remainingBalance = marginRequired === null ? null : convertedBalance - marginRequired;
  const marginUsagePercent = marginRequired !== null && convertedBalance > 0
    ? marginRequired / convertedBalance * 100
    : null;
  const pipSize = instrument.kind === 'forex'
    ? (instrument.quote === 'JPY' ? 0.01 : 0.0001)
    : 1;
  const riskPerLot = hasConversions ? currentStopDistance * pipSize * contractSize * quoteToAccountRate : 0;
  const recommendedLots = hasMarketData && riskPerLot > 0 ? currentRiskAmount / riskPerLot : null;
  const recommendedLotsMargin = recommendedLots !== null && currentLeverage > 0
    ? notionalPerLot * recommendedLots / currentLeverage
    : null;
  const recommendedLotsMarginPercent = recommendedLotsMargin !== null && convertedBalance > 0
    ? recommendedLotsMargin / convertedBalance * 100
    : null;
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
  const quoteUnit = instrument.quote;
  const quoteDigits = instrument.kind === 'forex'
    ? (instrument.quote === 'JPY' ? 3 : 5)
    : instrument.kind === 'gold'
      ? 2
      : referencePrice >= 1 ? 2 : referencePrice >= 0.01 ? 4 : 6;
  const quoteUpdated = rateDate
    ? `Quote reference: ${rateDate.slice(0, 10)}`
    : 'Quote reference from public market-data sources';
  const swapRolloverCount = countSwapRollovers(
    swapOpenDate,
    swapCloseDate,
    instrument.kind === 'forex' ? 'Wednesday' : tripleSwapWeekday
  );
  const swapTotal = swapRolloverCount
    ? Number(swapRate || 0) * currentPnlLots * swapRolloverCount.weightedRollovers
    : 0;
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
    setSelectedAccountId('');
    setLeverage('100');
    setMarginLots('1');
    setRiskPercent('1');
    setRiskAmountInput('100');
    setRiskMode('percent');
    setStopDistance('20');
    setPnlLots('1');
    setDirection('Buy');
    setEntryPrice('');
    setExitPrice('');
    setSwapRate('0');
    const today = new Date();
    setSwapOpenDate(toLocalDateInput(today));
    setSwapCloseDate(addCalendarDays(today, 1));
    setTripleSwapWeekday('Wednesday');
  };

  const result = (() => {
    if (!hasCalculated) return null;
    if (activeCalculator === 'margin') {
      if (selectedAccount && currentLeverage <= 0) {
        const categoryName = instrument.assetClass === 'indices' ? 'indices'
          : instrument.assetClass === 'commodities' ? 'commodities'
            : instrument.assetClass;
        return {
          title: 'Leverage not configured',
          detail: `Edit ${selectedAccount.name} and enter its ${categoryName} leverage to calculate margin.`,
        };
      }
      if (marginRequired === null) return { title: 'Margin unavailable', detail: 'Wait for a market quote and check the selected account balance.' };
      const accountUsage = marginUsagePercent === null
        ? 'Account margin usage unavailable'
        : `${formatNumber(marginUsagePercent)}% of ${selectedAccount ? `${selectedAccount.name}’s` : 'the'} balance`;
      return {
        title: `${formatNumber(marginRequired)} ${accountCurrency}`,
        detail: `${accountUsage} · ${formatNumber(remainingBalance)} ${accountCurrency} remaining`,
      };
    }
    if (activeCalculator === 'profit-loss') {
      if (profitLoss === null) return { title: 'Enter entry and exit prices', detail: 'Add valid prices to estimate your potential P/L.' };
      return {
        title: `${profitLoss > 0 ? '+' : ''}${formatNumber(profitLoss)} ${accountCurrency}`,
        detail: `${direction} · ${formatNumber(currentPnlLots, 4)} lots`,
        tone: profitLoss > 0 ? 'profit' : profitLoss < 0 ? 'loss' : '',
      };
    }
    if (activeCalculator === 'lot-size') {
      if (recommendedLots === null) return { title: 'Lot size unavailable', detail: 'Wait for a market quote and check your stop distance.' };
      const marginEstimate = currentLeverage > 0
        ? `${formatNumber(recommendedLotsMargin)} ${accountCurrency} margin · ${formatNumber(recommendedLotsMarginPercent)}% of ${selectedAccount ? `${selectedAccount.name}’s` : 'the'} balance`
        : 'Set leverage to estimate required margin';
      return {
        title: `${formatNumber(recommendedLots, 4)} lots`,
        detail: `${formatNumber(currentRiskAmount)} ${accountCurrency} risk · ${marginEstimate}`,
      };
    }
    if (swapRolloverCount === null) {
      return { title: 'Check your dates', detail: 'The close date must be after the open date.' };
    }
    return {
      title: `${swapTotal >= 0 ? '+' : ''}${formatNumber(swapTotal)} ${accountCurrency}`,
      detail: `${direction} · ${formatNumber(currentPnlLots, 4)} lots · ${swapRolloverCount.weightedRollovers} weighted swap days (${swapRolloverCount.standardRollovers} standard + ${swapRolloverCount.tripleRollovers} triple rollovers)`,
      tone: swapTotal > 0 ? 'profit' : swapTotal < 0 ? 'loss' : '',
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
                <span>Trading account</span>
                <select value={selectedAccountId} onChange={(event) => {
                  const accountId = event.target.value;
                  setSelectedAccountId(accountId);
                  const account = accounts.find((item) => String(item._id || item.id) === accountId);
                  if (account) {
                    setBalance(String(Number(account.balance) || 0));
                    setAccountCurrency('USD');
                  }
                  setHasCalculated(false);
                }}>
                  <option value="">Manual balance</option>
                  {accounts.map((account) => {
                    const accountId = String(account._id || account.id);
                    return <option key={accountId} value={accountId}>{account.name} · {account.propFirm} · {account.status || 'Unknown'}</option>;
                  })}
                </select>
              </label>
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
                  <span>{selectedAccount ? 'Balance for this calculation (USD)' : 'Account balance'}</span>
                  <input type="number" min="0" step="any" value={balance} onChange={updateValue(setBalance)} />
                </label>
                <label className="field-group">
                  <span>Currency</span>
                  <select value={accountCurrency} disabled={Boolean(selectedAccount)} onChange={(event) => { setAccountCurrency(event.target.value); setHasCalculated(false); }}>
                    {accountCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>

              {activeCalculator === 'margin' && <>
                <label className="field-group">
                  <span>{selectedAccount ? `${instrument.assetClass[0].toUpperCase()}${instrument.assetClass.slice(1)} leverage (1:X)` : 'Leverage (1:X)'}</span>
                  <input type="number" min="1" step="1" value={selectedAccount ? selectedAccountLeverage || '' : leverage}
                    readOnly={Boolean(selectedAccount)} onChange={updateValue(setLeverage)} placeholder={selectedAccount ? 'Set in account settings' : '100'} />
                </label>
                <CalculatorLotControl value={marginLots} onChange={(value) => { setMarginLots(value); setHasCalculated(false); }} currentLots={currentMarginLots} />
              </>}
              {activeCalculator === 'profit-loss' && <>
                <div className="field-group"><span>Trade type</span><CalculatorDirectionToggle direction={direction} onChange={(value) => { setDirection(value); setHasCalculated(false); }} /></div>
                <label className="field-group"><span>Entry price ({quoteUnit})</span><input type="number" min="0" step="any" value={entryPrice} placeholder={quote ? String(quote) : 'Enter entry price'} onChange={updateValue(setEntryPrice)} /></label>
                <label className="field-group"><span>Exit price ({quoteUnit})</span><input type="number" min="0" step="any" value={exitPrice} placeholder={quote ? String(quote) : 'Enter exit price'} onChange={updateValue(setExitPrice)} /></label>
                <CalculatorLotControl value={pnlLots} onChange={(value) => { setPnlLots(value); setHasCalculated(false); }} currentLots={currentPnlLots} />
              </>}
              {activeCalculator === 'lot-size' && <>
                <div className="calculator-risk-mode" role="group" aria-label="Risk input type">
                  <button type="button" className={riskMode === 'percent' ? 'calculator-risk-mode-active' : ''}
                    onClick={() => { setRiskMode('percent'); setHasCalculated(false); }}>Percentage</button>
                  <button type="button" className={riskMode === 'amount' ? 'calculator-risk-mode-active' : ''}
                    onClick={() => { setRiskMode('amount'); setHasCalculated(false); }}>Amount</button>
                </div>
                {riskMode === 'percent'
                  ? <label className="field-group"><span>Risk percentage (%)</span><input type="number" min="0" step="any" value={riskPercent} onChange={updateValue(setRiskPercent)} /></label>
                  : <label className="field-group"><span>Risk amount ({accountCurrency})</span><input type="number" min="0" step="any" value={riskAmountInput} onChange={updateValue(setRiskAmountInput)} /></label>}
                <label className="field-group"><span>Stop distance ({instrument.kind === 'forex' ? 'pips' : `${quoteUnit} price`})</span><input type="number" min="0" step="any" value={stopDistance} onChange={updateValue(setStopDistance)} /></label>
              </>}
              {activeCalculator === 'swap' && <>
                <div className="field-group"><span>Trade type</span><CalculatorDirectionToggle direction={direction} onChange={(value) => { setDirection(value); setHasCalculated(false); }} /></div>
                <label className="field-group"><span>Broker swap rate · {direction} per lot / rollover ({accountCurrency})</span><input type="number" step="any" value={swapRate} onChange={updateValue(setSwapRate)} /></label>
                <label className="field-group"><span>Lot size</span><input type="number" min="0" step="any" value={pnlLots} onChange={updateValue(setPnlLots)} /></label>
                <label className="field-group"><span>Position open date</span><input type="date" value={swapOpenDate} onChange={updateValue(setSwapOpenDate)} /></label>
                <label className="field-group"><span>Position close date</span><input type="date" min={swapOpenDate} value={swapCloseDate} onChange={updateValue(setSwapCloseDate)} /></label>
                {instrument.kind !== 'forex' && (
                  <label className="field-group">
                    <span>Triple-swap weekday (broker setting)</span>
                    <select value={tripleSwapWeekday} onChange={updateValue(setTripleSwapWeekday)}>
                      {weekdays.slice(1, 6).map((weekday) => <option key={weekday} value={weekday}>{weekday}</option>)}
                    </select>
                  </label>
                )}
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
            {result ? <><strong className={result.tone ? `calculator-result-${result.tone}` : ''}>{result.title}</strong><small>{result.detail}</small></> : <small>Enter values and click Calculate</small>}
          </aside>

          <footer className="calculator-disclaimer">
            <strong>Disclaimer</strong>
            <p>Results are estimates for informational purposes only and may differ from actual outcomes because of market conditions, broker specifications, fees, and swap policies. Public market-data quotes may be delayed. Verify instrument terms with your broker.</p>
            {activeCalculator === 'swap' && <p>Rollover dates are counted from the open date up to (but not including) the close date. Forex uses the standard Wednesday triple rollover and skips weekend rollover entries. For other instruments, select the broker’s triple-swap weekday; weekend rules vary by broker and are not included automatically.</p>}
            {instrument.kind === 'index' && <p>Index quotes come from Yahoo Finance. The calculator assumes one index unit per lot; confirm your broker’s index contract size before trading.</p>}
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
      <button type="button" key={tradeDirection} className={direction === tradeDirection ? `calculator-direction-active calculator-direction-${tradeDirection.toLowerCase()}-active` : ''}
        onClick={() => onChange(tradeDirection)}>
        {tradeDirection === 'Buy' ? '↑ Buy' : '↓ Sell'}
      </button>
    ))}
  </div>
);

export default CalculatorPage;
