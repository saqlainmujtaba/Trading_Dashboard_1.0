const dateFields = new Set(['date', 'purchaseDate', 'nextPayoutDate']);
const priorityRank = { Low: 1, Medium: 2, High: 3 };

const getSortValue = (row, field) => {
  if (field === 'profit') {
    return (Number(row.balance) || 0) - (Number(row.startingBalance) || 0);
  }
  return row[field];
};

export const sortRows = (rows, sortKey) => {
  const [field, direction] = sortKey.split('.');
  const multiplier = direction === 'desc' ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = getSortValue(left, field);
    const rightValue = getSortValue(right, field);
    let comparison = 0;

    if (field === 'priority') {
      comparison = (priorityRank[leftValue] || 0) - (priorityRank[rightValue] || 0);
    } else if (dateFields.has(field)) {
      const leftTime = Date.parse(leftValue || '');
      const rightTime = Date.parse(rightValue || '');
      comparison = Number.isNaN(leftTime) || Number.isNaN(rightTime)
        ? String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { numeric: true })
        : leftTime - rightTime;
    } else {
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      const valuesAreNumeric = leftValue !== '' && rightValue !== ''
        && leftValue !== null && rightValue !== null
        && Number.isFinite(leftNumber) && Number.isFinite(rightNumber);

      comparison = valuesAreNumeric
        ? leftNumber - rightNumber
        : String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { numeric: true, sensitivity: 'base' });
    }

    return comparison * multiplier;
  });
};
