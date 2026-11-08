import { describe, it, expect } from 'vitest';
import { balanceDue, countsTowardTotals, deriveInvoiceStatus, validatePayment } from '../../src/lib/payments.ts';

describe('payments', () => {
  it('computes balance with partial payments', () => {
    expect(balanceDue(10000, [{ amountMinor: 2500 }, { amountMinor: 2500 }])).toBe(5000);
  });
  it('rejects zero, negative and overpayments', () => {
    expect(validatePayment(5000, 0)).toEqual({ ok: false, reason: 'not_positive' });
    expect(validatePayment(5000, -1)).toEqual({ ok: false, reason: 'not_positive' });
    expect(validatePayment(5000, 5001)).toEqual({ ok: false, reason: 'exceeds_balance' });
    expect(validatePayment(5000, 5000)).toEqual({ ok: true });
  });
});

describe('status', () => {
  const b = { stored: 'unpaid' as const, totalMinor: 10000, dueDate: '2026-11-10', today: '2026-11-08' };
  it('unpaid / partially paid / paid', () => {
    expect(deriveInvoiceStatus({ ...b, paidMinor: 0 })).toBe('unpaid');
    expect(deriveInvoiceStatus({ ...b, paidMinor: 4000 })).toBe('partially_paid');
    expect(deriveInvoiceStatus({ ...b, paidMinor: 10000 })).toBe('paid');
  });
  it('overdue only when balance remains and due date passed', () => {
    expect(deriveInvoiceStatus({ ...b, dueDate: '2026-11-01', paidMinor: 0 })).toBe('overdue');
    expect(deriveInvoiceStatus({ ...b, dueDate: '2026-11-01', paidMinor: 4000 })).toBe('overdue');
    expect(deriveInvoiceStatus({ ...b, dueDate: '2026-11-01', paidMinor: 10000 })).toBe('paid');
    expect(deriveInvoiceStatus({ ...b, dueDate: '2026-11-08', paidMinor: 0 })).toBe('unpaid');
  });
  it('draft and cancelled are never overridden and excluded from totals', () => {
    expect(deriveInvoiceStatus({ ...b, stored: 'cancelled', dueDate: '2020-01-01', paidMinor: 0 })).toBe('cancelled');
    expect(deriveInvoiceStatus({ ...b, stored: 'draft', paidMinor: 0 })).toBe('draft');
    expect(countsTowardTotals('cancelled')).toBe(false);
    expect(countsTowardTotals('paid')).toBe(true);
  });
});
