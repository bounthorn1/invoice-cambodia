import type { EntityTable } from 'dexie';
import { db, newId } from './db.ts';
import type { AppSettings, DocItem, Invoice, Payment, PaymentMethod, Quotation, QuotationStatus, Receipt } from './types.ts';
import { allocateNumber, DEFAULT_NUMBERING } from '../lib/numbering.ts';
import { calculateDocument, type DocumentInput, type DocumentResult } from '../lib/calc.ts';
import { balanceDue, deriveInvoiceStatus, totalPaid, validatePayment, type InvoiceStatus } from '../lib/payments.ts';
import { addDays, today } from '../lib/util.ts';

export type Kind = 'invoice' | 'quotation';
export const defaultSettings = (): AppSettings => ({
  id: 'app', language: 'km', defaultCurrency: 'USD', dateFormat: 'DD/MM/YYYY', defaultTemplate: 'modern',
  counters: {}, numbering: structuredClone(DEFAULT_NUMBERING),
});
export async function getSettings(): Promise<AppSettings> { return (await db.settings.get('app')) ?? defaultSettings(); }
export async function saveSettings(s: AppSettings): Promise<void> { await db.settings.put(s); }

export const docInput = (d: Invoice | Quotation, items: DocItem[]): DocumentInput => ({
  items: [...items].sort((a, b) => a.position - b.position).map((i) => ({
    quantityMilli: i.quantityMilli, unitPriceMinor: i.unitPriceMinor, discount: i.discount, taxRateBps: i.taxRateBps, taxExempt: i.taxExempt,
  })),
  discount: d.discount, taxMode: d.taxMode, taxScope: d.taxScope, documentTaxRateBps: d.documentTaxRateBps, applyTaxAfterDiscount: d.applyTaxAfterDiscount,
});

