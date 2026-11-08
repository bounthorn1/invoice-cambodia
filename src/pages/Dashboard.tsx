import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { invoiceRows, quotationRows } from '../db/repo.ts';
import { countsTowardTotals } from '../lib/payments.ts';
import { formatMinor, type Currency } from '../lib/money.ts';
import { fmtDate } from '../lib/util.ts';
import { useT, type Key } from '../i18n/index.ts';
import { Btn, Card, PageHead, StatusBadge, inp } from '../components/ui.tsx';

export default function Dashboard() {
  const t = useT(); const [cur, setCur] = useState<Currency>('USD');
  const d = useLiveQuery(async () => ({ inv: await invoiceRows(), quo: await quotationRows(), biz: await db.businessProfiles.count() }), []);
  if (!d) return null;
  const counted = d.inv.filter((r) => countsTowardTotals(r.status));
  const sums = (c: Currency) => ({ rev: counted.filter((r) => r.inv.currency === c).reduce((a, r) => a + r.paid, 0), out: counted.filter((r) => r.inv.currency === c).reduce((a, r) => a + Math.max(r.balance, 0), 0) });
  const n = (s: string[]) => d.inv.filter((r) => s.includes(r.status)).length;
  const payments = d.inv.flatMap((r) => r.payments.map((p) => ({ p, r }))).sort((a, b) => b.p.date.localeCompare(a.p.date)).slice(0, 5);
  const months = Array.from({ length: 6 }, (_, i) => { const x = new Date(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() - (5 - i)); return x.toISOString().slice(0, 7); });
  const rev = months.map((m) => counted.flatMap((r) => r.payments).filter((p) => p.currency === cur && p.date.startsWith(m)).reduce((a, p) => a + p.amountMinor, 0));
  const max = Math.max(...rev, 1);
  const statuses = ['draft', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'];
  const empty = d.inv.length + d.quo.length === 0;
  const Stat = ({ k, v }: { k: Key; v: string | number }) => <Card><div className="text-sm text-slate-500">{t(k)}</div><div className="mt-1 text-2xl font-semibold text-navy-800">{v}</div></Card>;
  return <>
    <PageHead title={t('nav.dashboard')}><Link to="/invoices/new"><Btn>{t('ed.title.invoice')} +</Btn></Link><Link to="/quotations/new"><Btn variant="ghost">{t('ed.title.quotation')} +</Btn></Link></PageHead>
    {(empty || d.biz === 0) && <Card className="mb-4 bg-navy-50"><h2 className="font-semibold text-navy-800">{t('dash.emptyTitle')}</h2><p className="mt-1 text-sm">{t('dash.emptyBody')}</p>
      <div className="mt-3 flex flex-wrap gap-2"><Link to="/business"><Btn>1 · {t('bz.title')}</Btn></Link><Link to="/customers/new"><Btn variant="ghost">2 · {t('cu.add')}</Btn></Link></div></Card>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat k="dash.invoices" v={d.inv.length} /><Stat k="dash.quotations" v={d.quo.length} /><Stat k="dash.paid" v={n(['paid'])} /><Stat k="dash.unpaid" v={n(['unpaid', 'partially_paid', 'overdue'])} />
      <Stat k="dash.overdue" v={n(['overdue'])} />
      {(['USD', 'KHR'] as const).map((c) => <Card key={c} className="col-span-2 lg:col-span-1"><div className="text-sm text-slate-500">{t('dash.revenue')} · {c}</div><div className="text-xl font-semibold text-navy-800">{formatMinor(sums(c).rev, c)}</div><div className="mt-1 text-sm text-slate-500">{t('dash.outstanding')}: {formatMinor(sums(c).out, c)}</div></Card>)}
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{t('dash.monthly')}</h2><select aria-label={t('f.currency')} className={`${inp} !w-24`} value={cur} onChange={(e) => setCur(e.target.value as Currency)}><option>USD</option><option>KHR</option></select></div>
        <div className="flex h-40 items-end gap-2" role="img" aria-label={t('dash.monthly')}>{rev.map((v, i) => <div key={months[i]} className="flex flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t bg-navy-500" title={formatMinor(v, cur)} style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 1 }} /><span className="text-[10px] text-slate-500">{months[i]!.slice(5)}</span></div>)}</div></Card>
      <Card><h2 className="mb-3 font-semibold">{t('dash.statusChart')}</h2><div className="space-y-2">{statuses.map((s) => { const c = n([s]); return <div key={s} className="flex items-center gap-2 text-sm"><span className="w-28 shrink-0">{t(`status.${s}` as Key)}</span><div className="h-3 flex-1 rounded bg-slate-100"><div className="h-3 rounded bg-navy-500" style={{ width: `${d.inv.length ? (c / d.inv.length) * 100 : 0}%` }} /></div><span className="w-6 text-right">{c}</span></div>; })}</div></Card>
      <Card><h2 className="mb-2 font-semibold">{t('dash.recentInv')}</h2><ul className="divide-y divide-slate-100 text-sm">{[...d.inv].sort((a, b) => b.inv.createdAt.localeCompare(a.inv.createdAt)).slice(0, 5).map((r) => <li key={r.inv.id} className="flex items-center justify-between py-2"><Link className="text-navy-600 underline" to={`/invoices/${r.inv.id}`}>{r.inv.number}</Link><span>{formatMinor(r.calc.grandTotal, r.inv.currency)} <StatusBadge status={r.status} /></span></li>)}</ul></Card>
      <Card><h2 className="mb-2 font-semibold">{t('dash.recentQuo')}</h2><ul className="divide-y divide-slate-100 text-sm">{[...d.quo].sort((a, b) => b.q.createdAt.localeCompare(a.q.createdAt)).slice(0, 5).map((r) => <li key={r.q.id} className="flex items-center justify-between py-2"><Link className="text-navy-600 underline" to={`/quotations/${r.q.id}`}>{r.q.number}</Link><span>{formatMinor(r.calc.grandTotal, r.q.currency)} <StatusBadge status={r.status} /></span></li>)}</ul></Card>
      <Card className="lg:col-span-2"><h2 className="mb-2 font-semibold">{t('dash.recentPay')}</h2><ul className="divide-y divide-slate-100 text-sm">{payments.map(({ p, r }) => <li key={p.id} className="flex justify-between py-2"><span>{fmtDate(p.date)} · {r.inv.number} · {r.inv.customerSnapshot.name}</span><b>{formatMinor(p.amountMinor, p.currency)}</b></li>)}</ul></Card>
    </div></>;
}
