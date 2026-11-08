import { useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { db, newId } from '../db/db.ts';
import type { AppSettings, TaxProfile } from '../db/types.ts';
import { backupCounts, clearAll, exportBackup, getSettings, importBackup, parseBackup, saveSettings, type BackupFile } from '../db/repo.ts';
import { parsePercentToBps } from '../lib/money.ts';
import { useLang, useT, type Key } from '../i18n/index.ts';
import { Btn, Card, Field, PageHead, confirmAction, inp, toast } from '../components/ui.tsx';

const TABS = ['general', 'tax', 'documents', 'backup'] as const;
function General({ s }: { s: AppSettings }) {
  const t = useT(); const { lang, setLang } = useLang();
  return <Card className="grid gap-3 sm:grid-cols-2">
    <Field label={t('f.language')}><select className={inp} value={lang} onChange={(e) => { setLang(e.target.value as 'km' | 'en'); void saveSettings({ ...s, language: e.target.value as 'km' | 'en' }); }}><option value="km">ខ្មែរ</option><option value="en">English</option></select></Field>
    <Field label={t('f.currency')}><select className={inp} value={s.defaultCurrency} onChange={(e) => void saveSettings({ ...s, defaultCurrency: e.target.value as 'USD' | 'KHR' })}><option>USD</option><option>KHR</option></select></Field>
    <Field label={t('st.dateFormat')}><select className={inp} value={s.dateFormat} onChange={(e) => void saveSettings({ ...s, dateFormat: e.target.value as AppSettings['dateFormat'] })}><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></Field>
    <Field label={t('tp.default')}><select className={inp} value={s.defaultTemplate} onChange={(e) => void saveSettings({ ...s, defaultTemplate: e.target.value as AppSettings['defaultTemplate'] })}>{(['modern', 'classic', 'minimal', 'elegant', 'bold', 'fresh'] as const).map((x) => <option key={x} value={x}>{t(`tp.${x}` as Key)}</option>)}</select></Field></Card>;
}
function Documents({ s }: { s: AppSettings }) {
  const t = useT(); const [d, setD] = useState(s);
  const num = (k: 'invoice' | 'quotation' | 'receipt', f: 'prefix' | 'padding' | 'startAt', v: string) => setD({ ...d, numbering: { ...d.numbering, [k]: { ...d.numbering[k], [f]: f === 'prefix' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : Math.max(1, Math.min(12, Number(v) || 1)) } } } as AppSettings);
  return <Card className="space-y-4">
    {(['invoice', 'quotation', 'receipt'] as const).map((k) => <div key={k} className="grid gap-3 sm:grid-cols-3"><h2 className="font-semibold sm:col-span-3">{t(`st.${k}` as Key)}</h2>
      <Field label={t('st.prefix')}><input className={inp} value={d.numbering[k].prefix} onChange={(e) => num(k, 'prefix', e.target.value)} /></Field>
      <Field label={t('st.padding')}><input type="number" min={1} max={12} className={inp} value={d.numbering[k].padding} onChange={(e) => num(k, 'padding', e.target.value)} /></Field>
      <Field label={t('st.start')}><input type="number" min={1} className={inp} value={d.numbering[k].startAt} onChange={(e) => setD({ ...d, numbering: { ...d.numbering, [k]: { ...d.numbering[k], startAt: Math.max(1, Number(e.target.value) || 1) } } })} /></Field></div>)}
    <Field label={t('st.terms')}><input className={inp} value={d.defaultPaymentTerms ?? ''} onChange={(e) => setD({ ...d, defaultPaymentTerms: e.target.value })} /></Field>
    <Field label={t('st.notes')}><textarea rows={2} className={inp} value={d.defaultNotes ?? ''} onChange={(e) => setD({ ...d, defaultNotes: e.target.value })} /></Field>
    <Field label={t('st.footer')}><input className={inp} value={d.defaultFooter ?? ''} onChange={(e) => setD({ ...d, defaultFooter: e.target.value })} /></Field>
    <Btn onClick={async () => { await saveSettings(d); toast(t('common.saved')); }}>{t('common.save')}</Btn></Card>;
}
function Tax() {
  const t = useT(); const list = useLiveQuery(() => db.taxProfiles.toArray(), []);
  const [f, setF] = useState({ name: '', rate: '', mode: 'exclusive' as TaxProfile['mode'], applyTo: 'document' as TaxProfile['applyTo'], after: true });
  const add = async () => {
    const bps = parsePercentToBps(f.rate);
    if (!f.name.trim() || bps === null) { toast(t(bps === null ? 'err.tax' : 'err.name'), true); return; }
    await db.taxProfiles.add({ id: newId(), name: f.name.trim(), rateBps: bps, enabled: true, mode: f.mode, applyTo: f.applyTo, applyAfterDiscount: f.after, isDefault: !list?.length });
    setF({ ...f, name: '', rate: '' }); toast(t('common.saved'));
  };
  const setDefault = async (id: string) => { await db.transaction('rw', db.taxProfiles, async () => { for (const x of await db.taxProfiles.toArray()) await db.taxProfiles.update(x.id, { isDefault: x.id === id }); }); };
  return <div className="space-y-4"><p className="text-sm text-slate-500">{t('st.rate0')}</p>
    <Card className="grid gap-3 sm:grid-cols-3">
      <Field label={t('st.taxName')}><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label={t('st.rate')}><input inputMode="decimal" className={inp} value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>
      <Field label={t('ed.taxMode')}><select className={inp} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as TaxProfile['mode'] })}><option value="exclusive">{t('ed.exclusive')}</option><option value="inclusive">{t('ed.inclusive')}</option></select></Field>
      <Field label={t('ed.taxScope')}><select className={inp} value={f.applyTo} onChange={(e) => setF({ ...f, applyTo: e.target.value as TaxProfile['applyTo'] })}><option value="document">{t('ed.scopeDoc')}</option><option value="item">{t('ed.scopeItem')}</option></select></Field>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.after} onChange={(e) => setF({ ...f, after: e.target.checked })} />{t('ed.afterDisc')}</label>
      <div className="flex items-end"><Btn onClick={add}>{t('st.addTax')}</Btn></div></Card>
    <Card><ul className="divide-y divide-slate-100 text-sm">{list?.map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{x.name}</b> · {x.rateBps / 100}% · {t(x.mode === 'inclusive' ? 'ed.inclusive' : 'ed.exclusive')}</span>
      <span className="flex items-center gap-3"><label className="flex items-center gap-1"><input type="checkbox" checked={x.enabled} onChange={(e) => void db.taxProfiles.update(x.id, { enabled: e.target.checked })} />{t('st.enabled')}</label>
        <label className="flex items-center gap-1"><input type="radio" name="deftax" checked={x.isDefault} onChange={() => void setDefault(x.id)} />{t('st.default')}</label>
        <Btn variant="ghost" aria-label={t('common.delete')} onClick={() => confirmAction(t('common.confirmDelete')) && void db.taxProfiles.delete(x.id)}><Trash2 size={14} /></Btn></span></li>)}</ul></Card></div>;
}
function Backup() {
  const t = useT(); const [b, setB] = useState<BackupFile | null>(null);
  const usage = useLiveQuery(async () => (await navigator.storage?.estimate?.())?.usage ?? 0, []);
  const onFile = async (file?: File) => {
    if (!file) return;
    try { setB(parseBackup(await file.text())); } catch (e) { setB(null); toast(t(e instanceof Error && e.message === 'version' ? 'err.version' : 'err.json'), true); }
  };
  const doImport = async (mode: 'merge' | 'replace') => {
    if (!b || (mode === 'replace' && !confirmAction(t('st.confirmReplace')))) return;
    try { await importBackup(b, mode); setB(null); toast(t('st.imported')); } catch { toast(t('err.generic'), true); }
  };
  return <div className="space-y-4">
    <Card className="space-y-2"><p className="text-sm">{t('storage.notice')}</p><p className="text-sm text-slate-500">{t('st.storage')}: {((usage ?? 0) / 1024 / 1024).toFixed(2)} MB</p>
      <Btn onClick={async () => { const blob = new Blob([JSON.stringify(await exportBackup(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `invoice-cambodia-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); }}>{t('st.export')}</Btn></Card>
    <Card className="space-y-3"><Field label={t('st.import')}><input type="file" accept="application/json,.json" className={inp} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} /></Field>
      {b && <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="mb-1 font-medium">{t('st.previewTitle')} · {b.exportDate.slice(0, 10)}</div>
        <ul className="grid grid-cols-2 gap-x-4">{Object.entries(backupCounts(b)).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></li>)}</ul>
        <div className="mt-3 flex flex-wrap gap-2"><Btn onClick={() => doImport('merge')}>{t('st.merge')}</Btn><Btn variant="danger" onClick={() => doImport('replace')}>{t('st.replace')}</Btn></div></div>}</Card>
    <Card><Btn variant="danger" onClick={async () => { if (confirmAction(t('st.confirmClear'))) { await clearAll(); toast(t('st.cleared')); } }}>{t('st.clear')}</Btn></Card></div>;
}
export default function Settings() {
  const t = useT(); const { tab } = useParams(); const s = useLiveQuery(getSettings, []);
  if (!tab) return <Navigate to="/settings/general" replace />;
  if (!(TABS as readonly string[]).includes(tab)) return <Navigate to="/settings/general" replace />;
  return <>
    <PageHead title={t('nav.settings')} />
    <nav aria-label="Settings" className="mb-4 flex flex-wrap gap-2">{TABS.map((x) => <NavLink key={x} to={`/settings/${x}`} className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-navy-700 text-white' : 'bg-white text-slate-600'}`}>{t(`st.${x === 'backup' ? 'backup' : x}` as Key)}</NavLink>)}</nav>
    {s && tab === 'general' && <General s={s} />}{s && tab === 'documents' && <Documents key={s.counters.invoice} s={s} />}{tab === 'tax' && <Tax />}{tab === 'backup' && <Backup />}</>;
}
