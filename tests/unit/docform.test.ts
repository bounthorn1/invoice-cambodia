import { describe, expect, it } from 'vitest';
import { blankItem, formToDoc, type EForm } from '../../src/lib/docform.ts';

const form = (over: Partial<EForm> = {}): EForm => ({ businessId: 'b', customerId: 'c', issueDate: '2026-01-01', dueDate: '2026-01-15', currency: 'USD', discType: 'none', discVal: '', taxMode: 'exclusive', taxScope: 'none', docTaxRate: '', afterDisc: true, notes: '', terms: '', footer: '', paymentTerms: '', templateId: 'modern', items: [{ ...blankItem(), description: 'Work', qty: '2', price: '10.50' }], ...over });
const meta = { id: 'd', number: '', createdAt: '', status: 'unpaid' };
describe('formToDoc', () => {
  it('parses money to minor units', () => { const r = formToDoc('invoice', form(), undefined, undefined, meta); expect(r.items[0]!.unitPriceMinor).toBe(1050); expect(r.items[0]!.quantityMilli).toBe(2000); });
  it('flags missing business/customer, empty items, zero qty, bad dates', () => {
    const r = formToDoc('invoice', form({ items: [], dueDate: '2025-01-01' }), undefined, undefined, meta);
    expect(r.errors).toEqual(expect.arrayContaining(['err.business', 'err.customer', 'err.items', 'err.date']));
    expect(formToDoc('invoice', form({ items: [{ ...blankItem(), description: 'x', qty: '0', price: '1' }] }), undefined, undefined, meta).errors).toContain('err.qty');
  });
});
