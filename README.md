# Invoice Cambodia (v0.2)

Free invoice, quotation and receipt maker for Cambodia. React + Vite + TypeScript + Tailwind, Dexie/IndexedDB, Zustand.
No backend; all data stays in the browser. Khmer + English, USD + KHR.

## Run
```bash
npm install
npm run dev
npm run typecheck && npm run lint && npm test && npm run build
npx playwright install chromium && npm run test:e2e
```
Deploy: import into Vercel (Vite preset; `vercel.json` has the SPA rewrite). Copy `.env.example` to set `VITE_SITE_URL`
and replace `invoice-cambodia.vercel.app` in `public/sitemap.xml` and `public/robots.txt` with your domain.

## Built on top of Stage 1 (kept unchanged)
`src/lib/{money,calc,payments,numbering}.ts`, `src/db/{db,types}.ts`, `src/i18n/{en,km}.ts`.

## Added in v0.2
- `src/db/repo.ts`: atomic save (document + items + number), payments + receipts, quotation conversion (once only),
  duplicate/delete, JSON backup (validate, preview, merge by id, replace all), clear data.
- Pages: Dashboard (real data, per-currency totals, monthly + status charts), Invoices/Quotations (search, status/currency/date
  filters, sort, pagination, editor with live preview, per-item and document discount/tax, reorder), document view with payments,
  receipts list/view, Customers (CRUD, filter, related documents), Business profiles (logo upload/replace/remove),
  Templates (Modern, Classic, Minimal), Settings (general, numbering prefix/digits/start, default notes/terms/footer, tax profiles, backup).
- Public site: landing + 9 content pages (invoice/quotation/receipt maker, 2 guides, about, contact, privacy, terms) in Khmer and English,
  per-page title/description/canonical/Open Graph, sitemap, robots, optional ad slot (only on public pages, off unless `VITE_ADSENSE_CLIENT` is set).
- PDF: "Print / Save as PDF" (vector, uses the browser's Khmer shaping) and "Download PDF" (image-based via html-to-image + jsPDF).

## Verification status (honest)
- Executed in the build sandbox: translation-key audit (en/km identical, every `t('...')` key exists), relative-import audit,
  and a Node run of the calculation engine. 
- NOT executed (no network, so dependencies could not be installed): `npm install`, `typecheck`, `lint`, Vitest (including the new
  `tests/unit/repo.test.ts` and `docform.test.ts`), `build`, Playwright. Expect to fix a few type or lint errors on first run.
- Khmer PDF output has not been visually verified. Print-to-PDF should shape Khmer correctly because the browser renders it;
  the image-based download inherits the same rendering. Please open one Khmer invoice and check both outputs.

## Known limitations
- Public pages are client-rendered (no prerendering), which is weaker for SEO than static HTML; add a prerender step before relying on search traffic.
- Confirmations use native `confirm()` dialogs, not custom accessible modals.
- Image-based PDF cannot keep text selectable and may cut a table row across pages; use Print for multi-page documents.
- Not done: theme and number-format settings, overpayment-as-credit, Playwright flows beyond the smoke test, item-level reorder by drag.
