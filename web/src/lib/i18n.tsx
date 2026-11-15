import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../../../shared/types.ts';
import de from '../locales/de.json';
import en from '../locales/en.json';
import { load, save } from './storage.ts';

export type MsgKey = keyof typeof en;
const dict: Record<Lang, Record<string, string>> = { de, en };

function detect(): Lang {
  const saved = load<Lang | null>('lang', null);
  if (saved === 'de' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MsgKey, vars?: Record<string, string | number>) => string;
}
const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => { save('lang', l); setLangState(l); }, []);
  const t = useCallback<I18n['t']>((key, vars) => {
    let s = dict[lang][key] ?? dict.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider missing');
  return v;
}
