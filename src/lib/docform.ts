import type { BusinessProfile, Customer, DocItem, Invoice, Quotation, QuotationStatus, TemplateId } from '../db/types.ts';
import { CURRENCY_META, parseMajorToMinor, parsePercentToBps, parseQuantityToMilli, type Currency } from './money.ts';
import type { Discount, TaxMode, TaxScope } from './calc.ts';
import type { InvoiceStatus } from './payments.ts';
import { validDate } from './util.ts';
import { newId } from '../db/db.ts';
import type { Key } from '../i18n/index.ts';

export type DiscType = 'none' | 'percent' | 'fixed';
export interface EItem { id: string; description: string; unit: string; qty: string; price: string; discType: DiscType; discVal: string; taxRate: string; taxExempt: boolean }
export interface EForm {
  businessId: string; customerId: string; issueDate: string; dueDate: string; currency: Currency;
  discType: DiscType; discVal: string; taxMode: TaxMode; taxScope: TaxScope; docTaxRate: string; afterDisc: boolean;
  notes: string; terms: string; footer: string; paymentTerms: string; templateId: TemplateId; items: EItem[];
}
export const UNITS = ['piece', 'unit', 'hour', 'day', 'month', 'service', 'box', 'kg', 'meter'];
export const blankItem = (): EItem => ({ id: newId(), description: '', unit: 'piece', qty: '1', price: '0', discType: 'none', discVal: '', taxRate: '', taxExempt: false });

export interface Meta { id: string; number: string; createdAt: string; status: string; sourceQuotationId?: string; convertedInvoiceId?: string }
export type ErrKey = Extract<Key, `err.${string}`>;
const blankBiz: BusinessProfile = { id: '', name: '', defaultCurrency: 'USD', defaultLanguage: 'km', createdAt: '', updatedAt: '' };
const blankCust: Customer = { id: '', type: 'individual', name: '', createdAt: '', updatedAt: '' };

function disc(type: DiscType, val: string, cur: Currency, errs: Set<ErrKey>): Discount | undefined {
  if (type === 'none') return undefined;
  const v = type === 'percent' ? parsePercentToBps(val || '0') : parseMajorToMinor(val || '0', cur);
  if (v === null || v < 0 || (type === 'percent' && v > 10000)) { errs.add('err.discount'); return undefined; }
  return v > 0 ? { type, value: v } : undefined;
}

export function formToDoc(kind: 'invoice' | 'quotation', f: EForm, biz: BusinessProfile | undefined, cust: Customer | undefined, meta: Meta) {
  const errs = new Set<ErrKey>();
  if (!biz) errs.add('err.business');
  if (!cust) errs.add('err.customer');
  if (f.items.length === 0) errs.add('err.items');
  const items: DocItem[] = f.items.map((e, i) => {
    if (!e.description.trim()) errs.add('err.desc');
    const q = parseQuantityToMilli(e.qty);
    if (q === null || q <= 0) errs.add('err.qty');
    const p = parseMajorToMinor(e.price, f.currency);
    if (p === null || p < 0) errs.add('err.price');
    let rate: number | undefined;
    if (f.taxScope === 'item' && !e.taxExempt) {
      const b = parsePercentToBps(e.taxRate || '0');
      if (b === null) errs.add('err.tax'); else rate = b;
    }
    return {
      id: e.id, documentId: meta.id, position: i, description: e.description.trim(), quantityMilli: q ?? 0, unit: e.unit,
      unitPriceMinor: Math.max(p ?? 0, 0), discount: disc(e.discType, e.discVal, f.currency, errs), taxRateBps: rate, taxExempt: e.taxExempt || undefined,
    };
  });
  let docRate: number | undefined;
  if (f.taxScope === 'document') {
    const b = parsePercentToBps(f.docTaxRate || '0');
    if (b === null) errs.add('err.tax'); else docRate = b;
  }
  if (!validDate(f.issueDate) || !validDate(f.dueDate) || f.dueDate < f.issueDate) errs.add('err.date');
  const now = new Date().toISOString();
  const b = biz ?? blankBiz, c = cust ?? blankCust;
  const base = {
    id: meta.id, number: meta.number, businessSnapshot: b, customerSnapshot: c, customerId: c.id, businessId: b.id,
    issueDate: f.issueDate, currency: f.currency, discount: disc(f.discType, f.discVal, f.currency, errs), taxMode: f.taxMode, taxScope: f.taxScope,
    documentTaxRateBps: docRate, applyTaxAfterDiscount: f.afterDisc, notes: f.notes || undefined, terms: f.terms || undefined, footer: f.footer || undefined,
    templateId: f.templateId, createdAt: meta.createdAt, updatedAt: now,
  };
  const doc: Invoice | Quotation = kind === 'invoice'
    ? { ...base, dueDate: f.dueDate, paymentTerms: f.paymentTerms || undefined, status: meta.status as InvoiceStatus, sourceQuotationId: meta.sourceQuotationId }
    : { ...base, validUntil: f.dueDate, status: meta.status as QuotationStatus, convertedInvoiceId: meta.convertedInvoiceId };
  return { doc, items, errors: [...errs] };
}

const minorStr = (m: number, c: Currency) => (m / 10 ** CURRENCY_META[c].decimals).toFixed(CURRENCY_META[c].decimals);
const discStr = (d: Discount | undefined, c: Currency) => d ? (d.type === 'percent' ? String(d.value / 100) : minorStr(d.value, c)) : '';
export function docToForm(d: Invoice | Quotation, items: DocItem[]): EForm {
  return {
    businessId: d.businessId, customerId: d.customerId, issueDate: d.issueDate, dueDate: 'dueDate' in d ? d.dueDate : d.validUntil, currency: d.currency,
    discType: d.discount?.type ?? 'none', discVal: discStr(d.discount, d.currency), taxMode: d.taxMode, taxScope: d.taxScope,
    docTaxRate: d.documentTaxRateBps !== undefined ? String(d.documentTaxRateBps / 100) : '', afterDisc: d.applyTaxAfterDiscount,
    notes: d.notes ?? '', terms: d.terms ?? '', footer: d.footer ?? '', paymentTerms: 'paymentTerms' in d ? d.paymentTerms ?? '' : '', templateId: d.templateId,
    items: [...items].sort((a, b) => a.position - b.position).map((i) => ({
      id: i.id, description: i.description, unit: i.unit, qty: String(i.quantityMilli / 1000), price: minorStr(i.unitPriceMinor, d.currency),
      discType: i.discount?.type ?? 'none', discVal: discStr(i.discount, d.currency), taxRate: i.taxRateBps !== undefined ? String(i.taxRateBps / 100) : '', taxExempt: !!i.taxExempt,
    })),
  };
}
