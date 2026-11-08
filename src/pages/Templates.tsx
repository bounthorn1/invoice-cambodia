import { useLiveQuery } from 'dexie-react-hooks';
import type { TemplateId } from '../db/types.ts';
import { calculateDocument } from '../lib/calc.ts';
import { getSettings, saveSettings } from '../db/repo.ts';
import { useT, type Key } from '../i18n/index.ts';
import { Btn, Card, PageHead, toast } from '../components/ui.tsx';
import { DocumentSheet, type SheetModel } from '../templates/DocumentSheet.tsx';

const now = new Date().toISOString();
const sample = (): SheetModel => {
  const items = [{ quantityMilli: 2000, unitPriceMinor: 15000 }, { quantityMilli: 1000, unitPriceMinor: 8000 }];
  const calc = calculateDocument({ items, taxMode: 'exclusive', taxScope: 'document', documentTaxRateBps: 1000, applyTaxAfterDiscount: true });
  return { kind: 'invoice', number: 'INV-000001', issueDate: '2026-01-15', dueDate: '2026-01-29', currency: 'USD', taxMode: 'exclusive', calc, paid: 0, balance: calc.grandTotal,
    business: { id: 'b', name: 'Sample Co., Ltd', address: 'Phnom Penh', phone: '012 345 678', defaultCurrency: 'USD', defaultLanguage: 'en', createdAt: now, updatedAt: now },
    customer: { id: 'c', type: 'individual', name: 'Sok Dara', phone: '098 765 432', createdAt: now, updatedAt: now },
    rows: [{ desc: 'Website design / ការរចនាគេហទំព័រ', qty: '2', unit: 'day', price: 15000, amount: 30000 }, { desc: 'Hosting', qty: '1', unit: 'month', price: 8000, amount: 8000 }] };
};
export default function Templates() {
  const t = useT(); const s = useLiveQuery(getSettings, []);
  const use = async (id: TemplateId) => { if (!s) return; await saveSettings({ ...s, defaultTemplate: id }); toast(t('common.saved')); };
  return <>
    <PageHead title={t('tp.title')} />
    <p className="mb-3 text-sm text-slate-500">{t('tp.sampleNote')}</p>
    <div className="grid gap-4 lg:grid-cols-3">{(['modern', 'classic', 'minimal', 'elegant', 'bold', 'fresh'] as const).map((id) => (
      <Card key={id}><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">{t(`tp.${id}` as Key)}</h2>
        {s?.defaultTemplate === id ? <span className="text-sm text-emerald-600">✓ {t('tp.current')}</span> : <Btn variant="ghost" onClick={() => use(id)}>{t('tp.use')}</Btn>}</div>
        <div className="h-[150mm] overflow-hidden rounded-lg border border-slate-200"><div className="pointer-events-none origin-top-left scale-[0.4]" style={{ width: '250%' }}><DocumentSheet m={sample()} template={id} /></div></div></Card>))}</div></>;
}
