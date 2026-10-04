const getMonthKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 7);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  return '';
};

export const buildMonthlyPayoutSummary = ({ accounts, payouts, month, currentMonth }) => {
  const payoutsForMonth = payouts.filter((payout) => payout.date?.slice(0, 7) === month);
  const payoutsByAccount = new Map();

  payoutsForMonth.forEach((payout) => {
    payoutsByAccount.set(
      payout.account,
      (payoutsByAccount.get(payout.account) || 0) + (Number(payout.amount) || 0),
    );
  });

  return accounts
    .filter((account) => {
      if (String(account.status || '').trim().toLowerCase() !== 'active') return false;
      const startMonth = getMonthKey(account.purchaseDate) || getMonthKey(account.createdAt);
      if (startMonth) return startMonth <= month;
      return month === currentMonth || payoutsByAccount.has(account.name);
    })
    .map((account) => {
      const fundedAmount = Number(account.fundedAmount) || 0;
      const payoutAmount = payoutsByAccount.get(account.name) || 0;
      return {
        name: account.name,
        fundedAmount,
        payoutAmount,
        returnPercent: fundedAmount > 0 ? payoutAmount / fundedAmount * 100 : null,
      };
    });
};
