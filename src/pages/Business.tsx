import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { db, newId } from '../db/db.ts';
import type { BusinessProfile } from '../db/types.ts';
import { processLogo } from '../lib/util.ts';
import { useT, type Key } from '../i18n/index.ts';
import { Btn, Card, Field, PageHead, confirmAction, inp, toast } from '../components/ui.tsx';

const TXT = ['legalName', 'email', 'phone', 'website', 'address', 'city', 'country', 'taxId', 'bankName', 'bankAccountName', 'bankAccountNumber'] as const;
const LABEL: Record<(typeof TXT)[number], Key> = { legalName: 'f.legalName', email: 'f.email', phone: 'f.phone', website: 'f.website', address: 'f.address', city: 'f.city', country: 'f.country', taxId: 'f.taxId', bankName: 'f.bankName', bankAccountName: 'f.bankAccName', bankAccountNumber: 'f.bankAccNo' };
const blank = (): BusinessProfile => ({ id: newId(), name: '', defaultCurrency: 'USD', defaultLanguage: 'km', country: 'Cambodia', createdAt: new Date().toISOString(), updatedAt: '' });

function Form({ initial, onDone }: { initial: BusinessProfile; onDone: () => void }) {
  const t = useT(); const [b, setB] = useState(initial); const [err, setErr] = useState('');
  const onLogo = async (file?: File) => { if (!file) return; try { setB({ ...b, logoDataUrl: await processLogo(file) }); setErr(''); } catch { setErr(t('err.image')); } };
  const save = async () => {
    if (!b.name.trim()) { setErr(t('err.name')); return; }
    if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) { setErr(t('f.email')); return; }
    try { await db.businessProfiles.put({ ...b, name: b.name.trim(), updatedAt: new Date().toISOString() }); toast(t('common.saved')); onDone(); } catch { toast(t('err.storage'), true); }
  };
  return <Card className="mb-4 grid gap-3 sm:grid-cols-2">
    {err && <div role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</div>}
    <Field label={t('f.name')}><input className={inp} value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
    {TXT.map((k) => <Field key={k} label={t(LABEL[k])}><input className={inp} value={b[k] ?? ''} onChange={(e) => setB({ ...b, [k]: e.target.value })} /></Field>)}
    <Field label={t('f.currency')}><select className={inp} value={b.defaultCurrency} onChange={(e) => setB({ ...b, defaultCurrency: e.target.value as 'USD' | 'KHR' })}><option>USD</option><option>KHR</option></select></Field>
    <Field label={t('f.language')}><select className={inp} value={b.defaultLanguage} onChange={(e) => setB({ ...b, defaultLanguage: e.target.value as 'km' | 'en' })}><option value="km">ខ្មែរ</option><option value="en">English</option></select></Field>
    <Field label={t('f.payInstr')} className="sm:col-span-2"><textarea rows={2} className={inp} value={b.paymentInstructions ?? ''} onChange={(e) => setB({ ...b, paymentInstructions: e.target.value })} /></Field>
    <div className="sm:col-span-2"><div className="mb-1 text-sm font-medium text-slate-600">{t('f.logo')}</div>
      <div className="flex flex-wrap items-center gap-3">{b.logoDataUrl && <img src={b.logoDataUrl} alt="" className="h-14 rounded border border-slate-200 object-contain p-1" />}
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">{t('f.upload')}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { void onLogo(e.target.files?.[0]); e.target.value = ''; }} /></label>
        {b.logoDataUrl && <Btn variant="ghost" onClick={() => setB({ ...b, logoDataUrl: undefined })}>{t('bz.removeLogo')}</Btn>}</div></div>
    <div className="flex gap-2 sm:col-span-2"><Btn onClick={save}>{t('common.save')}</Btn><Btn variant="ghost" onClick={onDone}>{t('common.cancel')}</Btn></div></Card>;
}
export default function Business() {
  const t = useT(); const list = useLiveQuery(() => db.businessProfiles.toArray(), []); const [edit, setEdit] = useState<BusinessProfile | null>(null);
  return <>
    <PageHead title={t('bz.title')}><Btn onClick={() => setEdit(blank())}><Plus size={16} />{t('bz.add')}</Btn></PageHead>
    {edit && <Form key={edit.id} initial={edit} onDone={() => setEdit(null)} />}
    {list?.length === 0 && !edit && <Card className="text-center text-slate-500">{t('ed.needBusiness')}</Card>}
    <div className="grid gap-3 md:grid-cols-2">{list?.map((b) => <Card key={b.id} className="flex items-start justify-between gap-3">
      <div className="flex gap-3">{b.logoDataUrl && <img src={b.logoDataUrl} alt="" className="h-12 w-12 object-contain" />}<div><div className="font-semibold">{b.name}</div><div className="text-sm text-slate-500">{[b.phone, b.email].filter(Boolean).join(' · ')}</div><div className="text-sm text-slate-500">{[b.address, b.city].filter(Boolean).join(', ')}</div></div></div>
      <div className="flex gap-1"><Btn variant="ghost" aria-label={t('common.edit')} onClick={() => setEdit(b)}><Pencil size={14} /></Btn>
        <Btn variant="ghost" aria-label={t('common.delete')} onClick={async () => { if (confirmAction(t('bz.confirmDelete'))) { await db.businessProfiles.delete(b.id); toast(t('common.deleted')); } }}><Trash2 size={14} /></Btn></div></Card>)}</div></>;
}
