import type { BusinessProfile, Customer, DocItem, Invoice, Payment, Quotation, Receipt, TemplateId } from '../db/types.ts';
import { formatMinor, type Currency } from '../lib/money.ts';
import { calculateDocument, type DocumentResult, type TaxMode } from '../lib/calc.ts';
import { docInput } from '../db/repo.ts';
import { fmtDate } from '../lib/util.ts';
import { useLang, translate, type Key } from '../i18n/index.ts';

export interface SheetModel {
  kind: 'invoice' | 'quotation' | 'receipt'; number: string; issueDate: string; dueDate?: string;
  business: BusinessProfile; customer: Customer; currency: Currency; taxMode: TaxMode;
  rows: { desc: string; qty: string; unit: string; price: number; amount: number }[]; calc?: DocumentResult;
  paid?: number; balance?: number; notes?: string; terms?: string; footer?: string; paymentTerms?: string;
  receipt?: { date: string; amount: number; method: string; reference?: string; invoiceNumber: string; balanceAfter: number };
}
const qtyStr = (m: number) => String(m / 1000);
export function modelFromDoc(kind: 'invoice' | 'quotation', d: Invoice | Quotation, items: DocItem[], payments: Payment[] = []): SheetModel {
  const calc = calculateDocument(docInput(d, items));
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const paid = payments.reduce((a, p) => a + p.amountMinor, 0);
  return {
    kind, number: d.number, issueDate: d.issueDate, dueDate: 'dueDate' in d ? d.dueDate : d.validUntil, business: d.businessSnapshot, customer: d.customerSnapshot,
    currency: d.currency, taxMode: d.taxMode, calc, notes: d.notes, terms: d.terms, footer: d.footer, paymentTerms: 'paymentTerms' in d ? d.paymentTerms : undefined,
    rows: sorted.map((i, k) => ({ desc: i.description, qty: qtyStr(i.quantityMilli), unit: i.unit, price: i.unitPriceMinor, amount: calc.lines[k]?.net ?? 0 })),
    paid: kind === 'invoice' ? paid : undefined, balance: kind === 'invoice' ? calc.grandTotal - paid : undefined,
  };
}
export function modelFromReceipt(r: Receipt, p: Payment, inv: Invoice | undefined, balanceAfter: number): SheetModel {
  return {
    kind: 'receipt', number: r.number, issueDate: p.date, business: r.businessSnapshot, customer: r.customerSnapshot, currency: p.currency, taxMode: 'exclusive', rows: [],
    footer: inv?.footer, receipt: { date: p.date, amount: p.amountMinor, method: p.method, reference: p.reference, invoiceNumber: inv?.number ?? '', balanceAfter },
  };
}

