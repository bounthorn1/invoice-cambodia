/** Money is always stored as integer minor units. USD: cents (2 dp). KHR: riel (0 dp). */
export type Currency = 'USD' | 'KHR';

export const CURRENCY_META: Record<Currency, { decimals: number; symbol: string }> = {
  USD: { decimals: 2, symbol: '$' },
  KHR: { decimals: 0, symbol: '៛' },
};

/** Integer multiply-then-divide with round-half-away-from-zero. Uses BigInt to avoid overflow. */
export function mulDiv(a: number, b: number, d: number): number {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(d) || d === 0) {
    throw new RangeError('mulDiv requires safe integers and non-zero divisor');
  }
  const n = BigInt(a) * BigInt(b);
  const D = BigInt(d);
  const negative = n < 0n !== D < 0n;
  const absN = n < 0n ? -n : n;
  const absD = D < 0n ? -D : D;
  const q = (absN * 2n + absD) / (2n * absD);
  return Number(negative ? -q : q);
}

/** Parse a user-typed major-unit string ("1,234.50") to minor units. Returns null if invalid. */
export function parseMajorToMinor(input: string, currency: Currency): number | null {
  const s = input.trim().replace(/,/g, '');
  const { decimals } = CURRENCY_META[currency];
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  const [, sign, whole, frac = ''] = m;
  if (frac.length > decimals && /[1-9]/.test(frac.slice(decimals))) return null; // would lose precision
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const value = Number(whole + fracPadded);
  if (!Number.isSafeInteger(value)) return null;
  return sign === '-' ? -value : value;
}

/** Format minor units, e.g. 123450 USD -> "$1,234.50"; 1234500 KHR -> "៛1,234,500". */
export function formatMinor(minor: number, currency: Currency): string {
  const { decimals, symbol } = CURRENCY_META[currency];
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const divisor = 10 ** decimals;
  const whole = Math.floor(abs / divisor);
  const frac = abs % divisor;
  const wholeStr = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = decimals > 0 ? `${wholeStr}.${String(frac).padStart(decimals, '0')}` : wholeStr;
  return `${negative ? '-' : ''}${symbol}${body}`;
}

/** Parse a percentage string ("10", "7.5") to basis points (1000, 750). Null if invalid or >2 dp. */
export function parsePercentToBps(input: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number(((m[2] ?? '') + '00').slice(0, 2));
}

/** Parse a quantity string to thousandths ("1.5" -> 1500). Null if invalid or >3 dp. */
export function parseQuantityToMilli(input: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 1000 + Number(((m[2] ?? '') + '000').slice(0, 3));
}
