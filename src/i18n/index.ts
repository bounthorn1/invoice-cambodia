import { create } from 'zustand';
import { en } from './en.ts';
import { km } from './km.ts';
import { enX, kmX } from './extra.ts';
import type { Lang } from '../db/types.ts';

const enAll = { ...en, ...enX };
export type Key = keyof typeof enAll;
const dictionaries: Record<Lang, Record<Key, string>> = { en: enAll, km: { ...km, ...kmX } };
const STORAGE_KEY = 'ic.lang';

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'km' || v === 'en') return v;
  } catch { /* storage unavailable: fall back to default */ }
  return 'km';
}

interface LangState { lang: Lang; setLang: (l: Lang) => void }
export const useLang = create<LangState>((set) => ({
  lang: loadLang(),
  setLang: (lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

export function translate(lang: Lang, key: Key): string {
  return dictionaries[lang][key] ?? enAll[key];
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return (key: Key) => translate(lang, key);
}