const ST: Record<TemplateId, Record<string, string>> = {
  modern: { root: 'font-sans', head: 'mb-6 -mx-[14mm] -mt-[14mm] flex items-start justify-between bg-navy-800 px-[14mm] py-6 text-white', title: 'text-2xl font-semibold tracking-wide', th: 'bg-navy-50 text-navy-800 text-left', td: 'border-b border-slate-200', total: 'text-navy-800 text-base font-semibold', label: 'text-navy-600 font-semibold uppercase text-[10px]', hr: 'border-slate-200' },
  classic: { root: 'font-serif', head: 'mb-6 flex items-start justify-between border-b-4 border-double border-slate-800 pb-4', title: 'text-2xl font-bold uppercase tracking-widest', th: 'border border-slate-800 bg-slate-100 text-left', td: 'border border-slate-400', total: 'text-base font-bold', label: 'font-bold uppercase text-[10px]', hr: 'border-slate-800' },
  minimal: { root: 'font-sans text-[11px]', head: 'mb-6 flex items-start justify-between', title: 'text-lg font-medium uppercase tracking-[0.2em]', th: 'border-b border-black text-left font-medium', td: 'border-b border-slate-200', total: 'text-sm font-semibold', label: 'text-slate-500 uppercase text-[10px]', hr: 'border-black' },
  elegant: { root: 'font-serif [print-color-adjust:exact] [-webkit-print-color-adjust:exact]', head: 'mb-6 flex items-start justify-between border-b-2 border-gold-500 pb-4', title: 'text-3xl font-light uppercase tracking-[0.18em] text-gold-800', th: 'border-y border-gold-500 bg-gold-100/60 text-left text-gold-800', td: 'border-b border-gold-100', total: 'text-base font-semibold text-gold-800', label: 'font-semibold uppercase text-[10px] text-gold-800', hr: 'border-gold-500' },
  bold: { root: 'font-sans [print-color-adjust:exact] [-webkit-print-color-adjust:exact]', head: 'mb-6 -mx-[14mm] -mt-[14mm] flex items-start justify-between border-b-8 border-gold-400 bg-slate-900 px-[14mm] py-7 text-white', title: 'text-3xl font-semibold uppercase tracking-wider text-gold-400', th: 'bg-slate-900 text-left text-white', td: 'border-b border-slate-300', total: 'text-lg font-semibold text-slate-900', label: 'font-semibold uppercase text-[10px] text-slate-900', hr: 'border-slate-900' },
  fresh: { root: 'font-sans [print-color-adjust:exact] [-webkit-print-color-adjust:exact]', head: 'mb-6 flex items-start justify-between rounded-xl bg-emerald-50 p-5 text-emerald-950', title: 'text-2xl font-semibold text-emerald-700', th: 'bg-emerald-700 text-left text-white', td: 'border-b border-emerald-100', total: 'text-base font-semibold text-emerald-700', label: 'font-semibold uppercase text-[10px] text-emerald-700', hr: 'border-emerald-600' },
};

