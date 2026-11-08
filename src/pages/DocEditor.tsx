import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { db, newId } from '../db/db.ts';
import type { DocItem, Invoice, Quotation, TemplateId } from '../db/types.ts';
import { calculateDocument } from '../lib/calc.ts';
import { docInput, getSettings, saveDoc, type Kind } from '../db/repo.ts';
import { blankItem, docToForm, formToDoc, UNITS, type EForm, type EItem } from '../lib/docform.ts';
import { addDays, today } from '../lib/util.ts';
import { useT, type Key } from '../i18n/index.ts';
import { Btn, Card, Field, PageHead, inp, toast } from '../components/ui.tsx';
import { DocumentSheet, modelFromDoc } from '../templates/DocumentSheet.tsx';

interface Props { kind: Kind; existing?: { doc: Invoice | Quotation; items: DocItem[] }; paidMinor?: number }
export default function DocEditor({ kind, existing, paidMinor = 0 }: Props) {
  const t = useT(); const nav = useNavigate();
  const businesses = useLiveQuery(() => db.businessProfiles.toArray(), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const taxes = useLiveQuery(() => db.taxProfiles.toArray(), []);
  const settings = useLiveQuery(getSettings, []);
  const [f, setF] = useState<EForm | null>(null);
  const [errs, setErrs] = useState<Key[]>([]);
  const meta = useRef({ id: existing?.doc.id ?? newId(), createdAt: existing?.doc.createdAt ?? new Date().toISOString() });

  useEffect(() => {
    if (f || !settings || !businesses || !taxes) return;
    if (existing) { setF(docToForm(existing.doc, existing.items)); return; }
    const biz = businesses[0]; const tax = taxes.find((x) => x.isDefault && x.enabled);
    setF({
      businessId: biz?.id ?? '', customerId: '', issueDate: today(), dueDate: addDays(today(), kind === 'invoice' ? 14 : 30), currency: biz?.defaultCurrency ?? settings.defaultCurrency,
      discType: 'none', discVal: '', taxMode: tax?.mode ?? 'exclusive', taxScope: tax ? tax.applyTo : 'none', docTaxRate: tax ? String(tax.rateBps / 100) : '', afterDisc: tax?.applyAfterDiscount ?? true,
      notes: settings.defaultNotes ?? '', terms: '', footer: settings.defaultFooter ?? '', paymentTerms: settings.defaultPaymentTerms ?? '', templateId: settings.defaultTemplate, items: [blankItem()],
    });
  }, [f, settings, businesses, taxes, existing, kind]);

  const biz = f && (existing && f.businessId === existing.doc.businessId ? existing.doc.businessSnapshot : businesses?.find((b) => b.id === f.businessId));
  const cust = f && (existing && f.customerId === existing.doc.customerId ? existing.doc.customerSnapshot : customers?.find((c) => c.id === f.customerId));
  const status = existing?.doc.status ?? (kind === 'invoice' ? 'unpaid' : 'draft');
  const built = useMemo(() => f ? formToDoc(kind, f, biz, cust, { id: meta.current.id, number: existing?.doc.number ?? '', createdAt: meta.current.createdAt, status, sourceQuotationId: existing && 'sourceQuotationId' in existing.doc ? existing.doc.sourceQuotationId : undefined, convertedInvoiceId: existing && 'convertedInvoiceId' in existing.doc ? existing.doc.convertedInvoiceId : undefined }) : null, [f, biz, cust, kind, existing, status]);
  if (!f || !built) return null;

  const set = (p: Partial<EForm>) => setF({ ...f, ...p });
  const setItem = (i: number, p: Partial<EItem>) => set({ items: f.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const move = (i: number, d: number) => { const a = [...f.items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j]!, a[i]!]; set({ items: a }); };
  const model = modelFromDoc(kind, built.doc, built.items);
  const save = async (draft: boolean) => {
    if (built.errors.length) { setErrs(built.errors); toast(t(built.errors[0]!), true); return; }
    setErrs([]);
    const doc = { ...built.doc } as Invoice | Quotation;
    if (kind === 'invoice') (doc as Invoice).status = draft ? 'draft' : (existing && existing.doc.status !== 'draft' ? (existing.doc.status as Invoice['status']) : 'unpaid');
    if (paidMinor > 0 && calculateDocument(docInput(doc, built.items)).grandTotal < paidMinor) { toast(t('validation.overpayment'), true); return; }
    try { const saved = await saveDoc(kind, doc, built.items); toast(t('common.saved')); nav(`/${kind}s/${saved.id}`); }
    catch (e) { toast(t(e instanceof Error && e.name === 'QuotaExceededError' ? 'err.storage' : 'err.generic'), true); }
  };
  const noBiz = (businesses?.length ?? 0) === 0; const noCust = (customers?.length ?? 0) === 0 && !existing;
  const showItemTax = f.taxScope === 'item';
  return (
    <>
      <PageHead title={t(kind === 'invoice' ? 'ed.title.invoice' : 'ed.title.quotation')}>
        <Btn variant="ghost" onClick={() => nav(-1)}>{t('common.cancel')}</Btn>
        {(kind === 'invoice' && (!existing || existing.doc.status === 'draft')) && <Btn variant="ghost" onClick={() => save(true)}>{t('ed.saveDraft')}</Btn>}
        <Btn onClick={() => save(false)}>{t('ed.issue2')}</Btn></PageHead>
      {(noBiz || noCust) && <Card className="mb-4 bg-amber-50 text-sm">{noBiz && <p><Link className="underline" to="/business">{t('ed.needBusiness')}</Link></p>}{noCust && <p><Link className="underline" to="/customers/new">{t('ed.needCustomer')}</Link></p>}</Card>}
      {errs.length > 0 && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errs.map((e) => <div key={e}>{t(e)}</div>)}</div>}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card className="grid gap-3 sm:grid-cols-2">
            <Field label={t('ed.business')}><select className={inp} value={f.businessId} onChange={(e) => set({ businessId: e.target.value })}><option value="" />{businesses?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}{existing && !businesses?.some((b) => b.id === existing.doc.businessId) && <option value={existing.doc.businessId}>{existing.doc.businessSnapshot.name}</option>}</select></Field>
            <Field label={t('ed.customer')}><select className={inp} value={f.customerId} onChange={(e) => set({ customerId: e.target.value })}><option value="" />{customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}{existing && !customers?.some((c) => c.id === existing.doc.customerId) && <option value={existing.doc.customerId}>{existing.doc.customerSnapshot.name}</option>}</select></Field>
            <Field label={t('ed.issue')}><input type="date" className={inp} value={f.issueDate} onChange={(e) => set({ issueDate: e.target.value })} /></Field>
            <Field label={t(kind === 'invoice' ? 'ed.due' : 'ed.validUntil')}><input type="date" className={inp} value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></Field>
            <Field label={t('f.currency')}><select className={inp} value={f.currency} disabled={paidMinor > 0} onChange={(e) => set({ currency: e.target.value as 'USD' | 'KHR' })}><option>USD</option><option>KHR</option></select></Field>
            <Field label={t('ed.template')}><select className={inp} value={f.templateId} onChange={(e) => set({ templateId: e.target.value as TemplateId })}>{(['modern', 'classic', 'minimal', 'elegant', 'bold', 'fresh'] as const).map((x) => <option key={x} value={x}>{t(`tp.${x}` as Key)}</option>)}</select></Field>
            {kind === 'invoice' && <Field label={t('ed.paymentTerms')} className="sm:col-span-2"><input className={inp} value={f.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} /></Field>}
          </Card>
          <Card className="space-y-3">
            <h2 className="font-semibold">{t('ed.items')}</h2>
            {f.items.map((it, i) => (
              <div key={it.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <Field label={t('ed.desc')}><textarea rows={2} className={inp} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label={t('ed.qty')}><input inputMode="decimal" className={inp} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                  <Field label={t('ed.unit')}><input list="units" className={inp} value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} /></Field>
                  <Field label={t('ed.price')}><input inputMode="decimal" className={inp} value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} /></Field>
                  <Field label={t('ed.disc')}><div className="flex gap-1"><select aria-label={t('ed.disc')} className={`${inp} !w-20`} value={it.discType} onChange={(e) => setItem(i, { discType: e.target.value as EItem['discType'] })}><option value="none">–</option><option value="percent">%</option><option value="fixed">{f.currency === 'USD' ? '$' : '៛'}</option></select>{it.discType !== 'none' && <input inputMode="decimal" className={inp} value={it.discVal} onChange={(e) => setItem(i, { discVal: e.target.value })} />}</div></Field>
                  {showItemTax && <Field label={t('ed.taxRate')}><input inputMode="decimal" disabled={it.taxExempt} className={inp} value={it.taxRate} onChange={(e) => setItem(i, { taxRate: e.target.value })} /></Field>}
                  {f.taxScope !== 'none' && <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={it.taxExempt} onChange={(e) => setItem(i, { taxExempt: e.target.checked })} />{t('ed.exempt')}</label>}
                </div>
                <div className="flex justify-end gap-1">
                  <Btn variant="ghost" aria-label={t('ed.up')} onClick={() => move(i, -1)}><ArrowUp size={14} /></Btn><Btn variant="ghost" aria-label={t('ed.down')} onClick={() => move(i, 1)}><ArrowDown size={14} /></Btn>
                  <Btn variant="ghost" aria-label={t('common.remove')} onClick={() => set({ items: f.items.filter((_, j) => j !== i) })}><Trash2 size={14} /></Btn></div>
              </div>))}
            <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            <Btn variant="ghost" onClick={() => set({ items: [...f.items, blankItem()] })}><Plus size={16} />{t('ed.addItem')}</Btn>
          </Card>
          <Card className="grid gap-3 sm:grid-cols-2">
            <Field label={t('ed.docDiscount')}><div className="flex gap-1"><select aria-label={t('ed.docDiscount')} className={`${inp} !w-28`} value={f.discType} onChange={(e) => set({ discType: e.target.value as EForm['discType'] })}><option value="none">{t('common.none')}</option><option value="percent">{t('ed.percent')}</option><option value="fixed">{t('ed.fixed')}</option></select>{f.discType !== 'none' && <input inputMode="decimal" className={inp} value={f.discVal} onChange={(e) => set({ discVal: e.target.value })} />}</div></Field>
            <Field label={t('ed.taxScope')}><select className={inp} value={f.taxScope} onChange={(e) => set({ taxScope: e.target.value as EForm['taxScope'] })}><option value="none">{t('ed.scopeNone')}</option><option value="document">{t('ed.scopeDoc')}</option><option value="item">{t('ed.scopeItem')}</option></select></Field>
            {f.taxScope !== 'none' && <>
              <Field label={t('ed.taxMode')}><select className={inp} value={f.taxMode} onChange={(e) => set({ taxMode: e.target.value as EForm['taxMode'] })}><option value="exclusive">{t('ed.exclusive')}</option><option value="inclusive">{t('ed.inclusive')}</option></select></Field>
              {f.taxScope === 'document' && <Field label={t('ed.docTaxRate')}><input inputMode="decimal" className={inp} value={f.docTaxRate} onChange={(e) => set({ docTaxRate: e.target.value })} /></Field>}
              {f.taxMode === 'exclusive' && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.afterDisc} onChange={(e) => set({ afterDisc: e.target.checked })} />{t('ed.afterDisc')}</label>}
            </>}
            <Field label={t('f.notes')} className="sm:col-span-2"><textarea rows={2} className={inp} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
            <Field label={t('ed.terms')} className="sm:col-span-2"><textarea rows={2} className={inp} value={f.terms} onChange={(e) => set({ terms: e.target.value })} /></Field>
            <Field label={t('ed.footer')} className="sm:col-span-2"><input className={inp} value={f.footer} onChange={(e) => set({ footer: e.target.value })} /></Field>
          </Card>
        </div>
        <div><h2 className="mb-2 font-semibold">{t('ed.preview')}</h2><DocumentSheet m={{ ...model, number: model.number || t('ed.auto') }} template={f.templateId} /></div>
      </div>
    </>
  );
}
