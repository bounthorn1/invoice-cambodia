import { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link, Outlet } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, FilePlus2, Receipt, Users, Building2, LayoutDashboard, Settings as SettingsIcon, Palette, Menu, X } from 'lucide-react';
import { useLang, useT, type Key } from './i18n/index.ts';
import { getSettings } from './db/repo.ts';
import { setDateFormat } from './lib/util.ts';
import { Toaster } from './components/ui.tsx';
import { InfoPage, Landing, SiteLayout, useSeo } from './site/Site.tsx';
import { SLUGS } from './site/content.ts';

const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const DocList = lazy(() => import('./pages/DocList.tsx'));
const DocPage = lazy(() => import('./pages/DocPage.tsx'));
const Receipts = lazy(() => import('./pages/Receipts.tsx'));
const Customers = lazy(() => import('./pages/Customers.tsx'));
const Business = lazy(() => import('./pages/Business.tsx'));
const Templates = lazy(() => import('./pages/Templates.tsx'));
const Settings = lazy(() => import('./pages/Settings.tsx'));

const NAV: { to: string; key: Key; icon: typeof FileText }[] = [
  { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard }, { to: '/invoices', key: 'nav.invoices', icon: FileText }, { to: '/quotations', key: 'nav.quotations', icon: FilePlus2 },
  { to: '/receipts', key: 'nav.receipts', icon: Receipt }, { to: '/customers', key: 'nav.customers', icon: Users }, { to: '/business', key: 'nav.business', icon: Building2 },
  { to: '/templates', key: 'nav.templates', icon: Palette }, { to: '/settings', key: 'nav.settings', icon: SettingsIcon },
];
function NotFound() {
  const t = useT(); useSeo('404 — Invoice Cambodia', '', '/404');
  return <section className="m-4 rounded-2xl bg-white p-6 shadow-card"><h1 className="text-xl font-semibold text-navy-800">404 — {t('common.notFound')}</h1><Link className="mt-3 inline-block text-navy-600 underline" to="/dashboard">{t('common.backHome')}</Link></section>;
}
function AppLayout() {
  const t = useT(); const { lang, setLang } = useLang(); const [open, setOpen] = useState(false);
  const settings = useLiveQuery(getSettings, []);
  useEffect(() => { if (settings) setDateFormat(settings.dateFormat); }, [settings]);
  useSeo('Invoice Cambodia', '', '/dashboard');
  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {NAV.map(({ to, key, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Icon size={18} aria-hidden /> {t(key)}</NavLink>))}
    </nav>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block print:hidden"><Link to="/" className="block px-5 py-5 text-lg font-semibold text-navy-800">{t('appName')}</Link>{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label={t('common.menu')}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-white shadow-xl"><button className="absolute right-3 top-3 p-2" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button><div className="px-5 py-5 text-lg font-semibold text-navy-800">{t('appName')}</div>{nav}</aside>
        </div>)}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 print:hidden">
          <button className="p-2 lg:hidden" aria-label={t('common.menu')} onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="ml-auto flex items-center gap-2 text-sm"><label htmlFor="lang" className="sr-only">{t('common.language')}</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as 'km' | 'en')} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"><option value="km">ខ្មែរ</option><option value="en">English</option></select></div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          <p className="mb-4 rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-700 print:hidden">{t('storage.notice')}</p>
          <Suspense fallback={null}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
export function App() {
  return (<>
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Landing />} />
        {SLUGS.map((s) => <Route key={s} path={s} element={<InfoPage slug={s} />} />)}
      </Route>
      <Route element={<AppLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="invoices" element={<DocList kind="invoice" />} /><Route path="invoices/:id" element={<DocPage kind="invoice" />} />
        <Route path="quotations" element={<DocList kind="quotation" />} /><Route path="quotations/:id" element={<DocPage kind="quotation" />} />
        <Route path="receipts" element={<Receipts />} /><Route path="receipts/:id" element={<Receipts />} />
        <Route path="customers" element={<Customers />} /><Route path="customers/:id" element={<Customers />} />
        <Route path="business" element={<Business />} /><Route path="templates" element={<Templates />} />
        <Route path="settings" element={<Settings />} /><Route path="settings/:tab" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes><Toaster /></>);
}
