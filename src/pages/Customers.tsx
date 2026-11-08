import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { db, newId } from '../db/db.ts';
import { invoiceRows, quotationRows } from '../db/repo.ts';
import type { Customer } from '../db/types.ts';
import { formatMinor } from '../lib/money.ts';
import { fmtDate } from '../lib/util.ts';
import { useT, type Key } from '../i18n/index.ts';
import { Btn, Card, Field, PageHead, StatusBadge, confirmAction, inp, toast } from '../components/ui.tsx';

const FIELDS = ['email', 'phone', 'address', 'city', 'country', 'taxId'] as const;
function CustomerForm({ initial, onDone }: { initial?: Customer; onDone: (id?: string) => void }) {
  const t = useT();
  const [c, setC] = useState<Customer>(initial ?? { id: newId(), type: 'individual', name: '', createdAt: new Date().toISOString(), updatedAt: '' });
  const [err, setErr] = useState(false);
  const save = async () => {
    if (!c.name.trim()) { setErr(true); return; }
    try { await db.customers.put({ ...c, name: c.name.trim(), updatedAt: new Date().toISOString() }); toast(t('common.saved')); onDone(c.id); } catch { toast(t('err.storage'), true); }
  };
  return <Card className="grid gap-3 sm:grid-cols-2">
    <Field label={t('f.type')}><select className={inp} value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as Customer['type'] })}><option value="individual">{t('f.individual')}</option><option value="company">{t('f.company')}</option></select></Field>
    <Field label={t('f.name')}><input className={inp} aria-invalid={err} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />{err && <span role="alert" className="text-xs text-red-600">{t('err.name')}</span>}</Field>
    {c.type === 'company' && <Field label={t('f.companyName')}><input className={inp} value={c.companyName ?? ''} onChange={(e) => setC({ ...c, companyName: e.target.value })} /></Field>}
    {FIELDS.map((k) => <Field key={k} label={t(`f.${k}` as Key)}><input className={inp} value={c[k] ?? ''} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></Field>)}
    <Field label={t('f.notes')} className="sm:col-span-2"><textarea rows={2} className={inp} value={c.notes ?? ''} onChange={(e) => setC({ ...c, notes: e.target.value })} /></Field>
    <div className="flex gap-2 sm:col-span-2"><Btn onClick={save}>{t('common.save')}</Btn><Btn variant="ghost" onClick={() => onDone()}>{t('common.cancel')}</Btn></div></Card>;
}
export default function Customers() {
  const t = useT(); const nav = useNavigate(); const { id } = useParams();
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [edit, setEdit] = useState(false);
  const list = useLiveQuery(() => db.customers.orderBy('name').toArray(), []);
  const cust = useLiveQuery(() => (id && id !== 'new' ? db.customers.get(id) : undefined), [id]);
  const related = useLiveQuery(async () => id && id !== 'new' ? { inv: (await invoiceRows()).filter((r) => r.inv.customerId === id), quo: (await quotationRows()).filter((r) => r.q.customerId === id) } : null, [id]);
  if (id === 'new') return <><PageHead title={t('cu.add')} /><CustomerForm onDone={(n) => nav(n ? `/customers/${n}` : '/customers')} /></>;
  if (id) {
    if (list && !cust) return <Card>404 — <Link className="underline" to="/customers">{t('common.back')}</Link></Card>;
    if (!cust) return null;
    return <>
      <PageHead title={cust.name}><Btn variant="ghost" onClick={() => setEdit(!edit)}><Pencil size={16} />{t('common.edit')}</Btn>
        <Btn variant="danger" onClick={async () => { if (confirmAction(t('cu.confirmDelete'))) { await db.customers.delete(cust.id); toast(t('common.deleted')); nav('/customers'); } }}><Trash2 size={16} />{t('common.delete')}</Btn></PageHead>
      {edit ? <CustomerForm initial={cust} onDone={() => setEdit(false)} /> : <Card className="mb-4 text-sm"><div>{[cust.companyName, cust.address, cust.city, cust.country].filter(Boolean).join(', ')}</div><div>{[cust.phone, cust.email].filter(Boolean).join(' · ')}</div>{cust.taxId && <div>{t('f.taxId')}: {cust.taxId}</div>}{cust.notes && <div className="mt-2 text-slate-500">{cust.notes}</div>}</Card>}
      <Card><h2 className="mb-2 font-semibold">{t('cu.related')}</h2>
        {!related || (related.inv.length + related.quo.length === 0) ? <p className="text-sm text-slate-500">{t('cu.noDocs')}</p> : <ul className="divide-y divide-slate-100 text-sm">
          {related.inv.map((r) => <li key={r.inv.id} className="flex justify-between py-2"><Link className="text-navy-600 underline" to={`/invoices/${r.inv.id}`}>{r.inv.number}</Link><span>{fmtDate(r.inv.issueDate)} · {formatMinor(r.calc.grandTotal, r.inv.currency)} <StatusBadge status={r.status} /></span></li>)}
          {related.quo.map((r) => <li key={r.q.id} className="flex justify-between py-2"><Link className="text-navy-600 underline" to={`/quotations/${r.q.id}`}>{r.q.number}</Link><span>{fmtDate(r.q.issueDate)} · {formatMinor(r.calc.grandTotal, r.q.currency)} <StatusBadge status={r.status} /></span></li>)}</ul>}</Card></>;
  }
  const s = q.trim().toLowerCase();
  const rows = (list ?? []).filter((c) => (!type || c.type === type) && (!s || `${c.name} ${c.companyName ?? ''} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(s)));
  return <>
    <PageHead title={t('nav.customers')}><Link to="/customers/new"><Btn><Plus size={16} />{t('cu.add')}</Btn></Link></PageHead>
    <Card className="mb-4 grid gap-2 sm:grid-cols-3"><input aria-label={t('cu.search')} className={`${inp} sm:col-span-2`} placeholder={t('cu.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label={t('f.type')} className={inp} value={type} onChange={(e) => setType(e.target.value)}><option value="">{t('common.all')}</option><option value="individual">{t('f.individual')}</option><option value="company">{t('f.company')}</option></select></Card>
    <Card className="overflow-x-auto">{rows.length === 0 ? <p className="py-6 text-center text-slate-500">{t('common.noData')}</p> : <table className="w-full text-sm"><tbody>{rows.map((c) => <tr key={c.id} className="border-t border-slate-100 first:border-0"><td className="p-2"><Link className="font-medium text-navy-600 underline" to={`/customers/${c.id}`}>{c.name}</Link></td><td className="p-2">{c.companyName}</td><td className="p-2">{c.phone}</td><td className="p-2">{c.email}</td></tr>)}</tbody></table>}</Card></>;
}
