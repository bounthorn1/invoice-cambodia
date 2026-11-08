import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { Copy, Download, FilePlus2, Pencil, Printer, Trash2, XCircle } from 'lucide-react';
import { convertQuotation, deleteDoc, deletePayment, duplicateDoc, invoiceRow, quotationRow, recordPayment, setInvoiceStatus, setQuotationStatus, type Kind } from '../db/repo.ts';
import type { Payment, PaymentMethod, QuotationStatus } from '../db/types.ts';
import { db } from '../db/db.ts';
import { formatMinor, parseMajorToMinor } from '../lib/money.ts';
import { downloadPdf, fmtDate, today } from '../lib/util.ts';
import { useT, type Key } from '../i18n/index.ts';
import { Btn, Card, Field, PageHead, StatusBadge, confirmAction, inp, toast } from '../components/ui.tsx';
import { DocumentSheet, modelFromDoc } from '../templates/DocumentSheet.tsx';
import DocEditor from './DocEditor.tsx';

const METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'aba', 'acleda', 'wing', 'other'];
export default function DocPage({ kind }: { kind: Kind }) {
  const t = useT(); const nav = useNavigate(); const { id } = useParams(); const [sp] = useSearchParams();
  const [form, setForm] = useState({ date: today(), amount: '', method: 'cash' as PaymentMethod, reference: '' });
  const isNew = id === 'new';
  const row = useLiveQuery(async () => (isNew || !id ? null : kind === 'invoice' ? (await invoiceRow(id)) ?? false : (await quotationRow(id)) ?? false), [id, kind]);
  if (isNew) return <DocEditor kind={kind} />;
  if (row === undefined) return null;
  if (row === null || row === false) return <Card>404 — <Link className="underline" to={`/${kind}s`}>{t('common.back')}</Link></Card>;
  const inv = 'inv' in row ? row : null; const quo = 'q' in row ? row : null;
  const doc = inv ? inv.inv : quo!.q; const items = row.items; const status = inv ? inv.status : quo!.status;
  if (sp.get('edit')) return <DocEditor kind={kind} existing={{ doc, items }} paidMinor={inv?.paid ?? 0} />;
  const model = modelFromDoc(kind, doc, items, inv?.payments);
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (e) { toast(t(e instanceof Error && e.message === 'converted' ? 'err.converted' : 'err.generic'), true); } };
  const pay = () => run(async () => {
    const m = parseMajorToMinor(form.amount, doc.currency);
    if (m === null) { toast(t('err.payment'), true); return; }
    try { await recordPayment(doc.id, { date: form.date, amountMinor: m, method: form.method, reference: form.reference }); setForm({ ...form, amount: '', reference: '' }); toast(t('common.saved')); }
    catch (e) { const c = e instanceof Error ? e.message : ''; toast(t(c === 'exceeds_balance' ? 'validation.overpayment' : c === 'not_positive' ? 'validation.positive' : 'err.payment'), true); }
  });
  const canPay = inv && inv.status !== 'cancelled' && inv.status !== 'draft' && inv.balance > 0;
  return (
    <>
      <PageHead title={`${t(kind === 'invoice' ? 'doc.invoice' : 'doc.quotation')} ${doc.number}`}>
        <StatusBadge status={status} />
        {status !== 'cancelled' && status !== 'converted' && <Link to="?edit=1"><Btn variant="ghost"><Pencil size={16} />{t('v.edit')}</Btn></Link>}
        <Btn variant="ghost" onClick={() => window.print()}><Printer size={16} />{t('common.print')}</Btn>
        <Btn variant="ghost" onClick={() => run(() => downloadPdf(document.getElementById('doc-sheet')!, `${doc.number}.pdf`))}><Download size={16} />{t('common.pdf')}</Btn>
        <Btn variant="ghost" onClick={() => run(async () => { const n = await duplicateDoc(kind, doc.id); nav(`/${kind}s/${n}`); })}><Copy size={16} />{t('common.duplicate')}</Btn>
        {inv && inv.inv.status === 'draft' && <Btn onClick={() => run(() => setInvoiceStatus(doc.id, 'unpaid'))}>{t('v.issue')}</Btn>}
        {inv && inv.status !== 'cancelled' && <Btn variant="ghost" onClick={() => confirmAction(t('v.confirmCancel')) && run(() => setInvoiceStatus(doc.id, 'cancelled'))}><XCircle size={16} />{t('v.cancelInv')}</Btn>}
        {quo && quo.q.status !== 'converted' && <Btn onClick={() => run(async () => { const n = await convertQuotation(doc.id); toast(t('common.saved')); nav(`/invoices/${n}`); })}><FilePlus2 size={16} />{t('v.convert')}</Btn>}
        <Btn variant="danger" onClick={() => confirmAction(t('v.confirmDelInv')) && run(async () => { await deleteDoc(kind, doc.id); toast(t('common.deleted')); nav(`/${kind}s`); })}><Trash2 size={16} />{t('common.delete')}</Btn>
      </PageHead>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm print:hidden">
        {quo && quo.q.status !== 'converted' && <label className="flex items-center gap-2">{t('v.status')}<select className={`${inp} !w-auto`} value={quo.q.status} onChange={(e) => run(() => setQuotationStatus(doc.id, e.target.value as QuotationStatus))}>{(['draft', 'sent', 'accepted', 'rejected'] as const).map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</select></label>}
        {quo?.q.convertedInvoiceId && <Link className="underline" to={`/invoices/${quo.q.convertedInvoiceId}`}>{t('v.converted')} →</Link>}
        {inv?.inv.sourceQuotationId && <Link className="underline" to={`/quotations/${inv.inv.sourceQuotationId}`}>{t('v.source')} →</Link>}
      </div>
      <DocumentSheet m={model} template={doc.templateId} />
      {inv && (
        <Card className="mt-4 print:hidden">
          <h2 className="mb-3 font-semibold">{t('v.payments')} · {t('v.balance')}: {formatMinor(inv.balance, doc.currency)}</h2>
          {inv.payments.length === 0 ? <p className="text-sm text-slate-500">{t('v.noPayments')}</p> : (
            <ul className="mb-3 divide-y divide-slate-100 text-sm">{[...inv.payments].sort((a, b) => a.date.localeCompare(b.date)).map((p) => <PayRow key={p.id} p={p} cur={doc.currency} onDelete={() => confirmAction(t('v.confirmPayDel')) && run(() => deletePayment(p.id))} />)}</ul>)}
          {canPay && (
            <div className="grid gap-2 sm:grid-cols-5">
              <Field label={t('v.date')}><input type="date" className={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label={t('v.amount')}><div className="flex gap-1"><input inputMode="decimal" className={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /><Btn variant="ghost" onClick={() => setForm({ ...form, amount: (inv.balance / 10 ** (doc.currency === 'USD' ? 2 : 0)).toFixed(doc.currency === 'USD' ? 2 : 0) })}>{t('v.max')}</Btn></div></Field>
              <Field label={t('v.method')}><select className={inp} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>{METHODS.map((m) => <option key={m} value={m}>{t(`pm.${m}` as Key)}</option>)}</select></Field>
              <Field label={t('v.reference')}><input className={inp} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
              <div className="flex items-end"><Btn onClick={pay}>{t('v.record')}</Btn></div>
            </div>)}
        </Card>)}
    </>
  );
}
function PayRow({ p, cur, onDelete }: { p: Payment; cur: 'USD' | 'KHR'; onDelete: () => void }) {
  const t = useT();
  const rec = useLiveQuery(() => db.receipts.where('paymentId').equals(p.id).first(), [p.id]);
  return <li className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{fmtDate(p.date)} · {t(`pm.${p.method}` as Key)}{p.reference ? ` · ${p.reference}` : ''}</span>
    <span className="flex items-center gap-2"><b>{formatMinor(p.amountMinor, cur)}</b>{rec && <Link className="text-navy-600 underline" to={`/receipts/${rec.id}`}>{rec.number}</Link>}
      <Btn variant="ghost" aria-label={t('common.delete')} onClick={onDelete}><Trash2 size={14} /></Btn></span></li>;
}
