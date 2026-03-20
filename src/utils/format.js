export function formatTokenAmount(amount, decimals = 6) {
  if (!amount && amount !== 0) return '0.00';
  const val = amount / Math.pow(10, decimals);
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(2) + 'K';
  return val.toFixed(2);
}

export function parseTokenAmount(value, decimals = 6) {
  if (!value) return 0;
  const str = String(value).trim();
  if (str.startsWith('-') || /[eE]/.test(str)) return 0;
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0 || parsed > 1e15) return 0;
  return Math.floor(parsed * Math.pow(10, decimals));
}

export function formatMaxAmount(balanceInBaseUnits, decimals = 6) {
  return (Math.floor(balanceInBaseUnits / Math.pow(10, decimals - 2)) / 100).toFixed(2);
}
