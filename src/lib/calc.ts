import { mulDiv } from './money.ts';

/**
 * Document calculation engine. All amounts are integer minor units.
 * Quantities are thousandths; rates and percent discounts are basis points (10% = 1000).
 *
 * Rules (documented so behaviour is predictable):
 *  1. gross = round(unitPrice * qty)
 *  2. line discount (percent of gross, or fixed capped at gross) -> net
 *  3. document discount (percent of sum(net), or fixed capped) is allocated to lines
 *     proportionally using the largest-remainder method, so allocations sum exactly.
 *  4. Exclusive tax: tax = round(base * rate), base = after-discount amount when
 *     applyTaxAfterDiscount, otherwise the pre-discount gross. total = afterDiscount + tax.
 *  5. Inclusive tax: prices already contain tax; tax is extracted from the after-discount
 *     amount: tax = round(amount * rate / (10000 + rate)). total = afterDiscount.
 *  6. Tax-exempt lines and zero-rate lines produce 0 tax.
 */
export type DiscountType = 'percent' | 'fixed';
export interface Discount { type: DiscountType; value: number } // percent: bps, fixed: minor units
export type TaxMode = 'exclusive' | 'inclusive';
export type TaxScope = 'none' | 'document' | 'item';

export interface LineInput {
  quantityMilli: number;
  unitPriceMinor: number;
  discount?: Discount;
  taxRateBps?: number;
  taxExempt?: boolean;
}

export interface DocumentInput {
  items: LineInput[];
  discount?: Discount;
  taxMode: TaxMode;
  taxScope: TaxScope;
  documentTaxRateBps?: number;
  applyTaxAfterDiscount: boolean;
}

export interface LineResult {
  gross: number;
  lineDiscount: number;
  net: number;
  documentDiscountShare: number;
  afterDiscount: number;
  taxRateBps: number;
  tax: number;
  total: number;
}

export interface TaxBreakdownRow { rateBps: number; base: number; tax: number }

export interface DocumentResult {
  lines: LineResult[];
  subtotal: number;
  lineDiscountTotal: number;
  documentDiscount: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  taxBreakdown: TaxBreakdownRow[];
}

function discountAmount(base: number, d: Discount | undefined): number {
  if (!d || d.value <= 0 || base <= 0) return 0;
  if (d.type === 'percent') return mulDiv(base, Math.min(d.value, 10000), 10000);
  return Math.min(d.value, base);
}

/** Split `total` across `weights` proportionally; result sums exactly to `total`. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum <= 0) return weights.map(() => 0);
  const T = BigInt(total);
  const S = BigInt(sum);
  const shares = weights.map((w) => (T * BigInt(w)) / S);
  const remainders = weights.map((w, i) => ({ i, r: (T * BigInt(w)) % S }));
  let leftover = Number(T - shares.reduce((a, b) => a + b, 0n));
  remainders.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  const out = shares.map(Number);
  for (const { i } of remainders) {
    if (leftover <= 0) break;
    out[i] += 1;
    leftover -= 1;
  }
  return out;
}

export function calculateDocument(input: DocumentInput): DocumentResult {
  for (const it of input.items) {
    if (![it.quantityMilli, it.unitPriceMinor].every(Number.isSafeInteger) || it.quantityMilli < 0 || it.unitPriceMinor < 0) {
      throw new RangeError('Quantity and unit price must be non-negative integers (milli / minor units)');
    }
  }
  const base = input.items.map((it) => {
    const gross = mulDiv(it.unitPriceMinor, it.quantityMilli, 1000);
    const lineDiscount = discountAmount(gross, it.discount);
    return { it, gross, lineDiscount, net: gross - lineDiscount };
  });
  const netSum = base.reduce((a, b) => a + b.net, 0);
  const documentDiscount = discountAmount(netSum, input.discount);
  const shares = allocate(documentDiscount, base.map((b) => b.net));

  const breakdown = new Map<number, TaxBreakdownRow>();
  const lines: LineResult[] = base.map((b, i) => {
    const afterDiscount = b.net - shares[i];
    let rate = 0;
    if (!b.it.taxExempt) {
      if (input.taxScope === 'document') rate = input.documentTaxRateBps ?? 0;
      else if (input.taxScope === 'item') rate = b.it.taxRateBps ?? 0;
    }
    let tax = 0;
    let taxBase = 0;
    if (rate > 0) {
      if (input.taxMode === 'inclusive') {
        taxBase = afterDiscount;
        tax = mulDiv(afterDiscount, rate, 10000 + rate);
      } else {
        taxBase = input.applyTaxAfterDiscount ? afterDiscount : b.gross;
        tax = mulDiv(taxBase, rate, 10000);
      }
      const row = breakdown.get(rate) ?? { rateBps: rate, base: 0, tax: 0 };
      row.base += taxBase;
      row.tax += tax;
      breakdown.set(rate, row);
    }
    const total = input.taxMode === 'inclusive' ? afterDiscount : afterDiscount + tax;
    return {
      gross: b.gross, lineDiscount: b.lineDiscount, net: b.net,
      documentDiscountShare: shares[i], afterDiscount, taxRateBps: rate, tax, total,
    };
  });

  const sum = (f: (l: LineResult) => number) => lines.reduce((a, l) => a + f(l), 0);
  const lineDiscountTotal = sum((l) => l.lineDiscount);
  return {
    lines,
    subtotal: sum((l) => l.gross),
    lineDiscountTotal,
    documentDiscount,
    discountTotal: lineDiscountTotal + documentDiscount,
    taxTotal: sum((l) => l.tax),
    grandTotal: sum((l) => l.total),
    taxBreakdown: [...breakdown.values()].sort((a, b) => a.rateBps - b.rateBps),
  };
}
