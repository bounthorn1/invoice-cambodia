import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Check, ChevronDown, ChevronRight, Coins, DatabaseBackup, FileText, Languages, LayoutTemplate, Menu, Percent, ReceiptText, ShieldCheck, X } from 'lucide-react';
import { useLang } from '../i18n/index.ts';
import { LANDING, PAGES, SLUGS } from './content.ts';

const BASE: string = import.meta.env.VITE_SITE_URL ?? 'https://invoice-cambodia.vercel.app';
function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = value;
}
export function useSeo(title: string, desc: string, path: string) {
  useEffect(() => {
    document.title = title;
    setMeta('name', 'description', desc); setMeta('property', 'og:title', title); setMeta('property', 'og:description', desc); setMeta('property', 'og:type', 'website'); setMeta('property', 'og:url', BASE + path);
    let l = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); }
    l.href = BASE + path;
  }, [title, desc, path]);
}

type L = 'km' | 'en';
const label = (slug: string, lang: L) => PAGES[slug]![lang].h1;
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600';
const T = {
  en: { brand: 'Invoice Cambodia', invoices: 'Invoices', quotations: 'Quotations', receipts: 'Receipts', open: 'Open the app', menu: 'Menu', product: 'Product', guides: 'Guides', company: 'Company', tagline: 'Free invoices, quotations and receipts for Cambodian businesses.', rights: 'Your data stays in your browser.', more: 'Learn more', home: 'Home', ctaH: 'Send your next invoice in minutes', ctaP: 'No account, no payment, no setup. Open it and start typing.', lang: 'Language' },
  km: { brand: 'វិក្កយបត្រកម្ពុជា', invoices: 'វិក្កយបត្រ', quotations: 'សម្រង់តម្លៃ', receipts: 'បង្កាន់ដៃ', open: 'បើកកម្មវិធី', menu: 'ម៉ឺនុយ', product: 'ឧបករណ៍', guides: 'មគ្គុទ្ទេសក៍', company: 'អំពីយើង', tagline: 'វិក្កយបត្រ សម្រង់តម្លៃ និងបង្កាន់ដៃឥតគិតថ្លៃសម្រាប់អាជីវកម្មកម្ពុជា។', rights: 'ទិន្នន័យរបស់អ្នកនៅក្នុងកម្មវិធីរុករក។', more: 'ស្វែងយល់បន្ថែម', home: 'ទំព័រដើម', ctaH: 'ផ្ញើវិក្កយបត្របន្ទាប់របស់អ្នកក្នុងប៉ុន្មាននាទី', ctaP: 'គ្មានគណនី គ្មានការបង់ប្រាក់ គ្មានការរៀបចំ។ បើកហើយចាប់ផ្តើមវាយបានភ្លាម។', lang: 'ភាសា' },
} as const;

function LangSwitch({ lang, setLang, id }: { lang: L; setLang: (l: L) => void; id: string }) {
  return (
    <div role="group" aria-label={T[lang].lang} id={id} className="inline-flex rounded-full bg-slate-100 p-0.5 text-sm">
      {(['km', 'en'] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`rounded-full px-3 py-1 font-medium ${focus} ${lang === l ? 'bg-white text-navy-800 shadow-card' : 'text-slate-500 hover:text-navy-800'}`}>{l === 'km' ? 'ខ្មែរ' : 'EN'}</button>))}
    </div>
  );
}

function Logo({ lang }: { lang: L }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focus}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-800 text-white" aria-hidden><FileText size={18} /></span>
      <span className="text-lg font-semibold text-navy-900">{T[lang].brand}</span>
    </Link>
  );
}

