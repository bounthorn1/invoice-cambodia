import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, newId } from '../../src/db/db.ts';
import { clearAll, convertQuotation, deleteDoc, deletePayment, exportBackup, importBackup, invoiceRow, parseBackup, recordPayment, saveDoc } from '../../src/db/repo.ts';
import type { BusinessProfile, Customer, DocItem, Invoice, Quotation } from '../../src/db/types.ts';

const now = new Date().toISOString();
const biz: BusinessProfile = { id: newId(), name: 'Biz', defaultCurrency: 'USD', defaultLanguage: 'en', createdAt: now, updatedAt: now };
const cust: Customer = { id: newId(), type: 'individual', name: 'Dara', createdAt: now, updatedAt: now };
const base = (id: string) => ({ id, number: '', businessSnapshot: biz, customerSnapshot: cust, customerId: cust.id, businessId: biz.id, issueDate: '2026-01-01', currency: 'USD' as const, taxMode: 'exclusive' as const, taxScope: 'none' as const, applyTaxAfterDiscount: true, templateId: 'modern' as const, createdAt: now, updatedAt: now });
const item = (docId: string): DocItem => ({ id: newId(), documentId: docId, position: 0, description: 'x', quantityMilli: 1000, unitPriceMinor: 10000 });
const mkInv = (): [Invoice, DocItem[]] => { const id = newId(); return [{ ...base(id), dueDate: '2099-01-01', status: 'unpaid' }, [item(id)]]; };
const mkQuo = (): [Quotation, DocItem[]] => { const id = newId(); return [{ ...base(id), validUntil: '2099-01-01', status: 'sent' }, [item(id)]]; };

beforeEach(async () => { await clearAll(); });

describe('repo', () => {
  it('never reuses document numbers after deletion', async () => {
    const [a, ai] = mkInv(); const first = await saveDoc('invoice', a, ai);
    await deleteDoc('invoice', first.id);
    const [b, bi] = mkInv(); const second = await saveDoc('invoice', b, bi);
    expect(first.number).toBe('INV-000001'); expect(second.number).toBe('INV-000002');
  });
  it('records payments, rejects overpayment, links receipts', async () => {
    const [i, items] = mkInv(); const inv = await saveDoc('invoice', i, items);
    const rec = await recordPayment(inv.id, { date: '2026-01-02', amountMinor: 4000, method: 'cash' });
    expect(rec.number).toBe('REC-000001');
    await expect(recordPayment(inv.id, { date: '2026-01-02', amountMinor: 6001, method: 'cash' })).rejects.toThrow('exceeds_balance');
    expect((await invoiceRow(inv.id))!.balance).toBe(6000);
    await deletePayment(rec.paymentId);
    expect((await invoiceRow(inv.id))!.balance).toBe(10000);
    expect(await db.receipts.count()).toBe(0);
  });
  it('converts a quotation once and keeps the original', async () => {
    const [q, qi] = mkQuo(); const quo = await saveDoc('quotation', q, qi);
    const invId = await convertQuotation(quo.id);
    await expect(convertQuotation(quo.id)).rejects.toThrow('converted');
    const inv = await db.invoices.get(invId);
    expect(inv?.sourceQuotationId).toBe(quo.id); expect((await db.quotations.get(quo.id))?.status).toBe('converted');
    expect(await db.invoiceItems.where('documentId').equals(invId).count()).toBe(1); expect(await db.invoices.count()).toBe(1);
  });
  it('exports and restores backups (replace and merge)', async () => {
    const [i, items] = mkInv(); await saveDoc('invoice', i, items); await db.customers.add(cust);
    const backup = parseBackup(JSON.stringify(await exportBackup()));
    await clearAll(); expect(await db.invoices.count()).toBe(0);
    await importBackup(backup, 'replace'); expect(await db.invoices.count()).toBe(1); expect(await db.customers.count()).toBe(1);
    await importBackup(backup, 'merge'); expect(await db.invoices.count()).toBe(1);
  });
  it('rejects invalid and incompatible backups', () => {
    expect(() => parseBackup('nope')).toThrow('json');
    expect(() => parseBackup(JSON.stringify({ application: 'Invoice Cambodia', schemaVersion: 99, data: {} }))).toThrow('version');
  });
});