const group = <T extends { documentId?: string; invoiceId?: string }>(rows: T[], key: 'documentId' | 'invoiceId') => {
  const m = new Map<string, T[]>();
  for (const r of rows) { const k = r[key] as string; (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
  return m;
};

export interface InvRow { inv: Invoice; items: DocItem[]; payments: Payment[]; calc: DocumentResult; paid: number; balance: number; status: InvoiceStatus }
function buildInv(inv: Invoice, items: DocItem[], payments: Payment[]): InvRow {
  const calc = calculateDocument(docInput(inv, items));
  const paid = totalPaid(payments);
  const status = deriveInvoiceStatus({ stored: inv.status, totalMinor: calc.grandTotal, paidMinor: paid, dueDate: inv.dueDate, today: today() });
  return { inv, items, payments, calc, paid, balance: balanceDue(calc.grandTotal, payments), status };
}
export async function invoiceRows(): Promise<InvRow[]> {
  const [invs, items, pays] = await Promise.all([db.invoices.toArray(), db.invoiceItems.toArray(), db.payments.toArray()]);
  const gi = group(items, 'documentId'), gp = group(pays, 'invoiceId');
  return invs.map((i) => buildInv(i, gi.get(i.id) ?? [], gp.get(i.id) ?? []));
}
export async function invoiceRow(id: string): Promise<InvRow | undefined> {
  const inv = await db.invoices.get(id);
  if (!inv) return undefined;
  return buildInv(inv, await db.invoiceItems.where('documentId').equals(id).toArray(), await db.payments.where('invoiceId').equals(id).toArray());
}
export interface QuoRow { q: Quotation; items: DocItem[]; calc: DocumentResult; status: QuotationStatus }
export const quotationStatus = (q: Quotation): QuotationStatus =>
  (q.status === 'draft' || q.status === 'sent') && q.validUntil < today() ? 'expired' : q.status;
function buildQuo(q: Quotation, items: DocItem[]): QuoRow { return { q, items, calc: calculateDocument(docInput(q, items)), status: quotationStatus(q) }; }
export async function quotationRows(): Promise<QuoRow[]> {
  const [qs, items] = await Promise.all([db.quotations.toArray(), db.quotationItems.toArray()]);
  const gi = group(items, 'documentId');
  return qs.map((q) => buildQuo(q, gi.get(q.id) ?? []));
}
export async function quotationRow(id: string): Promise<QuoRow | undefined> {
  const q = await db.quotations.get(id);
  return q ? buildQuo(q, await db.quotationItems.where('documentId').equals(id).toArray()) : undefined;
}

const tables = (k: Kind) => ({
  docs: (k === 'invoice' ? db.invoices : db.quotations) as unknown as EntityTable<Invoice | Quotation, 'id'>,
  items: (k === 'invoice' ? db.invoiceItems : db.quotationItems) as EntityTable<DocItem, 'id'>,
});
const ALL = () => [db.settings, db.invoices, db.invoiceItems, db.quotations, db.quotationItems, db.payments, db.receipts];

/** Saves a document and its items atomically; allocates the number (never reused) when empty. */
export async function saveDoc(kind: Kind, doc: Invoice | Quotation, items: DocItem[]): Promise<Invoice | Quotation> {
  return db.transaction('rw', ALL(), async () => {
    const s = await getSettings();
    const d = { ...doc, updatedAt: new Date().toISOString() };
    if (!d.number) {
      const a = allocateNumber(kind, s.numbering[kind], s.counters);
      d.number = a.number;
      await db.settings.put({ ...s, counters: a.counters });
    }
    const t = tables(kind);
    await t.docs.put(d);
    await t.items.where('documentId').equals(d.id).delete();
    await t.items.bulkPut(items.map((x, i) => ({ ...x, documentId: d.id, position: i })));
    return d;
  });
}

export async function deleteDoc(kind: Kind, id: string): Promise<void> {
  await db.transaction('rw', ALL(), async () => {
    const t = tables(kind);
    await t.items.where('documentId').equals(id).delete();
    if (kind === 'invoice') {
      await db.payments.where('invoiceId').equals(id).delete();
      await db.receipts.where('invoiceId').equals(id).delete();
    }
    await t.docs.delete(id);
  });
}

export async function duplicateDoc(kind: Kind, id: string): Promise<string> {
  const row = kind === 'invoice' ? await invoiceRow(id) : await quotationRow(id);
  if (!row) throw new Error('missing');
  const src = 'inv' in row ? row.inv : row.q;
  const nid = newId(), now = new Date().toISOString();
  const base = { ...src, id: nid, number: '', issueDate: today(), createdAt: now, updatedAt: now };
  const copy = 'inv' in row
    ? { ...base, status: 'draft' as const, dueDate: addDays(today(), 14), sourceQuotationId: undefined }
    : { ...base, status: 'draft' as const, validUntil: addDays(today(), 30), convertedInvoiceId: undefined };
  await saveDoc(kind, copy as Invoice | Quotation, row.items.map((i) => ({ ...i, id: newId(), documentId: nid })));
  return nid;
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  await db.invoices.update(id, { status, updatedAt: new Date().toISOString() });
}
export async function setQuotationStatus(id: string, status: QuotationStatus): Promise<void> {
  await db.quotations.update(id, { status, updatedAt: new Date().toISOString() });
}

/** Atomic conversion: new invoice + marks quotation converted; refuses to convert twice. */
export async function convertQuotation(id: string): Promise<string> {
  return db.transaction('rw', ALL(), async () => {
    const row = await quotationRow(id);
    if (!row) throw new Error('missing');
    if (row.q.status === 'converted' || row.q.convertedInvoiceId) throw new Error('converted');
    const nid = newId(), now = new Date().toISOString();
    const { validUntil: _v, status: _s, convertedInvoiceId: _c, ...rest } = row.q;
    void _v; void _s; void _c;
    const inv: Invoice = { ...rest, id: nid, number: '', issueDate: today(), dueDate: addDays(today(), 14), status: 'unpaid', sourceQuotationId: row.q.id, createdAt: now, updatedAt: now };
    await saveDoc('invoice', inv, row.items.map((i) => ({ ...i, id: newId(), documentId: nid })));
    await db.quotations.update(id, { status: 'converted', convertedInvoiceId: nid, updatedAt: now });
    return nid;
  });
}

export interface PaymentInput { date: string; amountMinor: number; method: PaymentMethod; reference?: string; notes?: string }
/** Records a payment and its receipt in one transaction. Throws Error(code) for invalid state/amount. */
export async function recordPayment(invoiceId: string, p: PaymentInput): Promise<Receipt> {
  return db.transaction('rw', ALL(), async () => {
    const row = await invoiceRow(invoiceId);
    if (!row) throw new Error('missing');
    if (row.inv.status === 'cancelled' || row.inv.status === 'draft') throw new Error('state');
    const chk = validatePayment(row.balance, p.amountMinor);
    if (!chk.ok) throw new Error(chk.reason);
    const s = await getSettings();
    const a = allocateNumber('receipt', s.numbering.receipt, s.counters);
    await db.settings.put({ ...s, counters: a.counters });
    const now = new Date().toISOString();
    const pay: Payment = { id: newId(), invoiceId, date: p.date, amountMinor: p.amountMinor, currency: row.inv.currency, method: p.method, reference: p.reference || undefined, notes: p.notes || undefined, createdAt: now };
    const rec: Receipt = { id: newId(), number: a.number, paymentId: pay.id, invoiceId, businessSnapshot: row.inv.businessSnapshot, customerSnapshot: row.inv.customerSnapshot, createdAt: now };
    await db.payments.add(pay);
    await db.receipts.add(rec);
    return rec;
  });
}
export async function deletePayment(id: string): Promise<void> {
  await db.transaction('rw', ALL(), async () => { await db.receipts.where('paymentId').equals(id).delete(); await db.payments.delete(id); });
}

// ---------- Backup ----------
export const TABLES = ['businessProfiles', 'customers', 'invoices', 'invoiceItems', 'quotations', 'quotationItems', 'payments', 'receipts', 'taxProfiles', 'settings'] as const;
export interface BackupFile { application: string; schemaVersion: number; exportDate: string; data: Record<string, Record<string, unknown>[]> }
export async function exportBackup(): Promise<BackupFile> {
  const data: BackupFile['data'] = {};
  for (const t of TABLES) data[t] = (await db.table(t).toArray()) as Record<string, unknown>[];
  return { application: 'Invoice Cambodia', schemaVersion: 1, exportDate: new Date().toISOString(), data };
}
/** Throws Error('json') or Error('version'). */
export function parseBackup(text: string): BackupFile {
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new Error('json'); }
  const b = j as Partial<BackupFile> | null;
  if (!b || b.application !== 'Invoice Cambodia' || typeof b.data !== 'object' || b.data === null) throw new Error('json');
  if (b.schemaVersion !== 1) throw new Error('version');
  const data: BackupFile['data'] = {};
  for (const t of TABLES) {
    const rows = (b.data as Record<string, unknown>)[t] ?? [];
    if (!Array.isArray(rows) || rows.some((r) => typeof r !== 'object' || r === null || typeof (r as { id?: unknown }).id !== 'string')) throw new Error('json');
    data[t] = rows as Record<string, unknown>[];
  }
  return { application: b.application, schemaVersion: 1, exportDate: String(b.exportDate ?? ''), data };
}
export const backupCounts = (b: BackupFile): Record<string, number> => Object.fromEntries(TABLES.map((t) => [t, b.data[t]?.length ?? 0]));

export async function importBackup(b: BackupFile, mode: 'merge' | 'replace'): Promise<{ skipped: number }> {
  let skipped = 0;
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    if (mode === 'replace') {
      for (const t of TABLES) await db.table(t).clear();
      for (const t of TABLES) await db.table(t).bulkPut(b.data[t] ?? []);
      return;
    }
    for (const t of TABLES) {
      if (t === 'settings') continue;
      let rows = b.data[t] ?? [];
      if (t === 'invoices' || t === 'quotations' || t === 'receipts') {
        const existing = await db.table(t).toArray() as { id: string; number: string }[];
        const byNumber = new Map(existing.map((e) => [e.number, e.id]));
        rows = rows.filter((r) => { const o = byNumber.get(String(r.number)); const ok = !o || o === r.id; if (!ok) skipped++; return ok; });
      }
      await db.table(t).bulkPut(rows);
    }
    const local = await getSettings();
    const inc = b.data.settings?.[0] as AppSettings | undefined;
    if (inc) {
      const counters = { ...local.counters };
      for (const k of ['invoice', 'quotation', 'receipt'] as const) counters[k] = Math.max(counters[k] ?? 0, inc.counters?.[k] ?? 0) || undefined;
      await db.settings.put({ ...local, counters });
    }
  });
  return { skipped };
}
export async function clearAll(): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => { for (const t of TABLES) await db.table(t).clear(); });
}
