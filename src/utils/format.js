export function formatTokenAmount(rawAmount, decimals = 6) {
  if (rawAmount === undefined || rawAmount === null || rawAmount === 0) return '0';
  const value = rawAmount / Math.pow(10, decimals);
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(2) + 'K';
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // 2 significant figures for small values: 0.001234 → "0.0012"
  const sigDecimals = Math.max(2, Math.ceil(-Math.log10(value)) + 1);
  return value.toFixed(Math.min(sigDecimals, 8)).replace(/0+$/, '').replace(/\.$/, '');
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
