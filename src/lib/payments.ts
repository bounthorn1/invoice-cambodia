export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface PaymentLike { amountMinor: number }

export function totalPaid(payments: PaymentLike[]): number {
  return payments.reduce((a, p) => a + p.amountMinor, 0);
}

export function balanceDue(totalMinor: number, payments: PaymentLike[]): number {
  return totalMinor - totalPaid(payments);
}

export type PaymentCheck = { ok: true } | { ok: false; reason: 'not_positive' | 'exceeds_balance' | 'not_integer' };

/** Rejects overpayment by default. */
export function validatePayment(balanceMinor: number, amountMinor: number): PaymentCheck {
  if (!Number.isSafeInteger(amountMinor)) return { ok: false, reason: 'not_integer' };
  if (amountMinor <= 0) return { ok: false, reason: 'not_positive' };
  if (amountMinor > balanceMinor) return { ok: false, reason: 'exceeds_balance' };
  return { ok: true };
}

export interface StatusInput {
  stored: InvoiceStatus; // draft / cancelled are explicit user states and are never overridden
  totalMinor: number;
  paidMinor: number;
  dueDate: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD
}

/** Overdue = unpaid balance remains and due date is before today. */
export function deriveInvoiceStatus(i: StatusInput): InvoiceStatus {
  if (i.stored === 'cancelled' || i.stored === 'draft') return i.stored;
  const balance = i.totalMinor - i.paidMinor;
  if (i.totalMinor > 0 && balance <= 0) return 'paid';
  if (balance > 0 && i.dueDate && i.dueDate < i.today) return 'overdue';
  if (i.paidMinor > 0) return 'partially_paid';
  return 'unpaid';
}

/** Cancelled invoices contribute to neither revenue nor receivables. */
export function countsTowardTotals(status: InvoiceStatus): boolean {
  return status !== 'cancelled' && status !== 'draft';
}
