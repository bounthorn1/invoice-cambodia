import { describe, it, expect } from 'vitest';
import { DEFAULT_NUMBERING, allocateNumber, formatDocNumber } from '../../src/lib/numbering.ts';

describe('numbering', () => {
  it('formats default numbers', () => {
    expect(formatDocNumber(DEFAULT_NUMBERING.invoice, 1)).toBe('INV-000001');
    expect(formatDocNumber(DEFAULT_NUMBERING.quotation, 42)).toBe('QUO-000042');
    expect(formatDocNumber(DEFAULT_NUMBERING.receipt, 7)).toBe('REC-000007');
  });
  it('increments and never reuses numbers', () => {
    let c = {};
    const a = allocateNumber('invoice', DEFAULT_NUMBERING.invoice, c); c = a.counters;
    const b = allocateNumber('invoice', DEFAULT_NUMBERING.invoice, c); c = b.counters;
    expect([a.number, b.number]).toEqual(['INV-000001', 'INV-000002']);
    // "deleting" INV-000002 does not roll back the counter
    const next = allocateNumber('invoice', DEFAULT_NUMBERING.invoice, c);
    expect(next.number).toBe('INV-000003');
  });
  it('honours custom prefix and starting sequence', () => {
    const cfg = { prefix: 'SHOP', padding: 4, startAt: 100 };
    expect(allocateNumber('invoice', cfg, {}).number).toBe('SHOP-0100');
  });
  it('counters are independent per document kind', () => {
    const r = allocateNumber('quotation', DEFAULT_NUMBERING.quotation, { invoice: 9 });
    expect(r.number).toBe('QUO-000001');
    expect(r.counters).toEqual({ invoice: 9, quotation: 1 });
  });
});
