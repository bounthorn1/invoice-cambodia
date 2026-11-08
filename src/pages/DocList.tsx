import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { invoiceRows, quotationRows, type Kind } from '../db/repo.ts';
import { formatMinor, type Currency } from '../lib/money.ts';
import { fmtDate } from '../lib/util.ts';
import { useT } from '../i18n/index.ts';
import { Btn, Card, PageHead, StatusBadge, inp } from '../components/ui.tsx';

interface Row { id: string; number: string; customer: string; business: string; date: string; due: string; currency: Currency; amount: number; balance?: number; status: string }
const PAGE = 20;
export default function DocList({ kind }: { kind: Kind }) {
  const t = useT();
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [cur, setCur] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest'); const [page, setPage] = useState(0);
  const rows = useLiveQuery(async (): Promise<Row[]> => kind === 'invoice'
    ? (await invoiceRows()).map((r) => ({ id: r.inv.id, number: r.inv.number, customer: r.inv.customerSnapshot.name, business: r.inv.businessSnapshot.name, date: r.inv.issueDate, due: r.inv.dueDate, currency: r.inv.currency, amount: r.calc.grandTotal, balance: r.balance, status: r.status }))
    : (await quotationRows()).map((r) => ({ id: r.q.id, number: r.q.number, customer: r.q.customerSnapshot.name, business: r.q.businessSnapshot.name, date: r.q.issueDate, due: r.q.validUntil, currency: r.q.currency, amount: r.calc.grandTotal, status: r.status })), [kind]);
  const statuses = kind === 'invoice' ? ['draft', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'] : ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = (rows ?? []).filter((x) => (!s || `${x.number} ${x.customer} ${x.business} ${x.date} ${x.status}`.toLowerCase().includes(s)) && (!status || x.status === status) && (!cur || x.currency === cur) && (!from || x.date >= from) && (!to || x.date <= to));
    return r.sort((a, b) => sort === 'highest' ? b.amount - a.amount : sort === 'oldest' ? a.date.localeCompare(b.date) || a.number.localeCompare(b.number) : b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  }, [rows, q, status, cur, from, to, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE)); const cur_ = Math.min(page, pages - 1);
  const f = (set: (v: string) => void) => (e: { target: { value: string } }) => { set(e.target.value); setPage(0); };
  return (
    <>
      <PageHead title={t(kind === 'invoice' ? 'nav.invoices' : 'nav.quotations')}><Link to={`/${kind}s/new`}><Btn><Plus size={16} />{t('common.new')}</Btn></Link></PageHead>
      <Card className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6 print:hidden">
        <input aria-label={t('common.search')} className={`${inp} lg:col-span-2`} placeholder={t('list.search')} value={q} onChange={f(setQ)} />
        <select aria-label={t('col.status')} className={inp} value={status} onChange={f(setStatus)}><option value="">{t('list.allStatus')}</option>{statuses.map((s) => <option key={s} value={s}>{t(`status.${s}` as never)}</option>)}</select>
        <select aria-label={t('f.currency')} className={inp} value={cur} onChange={f(setCur)}><option value="">{t('list.allCur')}</option><option>USD</option><option>KHR</option></select>
        <input aria-label={t('list.from')} type="date" className={inp} value={from} onChange={f(setFrom)} />
        <input aria-label={t('list.to')} type="date" className={inp} value={to} onChange={f(setTo)} />
        <select aria-label={t('list.sort')} className={inp} value={sort} onChange={f(setSort)}><option value="newest">{t('list.newest')}</option><option value="oldest">{t('list.oldest')}</option><option value="highest">{t('list.highest')}</option></select>
      </Card>
      <Card className="overflow-x-auto">
        {filtered.length === 0 ? <p className="py-6 text-center text-slate-500">{rows && rows.length ? t('list.noResults') : t('common.noData')}</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">{t('col.number')}</th><th className="p-2">{t('col.customer')}</th><th className="p-2">{t('col.date')}</th><th className="p-2">{t('col.due')}</th><th className="p-2 text-right">{t('col.amount')}</th>{kind === 'invoice' && <th className="p-2 text-right">{t('col.balance')}</th>}<th className="p-2">{t('col.status')}</th></tr></thead>
            <tbody>{filtered.slice(cur_ * PAGE, cur_ * PAGE + PAGE).map((r) => <tr key={r.id} className="border-t border-slate-100">
              <td className="p-2"><Link className="font-medium text-navy-600 underline" to={`/${kind}s/${r.id}`}>{r.number}</Link></td><td className="p-2">{r.customer}</td><td className="p-2">{fmtDate(r.date)}</td><td className="p-2">{fmtDate(r.due)}</td>
              <td className="p-2 text-right">{formatMinor(r.amount, r.currency)}</td>{kind === 'invoice' && <td className="p-2 text-right">{formatMinor(r.balance ?? 0, r.currency)}</td>}<td className="p-2"><StatusBadge status={r.status} /></td></tr>)}</tbody></table>)}
        {pages > 1 && <div className="mt-3 flex items-center justify-center gap-3 text-sm"><Btn variant="ghost" disabled={cur_ === 0} onClick={() => setPage(cur_ - 1)}>‹</Btn><span>{cur_ + 1} / {pages}</span><Btn variant="ghost" disabled={cur_ >= pages - 1} onClick={() => setPage(cur_ + 1)}>›</Btn></div>}
      </Card>
    </>
  );
}
