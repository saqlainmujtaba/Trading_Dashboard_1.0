const normalizeHeader = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const columnAliases = {
  date: ['closetimeutc', 'closingtimeutc', 'closedtimeutc', 'closetime', 'closingtime', 'closedtime', 'closeddate', 'closingdate', 'exittime', 'closedatetime', 'time2', 'time1', 'date', 'datetime', 'time', 'opentimeutc', 'openingtimeutc', 'opentime', 'openingtime', 'opendate', 'openingdate', 'entrytime'],
  pair: ['symbol', 'pair', 'instrument', 'asset', 'market'],
  side: ['side', 'direction', 'buysell', 'type', 'tradetype'],
  volume: ['lotsize', 'lots', 'lot', 'volume', 'quantity', 'size', 'units'],
  entryPrice: ['entryprice', 'openprice', 'openingprice', 'priceopen', 'openrate', 'open', 'entry', 'price'],
  exitPrice: ['exitprice', 'closeprice', 'closingprice', 'priceclose', 'closerate', 'closed', 'exit', 'price2', 'price1'],
  pnl: ['netprofit', 'netpnl', 'realizedpnl', 'realizedprofit', 'profitloss', 'pnl', 'profit', 'grossprofit', 'pl'],
  commission: ['commission', 'fees', 'fee'],
  swap: ['swap', 'rollover', 'financing'],
  risk: ['riskamount', 'risk', 'riskusd'],
  sl: ['sl', 'stoploss', 'stoplossprice', 'stop', 'stoplevel'],
  tp: ['tp', 'takeprofit', 'takeprofitprice', 'target', 'targetlevel'],
  rr: ['riskreward', 'riskratio', 'rr'],
  reason: ['setup', 'reason', 'strategy', 'label'],
  notes: ['notes', 'comment', 'comments', 'memo'],
  id: ['dealid', 'tradeid', 'ticket', 'deal', 'id'],
  position: ['positionid', 'position', 'positionnumber'],
  entryType: ['dealentry', 'entrytype', 'inout', 'entryout', 'entry'],
};

const readValue = (row, field) => {
  const aliases = columnAliases[field] || [];
  for (const alias of aliases) {
    const key = Object.keys(row).find((column) => normalizeHeader(column) === alias);
    if (key !== undefined && row[key] !== '' && row[key] != null) {
      if (field === 'date') {
        const date = parseDate(row[key]);
        if (!date) continue;
        return date;
      }
      if (field === 'entryPrice' && alias === 'entry' && parseNumber(row[key]) == null) continue;
      return row[key];
    }
  }
  return undefined;
};

const readSide = (row) => {
  for (const alias of columnAliases.side) {
    const key = Object.keys(row).find((column) => normalizeHeader(column) === alias);
    if (key === undefined) continue;
    const side = parseSide(row[key]);
    if (side) return side;
  }
  return '';
};

const parseNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (value == null || String(value).trim() === '') return undefined;
  let normalized = String(value).trim().replace(/[\s$€£]/g, '');
  const isNegative = normalized.startsWith('(') && normalized.endsWith(')');
  normalized = normalized.replace(/[()]/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return isNegative ? -parsed : parsed;
};

const parseDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && value > 20000 && value < 100000) {
    return new Date((value - 25569) * 86400000).toISOString().slice(0, 10);
  }
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{5}(?:\.\d+)?$/.test(text) && Number(text) > 20000 && Number(text) < 100000) {
    return new Date((Number(text) - 25569) * 86400000).toISOString().slice(0, 10);
  }
  const yearFirst = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (yearFirst) return `${yearFirst[1]}-${yearFirst[2].padStart(2, '0')}-${yearFirst[3].padStart(2, '0')}`;
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dayFirst) {
    const first = Number(dayFirst[1]);
    const second = Number(dayFirst[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second > 12 ? first : second;
    return `${dayFirst[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const normalized = text
    .replace(/\.(?=\d{1,2}(?:\s|$))/g, '-');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.valueOf()) ? '' : parsed.toISOString().slice(0, 10);
};

const parseSide = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['buy', 'long', 'b'].includes(normalized)) return 'Buy';
  if (['sell', 'short', 's'].includes(normalized)) return 'Sell';
  return '';
};

const hashText = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `import-${(hash >>> 0).toString(16)}`;
};

const makeTrade = (row, overrides = {}) => {
  const date = parseDate(overrides.date ?? readValue(row, 'date'));
  const pair = String(readValue(row, 'pair') || '').trim().toUpperCase().replace('/', '');
  const buySell = parseSide(overrides.side ?? readSide(row));
  const entryPrice = parseNumber(overrides.entryPrice ?? readValue(row, 'entryPrice'));
  const exitPrice = parseNumber(overrides.exitPrice ?? readValue(row, 'exitPrice'));
  const rawVolume = parseNumber(overrides.volume ?? readValue(row, 'volume'));
  const lotSize = rawVolume && rawVolume > 1000 ? rawVolume / 100000 : rawVolume;
  const sl = parseNumber(overrides.sl ?? readValue(row, 'sl'));
  const tp = parseNumber(overrides.tp ?? readValue(row, 'tp'));
  const importedPnl = parseNumber(overrides.pnl ?? readValue(row, 'pnl'));
  const pnlColumn = Object.keys(row).find((column) => columnAliases.pnl.includes(normalizeHeader(column)));
  const pnlIsNet = pnlColumn && ['netprofit', 'netpnl', 'realizedpnl', 'realizedprofit', 'profitloss', 'pnl'].includes(normalizeHeader(pnlColumn));
  const costs = (parseNumber(readValue(row, 'commission')) || 0) + (parseNumber(readValue(row, 'swap')) || 0);
  const pnl = importedPnl == null ? undefined : pnlIsNet ? importedPnl : importedPnl + costs;
  if (!date || !pair || !buySell || (entryPrice == null && exitPrice == null && pnl == null)) return null;

  const trade = {
    date,
    pair,
    buySell,
    entryPrice: entryPrice ?? 0,
    exitPrice: exitPrice ?? 0,
    lotSize: lotSize ?? 0,
    sl: sl ?? 0,
    tp: tp ?? 0,
    risk: parseNumber(readValue(row, 'risk')) ?? 0,
    rr: parseNumber(readValue(row, 'rr')),
    rrMode: 'manual',
    reason: String(readValue(row, 'reason') || ''),
    notes: String(readValue(row, 'notes') || ''),
    commission: parseNumber(readValue(row, 'commission')) ?? 0,
    swap: parseNumber(readValue(row, 'swap')) ?? 0,
    grossPnl: importedPnl,
    pnl,
  };
  const sourceId = readValue(row, 'id') || readValue(row, 'position');
  const fingerprint = [sourceId || '', date, pair, buySell, trade.entryPrice, trade.exitPrice, trade.lotSize, pnl ?? ''].join('|');
  trade.position = String(sourceId || '');
  trade.externalId = hashText(fingerprint);
  return trade;
};

export const parseDelimitedText = (text) => {
  const firstLine = String(text).replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  const delimiters = [',', ';', '\t'];
  const delimiter = delimiters
    .map((character) => ({ character, count: firstLine.split(character).length - 1 }))
    .sort((first, second) => second.count - first.count)[0].character;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
};

export const extractTradeRecords = (matrix) => {
  const isTradeHeader = (row) => {
    const headers = row.map(normalizeHeader);
    const hasPair = headers.some((header) => columnAliases.pair.includes(header));
    const hasDate = headers.some((header) => columnAliases.date.includes(header));
    const hasTradeValue = headers.some((header) => columnAliases.side.includes(header)
      || columnAliases.entryPrice.includes(header)
      || columnAliases.pnl.includes(header));
    return hasPair && hasDate && hasTradeValue;
  };

  const positionsIndex = matrix.findIndex((row) => row.some((value) => normalizeHeader(value) === 'positions'));
  const headerSearchStart = positionsIndex >= 0 ? positionsIndex + 1 : 0;
  const headerSearchEnd = positionsIndex >= 0 ? Math.min(matrix.length, headerSearchStart + 10) : Math.min(matrix.length, 20);
  let headerIndex = -1;
  for (let index = headerSearchStart; index < headerSearchEnd; index += 1) {
    if (isTradeHeader(matrix[index])) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex < 0) throw new Error('Could not find trade-history columns. Use a platform export with date, symbol, and direction fields.');

  const headers = matrix[headerIndex].map((header, index) => {
    const base = String(header || `column${index + 1}`).trim();
    const duplicateCount = matrix[headerIndex].slice(0, index).filter((item) => normalizeHeader(item) === normalizeHeader(base)).length;
    return duplicateCount ? `${base}${duplicateCount + 1}` : base;
  });

  let tableEnd = matrix.length;
  if (positionsIndex >= 0) {
    tableEnd = matrix.findIndex((row, index) => {
      if (index <= headerIndex) return false;
      const populated = row.map((value) => String(value ?? '').trim()).filter(Boolean);
      return populated.length === 1
        && !parseDate(populated[0])
        && parseNumber(populated[0]) === undefined;
    });
    if (tableEnd < 0) tableEnd = matrix.length;
  }

  return matrix.slice(headerIndex + 1, tableEnd)
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
};

const isOpenDeal = (value) => /^(in|open|entry|inout)$/.test(normalizeHeader(value));
const isCloseDeal = (value) => /^(out|close|exit|outby)$/.test(normalizeHeader(value));
const readDealAction = (row) => {
  const explicitAction = readValue(row, 'entryType');
  if (isOpenDeal(explicitAction) || isCloseDeal(explicitAction)) return explicitAction;
  const direction = Object.entries(row).find(([key]) => normalizeHeader(key) === 'direction')?.[1];
  return isOpenDeal(direction) || isCloseDeal(direction) ? direction : explicitAction;
};

export const normalizeTradeRows = (records) => {
  const rejectedRows = [];
  const tradeRows = records.filter((row) => {
    const sideValue = String(readValue(row, 'side') || '').toLowerCase();
    if (/limit|stop|balance|credit|deposit|withdrawal/.test(sideValue)) return false;
    if (parseSide(readSide(row))) return true;
    const action = readDealAction(row);
    if (isOpenDeal(action) || isCloseDeal(action)) return true;
    const pair = readValue(row, 'pair');
    if (!pair || columnAliases.pair.includes(normalizeHeader(pair))) return false;
    return Boolean(readValue(row, 'date') || readValue(row, 'entryPrice') || readValue(row, 'exitPrice') || readValue(row, 'pnl'));
  });
  const positionIds = tradeRows.map((row) => readValue(row, 'position')).filter(Boolean);
  const useSplitDeals = tradeRows.some((row) => isOpenDeal(readDealAction(row)) || isCloseDeal(readDealAction(row)))
    && positionIds.length > 0;
  let trades = [];

  if (useSplitDeals) {
    const positions = new Map();
    tradeRows.forEach((row) => {
      const position = String(readValue(row, 'position') || '');
      if (!position) return;
      const rows = positions.get(position) || [];
      rows.push(row);
      positions.set(position, rows);
    });

    positions.forEach((rows) => {
      const openRow = rows.find((row) => isOpenDeal(readDealAction(row)));
      const closeRows = rows.filter((row) => isCloseDeal(readDealAction(row)));
      closeRows.forEach((closeRow) => {
        const trade = makeTrade(closeRow, {
          side: readSide(openRow || closeRow),
          date: readValue(closeRow, 'date'),
          entryPrice: readValue(openRow || {}, 'entryPrice'),
          exitPrice: readValue(closeRow, 'entryPrice'),
          volume: readValue(closeRow, 'volume') ?? readValue(openRow || {}, 'volume'),
          pnl: readValue(closeRow, 'pnl'),
        });
        if (trade) trades.push(trade);
        else rejectedRows.push(closeRow);
      });
      if (!closeRows.length) rejectedRows.push(...rows);
    });
  } else {
    tradeRows.forEach((row) => {
      const trade = makeTrade(row);
      if (trade) trades.push(trade);
      else rejectedRows.push(row);
    });
  }

  const seen = new Set();
  trades = trades.filter((trade) => {
    if (seen.has(trade.externalId)) {
      rejectedRows.push(trade);
      return false;
    }
    seen.add(trade.externalId);
    return true;
  });
  return { trades, rejectedCount: rejectedRows.length };
};

export const decodeSpreadsheetXml = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
};

const parseXlsx = async (file) => {
  const { unzipSync } = await import('fflate');
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const workbookXml = archive['xl/workbook.xml'];
  const relationsXml = archive['xl/_rels/workbook.xml.rels'];
  if (!workbookXml || !relationsXml) throw new Error('This file is not a supported .xlsx workbook.');

  const workbook = new DOMParser().parseFromString(decodeSpreadsheetXml(workbookXml), 'application/xml');
  const relations = new DOMParser().parseFromString(decodeSpreadsheetXml(relationsXml), 'application/xml');
  const firstSheet = workbook.getElementsByTagName('sheet')[0];
  if (!firstSheet) throw new Error('The workbook does not contain a worksheet.');
  const relationshipId = firstSheet.getAttribute('r:id')
    || firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const relation = [...relations.getElementsByTagName('Relationship')].find((item) => item.getAttribute('Id') === relationshipId);
  if (!relation) throw new Error('Could not locate the first worksheet in this workbook.');
  const target = relation.getAttribute('Target') || '';
  const worksheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const worksheetXml = archive[worksheetPath.replace(/^xl\/\.\.\//, '')];
  if (!worksheetXml) throw new Error('The first worksheet could not be read.');

  const sharedStrings = archive['xl/sharedStrings.xml']
    ? [...new DOMParser().parseFromString(decodeSpreadsheetXml(archive['xl/sharedStrings.xml']), 'application/xml').getElementsByTagName('si')]
      .map((item) => [...item.getElementsByTagName('t')].map((text) => text.textContent || '').join(''))
    : [];
  const worksheet = new DOMParser().parseFromString(decodeSpreadsheetXml(worksheetXml), 'application/xml');
  const matrix = [...worksheet.getElementsByTagName('row')].map((row) => {
    const values = [];
    [...row.getElementsByTagName('c')].forEach((cell) => {
      const columnLetters = (cell.getAttribute('r') || '').match(/^[A-Z]+/i)?.[0] || 'A';
      const columnIndex = [...columnLetters].reduce((total, letter) => total * 26 + letter.toUpperCase().charCodeAt(0) - 64, 0) - 1;
      const value = cell.getElementsByTagName('v')[0]?.textContent || '';
      const cellType = cell.getAttribute('t');
      values[columnIndex] = cellType === 's'
        ? sharedStrings[Number(value)] || ''
        : cellType === 'inlineStr'
          ? [...cell.getElementsByTagName('t')].map((item) => item.textContent || '').join('')
          : value;
    });
    return values;
  });
  return matrix;
};

export const parseTradeFile = async (file) => {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a file smaller than 20 MB.');
  const extension = file.name.split('.').pop().toLowerCase();
  let matrix;
  if (extension === 'csv' || extension === 'txt') {
    matrix = parseDelimitedText(await file.text());
  } else if (extension === 'xlsx') {
    matrix = await parseXlsx(file);
  } else {
    throw new Error('Upload a CSV or modern Excel .xlsx file. Legacy .xls files are not supported.');
  }

  const result = normalizeTradeRows(extractTradeRecords(matrix));
  if (!result.trades.length) throw new Error('No complete trades were found. Check that the export includes date, symbol, direction, and prices or profit.');
  if (result.trades.length > 1000) throw new Error('This file contains more than 1,000 trades. Export a smaller date range and try again.');
  return result;
};

const getOcrLines = (tsv) => {
  const [headerLine, ...rows] = String(tsv || '').split(/\r?\n/);
  const headers = headerLine?.split('\t') || [];
  const indexOf = (name) => headers.indexOf(name);
  const groups = new Map();

  rows.forEach((line) => {
    const columns = line.split('\t');
    if (columns.length < headers.length || columns[indexOf('level')] !== '5') return;
    const text = String(columns[indexOf('text')] || '').trim();
    const confidence = Number(columns[indexOf('conf')]);
    if (!text || confidence < 0) return;
    const groupKey = ['page_num', 'block_num', 'par_num', 'line_num']
      .map((name) => columns[indexOf(name)])
      .join(':');
    const word = {
      text,
      left: Number(columns[indexOf('left')]),
      top: Number(columns[indexOf('top')]),
      width: Number(columns[indexOf('width')]),
      height: Number(columns[indexOf('height')]),
    };
    const group = groups.get(groupKey) || [];
    group.push(word);
    groups.set(groupKey, group);
  });

  return [...groups.values()].map((words) => words.sort((first, second) => first.left - second.left));
};

const getOcrHeaderAnchors = (words) => {
  const normalizedWords = words.map((word) => ({ ...word, normalized: normalizeHeader(word.text) }));
  const findHeaderCenter = (exactNames, phrase) => {
    const exact = normalizedWords.find((item) => exactNames.includes(item.normalized));
    if (exact) return exact.left + exact.width / 2;
    if (!phrase) return undefined;
    for (let index = 0; index <= normalizedWords.length - phrase.length; index += 1) {
      const tokens = normalizedWords.slice(index, index + phrase.length);
      if (tokens.every((token, tokenIndex) => token.normalized === phrase[tokenIndex])) {
        return (tokens[0].left + tokens.at(-1).left + tokens.at(-1).width) / 2;
      }
    }
    return undefined;
  };
  const anchors = {};
  ['position', 'symbol', 'type', 'volume', 'commission', 'swap', 'profit'].forEach((field) => {
    const word = normalizedWords.find((item) => item.normalized === field);
    if (word) anchors[field] = word.left + word.width / 2;
  });

  ['time', 'price'].forEach((field) => {
    anchors[field] = normalizedWords
      .filter((item) => item.normalized === field)
      .map((item) => item.left + item.width / 2)
      .sort((first, second) => first - second);
  });

  anchors.ticket = findHeaderCenter(['ticket']);
  anchors.openTime = findHeaderCenter(['opentime', 'opentimeutc'], ['open', 'time']);
  anchors.closeTime = findHeaderCenter(['closetime', 'closetimeutc'], ['close', 'time']);
  anchors.openPrice = findHeaderCenter(['openprice'], ['open', 'price']);
  anchors.closePrice = findHeaderCenter(['closeprice'], ['close', 'price']);
  anchors.grossProfit = findHeaderCenter(['grossprofit'], ['gross', 'profit']);
  anchors.side = findHeaderCenter(['side']);
  anchors.openDate = findHeaderCenter(['opendate', 'opendateutc'], ['open', 'date']);
  anchors.closedDate = findHeaderCenter(['closeddate', 'closeddateutc', 'closingdate'], ['closed', 'date']);
  anchors.open = findHeaderCenter(['open']);
  anchors.closed = findHeaderCenter(['closed']);
  anchors.lots = findHeaderCenter(['lots', 'lot']);

  ['sl', 'tp'].forEach((field) => {
    const direct = normalizedWords.find((item) => item.normalized === field);
    if (direct) {
      anchors[field] = direct.left + direct.width / 2;
      return;
    }
    const firstLetter = field[0];
    const lastLetter = field[1];
    const firstIndex = normalizedWords.findIndex((item, index) => item.normalized === firstLetter
      && normalizedWords.slice(index + 1, index + 3).some((next) => next.normalized === lastLetter));
    if (firstIndex >= 0) {
      const first = normalizedWords[firstIndex];
      const last = normalizedWords.slice(firstIndex + 1, firstIndex + 3)
        .find((item) => item.normalized === lastLetter);
      anchors[field] = (first.left + last.left + last.width) / 2;
    }
  });

  return anchors;
};

const isMt5OcrHeader = (words) => {
  const anchors = getOcrHeaderAnchors(words);
  return Boolean(anchors.position && anchors.symbol && anchors.type && anchors.volume
    && anchors.time?.length >= 2 && anchors.price?.length >= 2
    && anchors.sl && anchors.tp && anchors.commission && anchors.swap && anchors.profit);
};

const isTicketOcrHeader = (words) => {
  const anchors = getOcrHeaderAnchors(words);
  return Boolean(anchors.ticket && anchors.openTime && anchors.openPrice
    && anchors.closeTime && anchors.closePrice && anchors.side
    && anchors.symbol && anchors.volume && anchors.grossProfit);
};

const isOpenClosedOcrHeader = (words) => {
  const anchors = getOcrHeaderAnchors(words);
  return Boolean(anchors.symbol && anchors.type && anchors.openDate && anchors.open
    && anchors.closedDate && anchors.closed && anchors.tp && anchors.sl
    && anchors.lots && anchors.commission && anchors.profit);
};

export const extractScreenshotTradeRecords = (tsv) => {
  const lines = getOcrLines(tsv);
  const ticketFormat = lines.some(isTicketOcrHeader);
  const openClosedFormat = !ticketFormat && lines.some(isOpenClosedOcrHeader);
  const isHeader = ticketFormat
    ? isTicketOcrHeader
    : openClosedFormat
      ? isOpenClosedOcrHeader
      : isMt5OcrHeader;
  const headerIndex = lines.findIndex(isHeader);
  if (headerIndex < 0) {
    throw new Error('Could not read the trade-history headings. Use a clear screenshot showing all columns and complete trade rows.');
  }

  const headerWords = lines[headerIndex];
  const anchors = getOcrHeaderAnchors(headerWords);
  const columns = ticketFormat
    ? [
      ['Ticket', anchors.ticket],
      ['Open Time (UTC)', anchors.openTime],
      ['Open Price', anchors.openPrice],
      ['Close Time (UTC)', anchors.closeTime],
      ['Close Price', anchors.closePrice],
      ['Side', anchors.side],
      ['Symbol', anchors.symbol],
      ['Volume', anchors.volume],
      ['Gross Profit', anchors.grossProfit],
    ]
    : openClosedFormat
      ? [
        ['Symbol', anchors.symbol],
        ['Type', anchors.type],
        ['Open Date', anchors.openDate],
        ['Open', anchors.open],
        ['Closed Date', anchors.closedDate],
        ['Closed', anchors.closed],
        ['TP', anchors.tp],
        ['SL', anchors.sl],
        ['Lots', anchors.lots],
        ['Commission', anchors.commission],
        ['Profit', anchors.profit],
      ]
    : [
      ['Time', anchors.time[0]],
      ['Position', anchors.position],
      ['Symbol', anchors.symbol],
      ['Type', anchors.type],
      ['Volume', anchors.volume],
      ['Price', anchors.price[0]],
      ['S / L', anchors.sl],
      ['T / P', anchors.tp],
      ['Time2', anchors.time[1]],
      ['Price2', anchors.price[1]],
      ['Commission', anchors.commission],
      ['Swap', anchors.swap],
      ['Profit', anchors.profit],
    ].filter(([, center]) => Number.isFinite(center))
      .sort((first, second) => first[1] - second[1]);
  const boundaries = columns.map(([, center], index) => index === 0
    ? -Infinity
    : (columns[index - 1][1] + center) / 2);
  const records = [];

  lines.slice(headerIndex + 1).forEach((line) => {
    const values = Array(columns.length).fill('');
    line.forEach((word) => {
      const center = word.left + word.width / 2;
      let columnIndex = boundaries.findIndex((boundary, index) => center >= boundary
        && (index === columns.length - 1 || center < (columns[index][1] + columns[index + 1][1]) / 2));
      if (columnIndex < 0) columnIndex = columns.length - 1;
      values[columnIndex] = [values[columnIndex], word.text].filter(Boolean).join(' ');
    });
    if (values.some(Boolean)) {
      records.push(Object.fromEntries(columns.map(([name], index) => [name, values[index]])));
    }
  });

  return records;
};

export const parseTradeImage = async (file, onProgress = () => {}) => {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a screenshot smaller than 20 MB.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('Choose a PNG, JPG, or WebP screenshot.');

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress(`${Math.round((message.progress || 0) * 100)}%`);
    },
  });
  try {
    const { data } = await worker.recognize(file, {}, { tsv: true });
    const result = normalizeTradeRows(extractScreenshotTradeRecords(data.tsv));
    if (!result.trades.length) {
      throw new Error('No complete MT5 trades were recognized. Check that the screenshot is sharp and shows complete trade rows.');
    }
    if (result.trades.length > 1000) throw new Error('This screenshot contains more than 1,000 trades. Use a smaller date range.');
    return result;
  } finally {
    await worker.terminate();
  }
};