export function SiteLayout() {
  const { lang, setLang } = useLang(); const loc = useLocation(); const t = T[lang]; const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const links: [string, string][] = [['/invoice-maker', t.invoices], ['/quotation-maker', t.quotations], ['/receipt-maker', t.receipts]];
  const linkCls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-medium ${focus} ${isActive ? 'bg-navy-50 text-navy-800' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-800'}`;
  const product = SLUGS.filter((s) => s.endsWith('-maker'));
  const guides = SLUGS.filter((s) => s.startsWith('guides'));
  const company = SLUGS.filter((s) => !s.endsWith('-maker') && !s.startsWith('guides'));
  const col = (title: string, slugs: readonly string[], short?: Record<string, string>) => (
    <nav aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold text-navy-900">{title}</h2>
      <ul className="space-y-2 text-sm text-slate-600">{slugs.map((s) => <li key={s}><Link className={`rounded hover:text-navy-700 hover:underline ${focus}`} to={`/${s}`}>{short?.[s] ?? label(s, lang)}</Link></li>)}</ul>
    </nav>
  );
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-700">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo lang={lang} />
          <nav aria-label="Site" className="hidden items-center gap-1 md:flex">{links.map(([to, text]) => <NavLink key={to} to={to} className={linkCls}>{text}</NavLink>)}</nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block"><LangSwitch lang={lang} setLang={setLang} id="site-lang" /></div>
            <Link to="/dashboard" className={`hidden rounded-xl bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-navy-700 sm:inline-block ${focus}`}>{t.open}</Link>
            <button type="button" className={`rounded-lg p-2 text-navy-800 md:hidden ${focus}`} aria-label={t.menu} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((v) => !v)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        {open && (
          <div id="site-menu" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
            <nav aria-label="Mobile" className="flex flex-col">{links.map(([to, text]) => <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-3 py-3 text-base font-medium ${isActive ? 'bg-navy-50 text-navy-800' : 'text-slate-700'}`}>{text}</NavLink>)}</nav>
            <div className="mt-3 flex items-center justify-between gap-3"><LangSwitch lang={lang} setLang={setLang} id="site-lang-m" />
              <Link to="/dashboard" className="rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white">{t.open}</Link></div>
          </div>)}
      </header>
      <main key={loc.pathname} className="flex-1"><Outlet /></main>
      {import.meta.env.VITE_ADSENSE_CLIENT && <aside aria-label="Advertisement" className="mx-auto my-6 w-full max-w-6xl px-4"><div className="min-h-[90px] rounded border border-dashed border-slate-300 text-center text-xs text-slate-400">Ad slot (public pages only)</div></aside>}
      <footer className="bg-navy-900 text-navy-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10" aria-hidden><FileText size={18} /></span><span className="text-lg font-semibold">{t.brand}</span></div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-100/80">{t.tagline}</p>
          </div>
          <div className="[&_h2]:text-white [&_ul]:text-navy-100/80 [&_a:hover]:text-white">{col(t.product, product, { 'invoice-maker': t.invoices, 'quotation-maker': t.quotations, 'receipt-maker': t.receipts })}</div>
          <div className="[&_h2]:text-white [&_ul]:text-navy-100/80 [&_a:hover]:text-white">{col(t.guides, guides)}</div>
          <div className="[&_h2]:text-white [&_ul]:text-navy-100/80 [&_a:hover]:text-white">{col(t.company, company)}</div>
        </div>
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-navy-100/70 sm:px-6"><span>© {new Date().getFullYear()} {t.brand}</span><span>{t.rights}</span></div></div>
      </footer>
    </div>
  );
}

const MOCK = {
  en: { sample: 'Sample', doc: 'Invoice', no: 'INV-0042', from: 'Sokha Coffee', to: 'Billed to', cust: 'Dara Trading Co.', item: 'Item', qty: 'Qty', amt: 'Amount', rows: [['Arabica beans', '5 kg', '$70.00'], ['Delivery', '1', '$10.00']], sub: 'Subtotal', disc: 'Discount 10%', total: 'Total', paid: 'Paid', bal: 'Balance due', pay: 'Pay with ABA, ACLEDA or Wing', rc: 'Receipt RC-0017', rcSub: 'Payment received via ABA' },
  km: { sample: 'គំរូ', doc: 'វិក្កយបត្រ', no: 'INV-0042', from: 'កាហ្វេសុខា', to: 'អតិថិជន', cust: 'ក្រុមហ៊ុន ដារ៉ា ត្រេដីង', item: 'មុខទំនិញ', qty: 'ចំនួន', amt: 'ទឹកប្រាក់', rows: [['កាហ្វេអារ៉ាប៊ីកា', '៥ គីឡូ', '$70.00'], ['ដឹកជូន', '១', '$10.00']], sub: 'សរុបរង', disc: 'បញ្ចុះតម្លៃ ១០%', total: 'សរុប', paid: 'បានបង់', bal: 'នៅជំពាក់', pay: 'បង់តាម ABA, ACLEDA ឬ Wing', rc: 'បង្កាន់ដៃ RC-0017', rcSub: 'ទទួលការទូទាត់តាម ABA' },
};

function InvoiceMock({ lang }: { lang: L }) {
  const m = MOCK[lang];
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="rounded-2xl bg-white p-5 text-[13px] shadow-[0_24px_60px_-20px_rgba(11,26,55,.55)] sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div><div className="text-xl font-semibold text-navy-900">{m.doc}</div><div className="mt-0.5 text-slate-500">{m.no}</div></div>
          <div className="text-right"><div className="font-semibold text-navy-800">{m.from}</div><span className="mt-1 inline-block rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-800">{m.sample}</span></div>
        </div>
        <div className="py-3"><div className="text-xs text-slate-500">{m.to}</div><div className="font-medium text-slate-800">{m.cust}</div></div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="py-1.5 font-medium">{m.item}</th><th className="py-1.5 font-medium">{m.qty}</th><th className="py-1.5 text-right font-medium">{m.amt}</th></tr></thead>
          <tbody>{m.rows.map(([a, b, c]) => <tr key={a} className="border-b border-slate-100"><td className="py-2 text-slate-800">{a}</td><td className="py-2 text-slate-600">{b}</td><td className="py-2 text-right tabular-nums text-slate-800">{c}</td></tr>)}</tbody>
        </table>
        <dl className="mt-3 space-y-1.5 tabular-nums">
          <div className="flex justify-between text-slate-600"><dt>{m.sub}</dt><dd>$80.00</dd></div>
          <div className="flex justify-between text-slate-600"><dt>{m.disc}</dt><dd>−$8.00</dd></div>
          <div className="flex justify-between font-semibold text-navy-900"><dt>{m.total}</dt><dd>$72.00</dd></div>
          <div className="flex justify-between text-slate-600"><dt>{m.paid}</dt><dd>$40.00</dd></div>
        </dl>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3 text-white"><span className="font-medium">{m.bal}</span><span className="text-lg font-semibold tabular-nums">$32.00</span></div>
        <p className="mt-3 text-xs text-slate-500">{m.pay}</p>
      </div>
      <div className="absolute -bottom-6 -left-3 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_16px_40px_-16px_rgba(11,26,55,.6)] sm:-left-8">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={16} /></span>
        <div className="text-xs"><div className="font-semibold text-navy-900">{m.rc}</div><div className="text-slate-500">{m.rcSub}</div></div>
      </div>
    </div>
  );
}

const FEATURE_ICONS = [Languages, Coins, ReceiptText, Percent, LayoutTemplate, DatabaseBackup];

export function Landing() {
  const lang = useLang((s) => s.lang); const c = LANDING[lang]; const t = T[lang]; const km = lang === 'km';
  useSeo(c.title, c.desc, '/');
  const h = km ? 'leading-[1.5]' : 'leading-[1.1]';
  const h2 = `text-2xl font-semibold text-navy-900 sm:text-3xl ${km ? 'leading-[1.5]' : 'leading-tight'}`;
  return <>
    <section className="relative overflow-hidden border-b border-slate-200 bg-navy-50/60">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <h1 className={`max-w-xl text-4xl font-semibold text-navy-900 sm:text-5xl ${h}`}>{c.h1}</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">{c.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/invoices/new" className={`rounded-xl bg-navy-800 px-6 py-3.5 text-base font-semibold text-white shadow-card hover:bg-navy-700 ${focus}`}>{c.cta}</Link>
            <Link to="/invoice-maker" className={`rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-navy-800 hover:bg-slate-50 ${focus}`}>{t.more}</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 text-sm text-slate-700">{['USD', 'KHR', 'ABA', 'ACLEDA', 'Wing', 'A4 PDF'].map((x) => <li key={x} className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium">{x}</li>)}</ul>
        </div>
        <div className="pb-8 lg:pl-6"><div className="rounded-[2rem] bg-navy-800 px-5 pb-12 pt-8 sm:px-10"><InvoiceMock lang={lang} /></div></div>
      </div>
    </section>

    <section className="bg-navy-900 text-white" aria-label={c.benefitsH}>
      <ul className="mx-auto grid max-w-6xl gap-x-6 gap-y-3 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {c.benefits.map((x) => <li key={x} className="flex items-start gap-2.5 text-sm leading-relaxed"><Check size={18} className="mt-0.5 shrink-0 text-gold-400" aria-hidden /><span>{x}</span></li>)}
      </ul>
    </section>

    <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 lg:space-y-24 lg:py-24">
      <section aria-labelledby="f">
        <h2 id="f" className={`max-w-2xl ${h2}`}>{c.featuresH}</h2>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {c.features.map(([title, body], i) => { const Icon = FEATURE_ICONS[i] ?? ShieldCheck; return (
            <div key={title} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700" aria-hidden><Icon size={22} /></span>
              <div><h3 className="font-semibold text-navy-900">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p></div>
            </div>); })}
        </div>
      </section>

      <section aria-labelledby="s" className="rounded-3xl bg-slate-50 px-5 py-10 sm:px-10 lg:py-14">
        <h2 id="s" className={h2}>{c.stepsH}</h2>
        <ol className="relative mt-10 grid gap-8 md:grid-cols-3">
          {c.steps.map(([title, body], i) => (
            <li key={title} className="relative">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-navy-800 text-base font-semibold text-white">{i + 1}</span>{i < c.steps.length - 1 && <span className="hidden h-px flex-1 bg-slate-300 md:block" aria-hidden />}</div>
              <h3 className="mt-4 font-semibold text-navy-900">{title}</h3><p className="mt-1.5 max-w-xs text-sm leading-relaxed text-slate-600">{body}</p>
            </li>))}
        </ol>
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label={t.product}>
        {(['invoice-maker', 'quotation-maker'] as const).map((s) => (
          <Link key={s} to={`/${s}`} className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:border-navy-500 ${focus}`}>
            <h2 className="text-lg font-semibold text-navy-900">{PAGES[s]![lang].h1}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{PAGES[s]![lang].desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 group-hover:underline">{t.more}<ChevronRight size={16} aria-hidden /></span>
          </Link>))}
      </section>

      <section aria-labelledby="q" className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        <h2 id="q" className={h2}>{c.faqH}</h2>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {c.faq.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded font-medium text-navy-900 marker:hidden [&::-webkit-details-marker]:hidden ${focus}`}>{q}<ChevronDown size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden /></summary>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">{a}</p>
            </details>))}
        </div>
      </section>
    </div>

    <section className="bg-navy-800 text-white"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center">
      <div><h2 className={`text-2xl font-semibold sm:text-3xl ${km ? 'leading-[1.5]' : 'leading-tight'}`}>{t.ctaH}</h2><p className="mt-2 max-w-lg text-navy-100">{t.ctaP}</p></div>
      <Link to="/invoices/new" className={`shrink-0 rounded-xl bg-white px-6 py-3.5 font-semibold text-navy-800 hover:bg-navy-50 ${focus}`}>{c.cta}</Link>
    </div></section>
  </>;
}

export function InfoPage({ slug }: { slug: string }) {
  const lang = useLang((s) => s.lang); const p = PAGES[slug]?.[lang]; const t = T[lang];
  useSeo(p?.title ?? '404', p?.desc ?? '', `/${slug}`);
  if (!p) return null;
  const email: string | undefined = import.meta.env.VITE_CONTACT_EMAIL;
  const km = lang === 'km';
  return <>
    <div className="border-b border-slate-200 bg-navy-50/60">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500"><Link to="/" className={`rounded hover:text-navy-700 hover:underline ${focus}`}>{t.home}</Link><ChevronRight size={14} aria-hidden /><span className="text-slate-700">{p.h1}</span></nav>
        <h1 className={`text-3xl font-semibold text-navy-900 sm:text-4xl ${km ? 'leading-[1.5]' : 'leading-tight'}`}>{p.h1}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">{p.desc}</p>
      </div>
    </div>
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {p.sections.map((s) => <section key={s.h} className="mb-10"><h2 className={`mb-3 text-xl font-semibold text-navy-900 sm:text-2xl ${km ? 'leading-[1.5]' : 'leading-snug'}`}>{s.h}</h2>{s.p.map((x) => <p key={x} className="mb-3 max-w-[68ch] text-base leading-8 text-slate-700">{x}</p>)}</section>)}
      {slug === 'contact' && (email ? <p className="mb-8"><a className={`rounded font-medium text-navy-700 underline ${focus}`} href={`mailto:${email}`}>{email}</a></p> : <p className="mb-8 text-sm text-slate-500">Set VITE_CONTACT_EMAIL to show your contact email here.</p>)}
      <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl bg-navy-800 p-6 text-white sm:flex-row sm:items-center">
        <div><div className="text-lg font-semibold">{t.ctaH}</div><div className="mt-1 text-sm text-navy-100">{t.ctaP}</div></div>
        <Link to="/invoices/new" className={`shrink-0 rounded-xl bg-white px-5 py-2.5 font-semibold text-navy-800 hover:bg-navy-50 ${focus}`}>{t.open}</Link>
      </div>
    </article>
  </>;
}
