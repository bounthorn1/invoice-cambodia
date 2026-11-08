import { describe, it, expect } from 'vitest';
import { allocate, calculateDocument, type DocumentInput } from '../../src/lib/calc.ts';

const base: DocumentInput = {
  items: [{ quantityMilli: 1000, unitPriceMinor: 10000 }],
  taxMode: 'exclusive', taxScope: 'none', applyTaxAfterDiscount: true,
};

describe('subtotals', () => {
  it('sums quantity * price across lines', () => {
    const r = calculateDocument({
      ...base,
      items: [{ quantityMilli: 2000, unitPriceMinor: 1050 }, { quantityMilli: 1500, unitPriceMinor: 1000 }],
    });
    expect(r.subtotal).toBe(2100 + 1500);
    expect(r.grandTotal).toBe(3600);
  });
  it('avoids float error (0.1 + 0.2 style)', () => {
    const r = calculateDocument({ ...base, items: [{ quantityMilli: 3000, unitPriceMinor: 10 }, { quantityMilli: 1000, unitPriceMinor: 20 }] });
    expect(r.grandTotal).toBe(50);
  });
});

describe('discounts', () => {
  it('percentage line discount', () => {
    const r = calculateDocument({ ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 20000, discount: { type: 'percent', value: 1000 } }] });
    expect(r.lines[0].lineDiscount).toBe(2000);
    expect(r.grandTotal).toBe(18000);
  });
  it('fixed line discount is capped at gross', () => {
    const r = calculateDocument({ ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 500, discount: { type: 'fixed', value: 9999 } }] });
    expect(r.grandTotal).toBe(0);
  });
  it('document percentage discount', () => {
    const r = calculateDocument({ ...base, discount: { type: 'percent', value: 1000 } });
    expect(r.documentDiscount).toBe(1000);
    expect(r.grandTotal).toBe(9000);
  });
  it('document fixed discount is allocated exactly across lines', () => {
    const r = calculateDocument({
      ...base,
      items: [{ quantityMilli: 1000, unitPriceMinor: 100 }, { quantityMilli: 1000, unitPriceMinor: 100 }, { quantityMilli: 1000, unitPriceMinor: 100 }],
      discount: { type: 'fixed', value: 100 },
    });
    expect(r.lines.reduce((a, l) => a + l.documentDiscountShare, 0)).toBe(100);
    expect(r.grandTotal).toBe(200);
  });
  it('allocate sums exactly and handles zero weights', () => {
    expect(allocate(10, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(10);
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
  });
});

describe('tax', () => {
  it('exclusive document tax', () => {
    const r = calculateDocument({ ...base, taxScope: 'document', documentTaxRateBps: 1000 });
    expect(r.taxTotal).toBe(1000);
    expect(r.grandTotal).toBe(11000);
  });
  it('inclusive tax extracts tax without changing total', () => {
    const r = calculateDocument({
      ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 11000 }],
      taxMode: 'inclusive', taxScope: 'document', documentTaxRateBps: 1000,
    });
    expect(r.taxTotal).toBe(1000);
    expect(r.grandTotal).toBe(11000);
  });
  it('tax after discount', () => {
    const r = calculateDocument({
      ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 20000 }],
      discount: { type: 'percent', value: 1000 }, taxScope: 'document', documentTaxRateBps: 1000, applyTaxAfterDiscount: true,
    });
    expect(r.taxTotal).toBe(1800);
    expect(r.grandTotal).toBe(19800);
  });
  it('tax before discount', () => {
    const r = calculateDocument({
      ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 20000 }],
      discount: { type: 'percent', value: 1000 }, taxScope: 'document', documentTaxRateBps: 1000, applyTaxAfterDiscount: false,
    });
    expect(r.taxTotal).toBe(2000);
    expect(r.grandTotal).toBe(20000);
  });
  it('item-level tax with mixed rates, exemption and zero-rate, with breakdown', () => {
    const r = calculateDocument({
      ...base, taxScope: 'item',
      items: [
        { quantityMilli: 1000, unitPriceMinor: 10000, taxRateBps: 1000 },
        { quantityMilli: 1000, unitPriceMinor: 10000, taxRateBps: 0 },
        { quantityMilli: 1000, unitPriceMinor: 10000, taxRateBps: 1000, taxExempt: true },
        { quantityMilli: 1000, unitPriceMinor: 10000, taxRateBps: 500 },
      ],
    });
    expect(r.taxTotal).toBe(1500);
    expect(r.taxBreakdown).toEqual([{ rateBps: 500, base: 10000, tax: 500 }, { rateBps: 1000, base: 10000, tax: 1000 }]);
  });
  it('rounds tax consistently (half up) in cents', () => {
    const r = calculateDocument({ ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 1005 }], taxScope: 'document', documentTaxRateBps: 1000 });
    expect(r.taxTotal).toBe(101); // 100.5 -> 101
  });
  it('KHR rounds to whole riel', () => {
    const r = calculateDocument({ ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 4005 }], taxScope: 'document', documentTaxRateBps: 1000 });
    expect(r.taxTotal).toBe(401);
    expect(r.grandTotal).toBe(4406);
  });
  it('rejects negative or fractional inputs', () => {
    expect(() => calculateDocument({ ...base, items: [{ quantityMilli: -1, unitPriceMinor: 1 }] })).toThrow();
    expect(() => calculateDocument({ ...base, items: [{ quantityMilli: 1000, unitPriceMinor: 1.5 }] })).toThrow();
  });
});
