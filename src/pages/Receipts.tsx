import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Printer } from 'lucide-react';
import { db } from '../db/db.ts';
import { invoiceRow } from '../db/repo.ts';
import { formatMinor } from '../lib/money.ts';
import { downloadPdf, fmtDate } from '../lib/util.ts';
import { useT } from '../i18n/index.ts';
import { Btn, Card, PageHead, toast } from '../components/ui.tsx';
import { DocumentSheet, modelFromReceipt } from '../templates/DocumentSheet.tsx';

export default function Receipts() {
  const t = useT(); const { id } = useParams();
  const list = useLiveQuery(async () => {
    const [recs, pays] = await Promise.all([db.receipts.toArray(), db.payments.toArray()]);
    const pm = new Map(pays.map((p) => [p.id, p]));
    return recs.flatMap((r) => { const p = pm.get(r.paymentId); return p ? [{ r, p }] : []; }).sort((a, b) => b.p.date.localeCompare(a.p.date) || b.r.number.localeCompare(a.r.number));
  }, []);
  const one = useLiveQuery(async () => {
    if (!id) return null;
    const r = await db.receipts.get(id); const p = r && (await db.payments.get(r.paymentId));
    if (!r || !p) return false;
    const row = await invoiceRow(r.invoiceId);
    const before = row ? row.payments.filter((x) => x.date < p.date || (x.date === p.date && x.createdAt <= p.createdAt)).reduce((a, x) => a + x.amountMinor, 0) : 0;
    return { r, p, inv: row?.inv, after: row ? row.calc.grandTotal - before : 0 };
  }, [id]);
  if (id) {
    if (one === undefined) return null;
    if (!one) return <Card>404 — <Link className="underline" to="/receipts">{t('common.back')}</Link></Card>;
    return <>
      <PageHead title={`${t('doc.receipt')} ${one.r.number}`}>
        <Btn variant="ghost" onClick={() => window.print()}><Printer size={16} />{t('common.print')}</Btn>
        <Btn variant="ghost" onClick={() => downloadPdf(document.getElementById('doc-sheet')!, `${one.r.number}.pdf`).catch(() => toast(t('err.generic'), true))}><Download size={16} />{t('common.pdf')}</Btn></PageHead>
      <DocumentSheet m={modelFromReceipt(one.r, one.p, one.inv, one.after)} template={one.inv?.templateId ?? 'modern'} /></>;
  }
  return <>
    <PageHead title={t('rc.title')} />
    <Card className="overflow-x-auto">{!list?.length ? <p className="py-6 text-center text-slate-500">{t('common.noData')}</p> : (
      <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">{t('col.number')}</th><th className="p-2">{t('col.customer')}</th><th className="p-2">{t('col.date')}</th><th className="p-2 text-right">{t('col.amount')}</th></tr></thead>
        <tbody>{list.map(({ r, p }) => <tr key={r.id} className="border-t border-slate-100"><td className="p-2"><Link className="font-medium text-navy-600 underline" to={`/receipts/${r.id}`}>{r.number}</Link></td><td className="p-2">{r.customerSnapshot.name}</td><td className="p-2">{fmtDate(p.date)}</td><td className="p-2 text-right">{formatMinor(p.amountMinor, p.currency)}</td></tr>)}</tbody></table>)}</Card></>;
}