export function DocumentSheet({ m, template }: { m: SheetModel; template: TemplateId }) {
  const lang = useLang((s) => s.lang);
  const t = (k: Key) => translate(lang, k);
  const s = ST[template];
  const money = (n: number) => formatMinor(n, m.currency);
  const b = m.business, c = m.customer;
  const title = m.kind === 'invoice' ? t('doc.invoice') : m.kind === 'quotation' ? t('doc.quotation') : t('doc.receipt');
  const bankLine = [b.bankName, b.bankAccountName, b.bankAccountNumber].filter(Boolean).join(' · ');
  const cl = m.calc;
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div id="doc-sheet" className={`print-area mx-auto min-h-[297mm] w-[210mm] bg-white p-[14mm] text-[12px] leading-relaxed text-slate-800 shadow-card print:w-full print:shadow-none ${s.root}`}>
        <div className={s.head}>
          <div className="flex items-start gap-3">
            {b.logoDataUrl && <img src={b.logoDataUrl} alt="" className="max-h-16 max-w-[40mm] object-contain" />}
            <div><div className="text-base font-semibold">{b.name || '—'}</div>{b.legalName && <div>{b.legalName}</div>}
              <div className="whitespace-pre-line opacity-90">{[b.address, b.city, b.country].filter(Boolean).join(', ')}</div>
              <div className="opacity-90">{[b.phone, b.email, b.website].filter(Boolean).join(' · ')}</div>
              {b.taxId && <div className="opacity-90">{t('doc.taxId')}: {b.taxId}</div>}</div>
          </div>
          <div className="text-right"><div className={s.title}>{title}</div><div className="font-semibold">{m.number}</div></div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-6">
          <div><div className={s.label}>{m.kind === 'receipt' ? t('doc.receivedFrom') : t('doc.billTo')}</div>
            <div className="font-semibold">{c.name || '—'}</div>{c.companyName && <div>{c.companyName}</div>}
            <div>{[c.address, c.city, c.country].filter(Boolean).join(', ')}</div><div>{[c.phone, c.email].filter(Boolean).join(' · ')}</div>{c.taxId && <div>{t('doc.taxId')}: {c.taxId}</div>}</div>
          <div className="text-right">
            <div><span className={s.label}>{m.kind === 'receipt' ? t('doc.paymentDate') : t('doc.issueDate')}</span> {fmtDate(m.issueDate)}</div>
            {m.dueDate && <div><span className={s.label}>{m.kind === 'quotation' ? t('doc.validUntil') : t('doc.dueDate')}</span> {fmtDate(m.dueDate)}</div>}
            {m.paymentTerms && <div>{m.paymentTerms}</div>}
          </div>
        </div>
        {m.receipt ? (
          <table className="mb-5 w-full border-collapse"><tbody>
            {([['doc.paymentFor', m.receipt.invoiceNumber], ['doc.method', t(`pm.${m.receipt.method}` as Key)], ['doc.reference', m.receipt.reference ?? '—'], ['doc.paymentDate', fmtDate(m.receipt.date)], ['doc.balanceAfter', money(m.receipt.balanceAfter)]] as [Key, string][]).map(([k, v]) =>
              <tr key={k}><td className={`${s.td} w-1/2 p-2`}>{t(k)}</td><td className={`${s.td} p-2 text-right`}>{v}</td></tr>)}
            <tr><td className="p-2 font-semibold">{t('doc.amountReceived')}</td><td className={`p-2 text-right ${s.total}`}>{money(m.receipt.amount)}</td></tr>
          </tbody></table>
        ) : (
          <>
            <table className="w-full border-collapse"><thead style={{ display: 'table-header-group' }}><tr>
              <th className={`${s.th} w-8 p-2`}>#</th><th className={`${s.th} p-2`}>{t('doc.description')}</th><th className={`${s.th} p-2 text-right`}>{t('doc.qty')}</th>
              <th className={`${s.th} p-2 text-right`}>{t('doc.unitPrice')}</th><th className={`${s.th} p-2 text-right`}>{t('doc.amount')}</th></tr></thead>
              <tbody>{m.rows.map((r, i) => <tr key={i} style={{ breakInside: 'avoid' }}><td className={`${s.td} p-2`}>{i + 1}</td>
                <td className={`${s.td} whitespace-pre-line break-words p-2`}>{r.desc}</td><td className={`${s.td} p-2 text-right`}>{r.qty} {r.unit}</td>
                <td className={`${s.td} p-2 text-right`}>{money(r.price)}</td><td className={`${s.td} p-2 text-right`}>{money(r.amount)}</td></tr>)}</tbody></table>
            {cl && <div className="mt-4 ml-auto w-[80mm] break-inside-avoid space-y-1">
              <div className="flex justify-between"><span>{t('doc.subtotal')}</span><span>{money(cl.subtotal)}</span></div>
              {cl.discountTotal > 0 && <div className="flex justify-between"><span>{t('doc.discountLine')}</span><span>-{money(cl.discountTotal)}</span></div>}
              {cl.taxBreakdown.map((r) => <div key={r.rateBps} className="flex justify-between"><span>{t('doc.tax')} {r.rateBps / 100}%{m.taxMode === 'inclusive' ? ` (${t('doc.taxIncl')})` : ''}</span><span>{money(r.tax)}</span></div>)}
              <div className={`flex justify-between border-t pt-1 ${s.hr} ${s.total}`}><span>{t('doc.total')}</span><span>{money(cl.grandTotal)}</span></div>
              {m.paid !== undefined && m.paid > 0 && <div className="flex justify-between"><span>{t('doc.amountPaid')}</span><span>{money(m.paid)}</span></div>}
              {m.balance !== undefined && <div className="flex justify-between font-semibold"><span>{t('doc.balanceDue')}</span><span>{money(m.balance)}</span></div>}
            </div>}
          </>
        )}
        {m.kind !== 'receipt' && (bankLine || b.paymentInstructions) && <div className="mt-6 break-inside-avoid"><div className={s.label}>{t('doc.bank')}</div><div>{bankLine}</div><div className="whitespace-pre-line">{b.paymentInstructions}</div></div>}
        {m.notes && <div className="mt-4 break-inside-avoid"><div className={s.label}>{t('doc.notes')}</div><div className="whitespace-pre-line">{m.notes}</div></div>}
        {m.terms && <div className="mt-4 break-inside-avoid"><div className={s.label}>{t('doc.terms')}</div><div className="whitespace-pre-line">{m.terms}</div></div>}
        <div className={`mt-8 border-t pt-2 text-center text-[10px] text-slate-500 ${s.hr}`}>{m.footer || t('doc.generated')}</div>
      </div>
    </div>
  );
}
