import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { create } from 'zustand';
import { useT, type Key } from '../i18n/index.ts';

export const inp = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100';
export function Btn({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = { primary: 'bg-navy-700 text-white hover:bg-navy-800', ghost: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50', danger: 'bg-red-600 text-white hover:bg-red-700' }[variant];
  return <button type="button" {...p} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${v} ${className}`} />;
}
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => <section className={`rounded-2xl bg-white p-4 shadow-card sm:p-5 ${className}`}>{children}</section>;
export const Field = ({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) => (
  <label className={`block text-sm ${className}`}><span className="mb-1 block font-medium text-slate-600">{label}</span>{children}</label>
);
export const PageHead = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden"><h1 className="text-xl font-semibold text-navy-800">{title}</h1><div className="flex flex-wrap gap-2">{children}</div></div>
);
const BADGE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700', accepted: 'bg-emerald-100 text-emerald-700', converted: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-slate-200 text-slate-600', expired: 'bg-slate-200 text-slate-600',
  partially_paid: 'bg-amber-100 text-amber-700', unpaid: 'bg-blue-100 text-blue-700', sent: 'bg-blue-100 text-blue-700', draft: 'bg-slate-100 text-slate-600',
};
export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[status] ?? BADGE.draft}`}>{t(`status.${status}` as Key)}</span>;
}

interface ToastState { items: { id: number; msg: string; err: boolean }[]; push: (msg: string, err: boolean) => void }
const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (msg, err) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { id, msg, err }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 4000);
  },
}));
export const toast = (msg: string, err = false) => useToasts.getState().push(msg, err);
export function Toaster() {
  const items = useToasts((s) => s.items);
  return <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 print:hidden">
    {items.map((i) => <div key={i.id} className={`rounded-lg px-4 py-2 text-sm text-white shadow-lg ${i.err ? 'bg-red-600' : 'bg-emerald-600'}`}>{i.msg}</div>)}
  </div>;
}
/** Accessible-enough confirmation for destructive actions (native dialog). */
export const confirmAction = (msg: string): boolean => window.confirm(msg);
