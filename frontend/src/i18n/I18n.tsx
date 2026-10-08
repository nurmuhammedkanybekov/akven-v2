import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type MessageKey } from "./en";
import { ky } from "./ky";
import { ru } from "./ru";

/**
 * English, Russian and Kyrgyz. English is the main language and the source of every key; a missing Russian or
 * Kyrgyz text falls back to English instead of showing a key. The choice is remembered on this device.
 */
export type Lang = "en" | "ru" | "ky";

export const LANGS: Array<{ code: Lang; short: string; name: string }> = [
  { code: "en", short: "EN", name: "English" },
  { code: "ru", short: "РУС", name: "Русский" },
  { code: "ky", short: "КЫР", name: "Кыргызча" },
];

const DICTS: Record<Lang, Partial<Record<MessageKey, string>>> = { en, ru, ky };
const KEY = "akven-lang";

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let text = DICTS[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "ru" || saved === "ky") return saved;
  } catch { /* private mode: fall through to the browser language */ }
  return "en";
}

interface I18nValue { lang: Lang; setLang: (l: Lang) => void; t: Translate }

// Without a provider (single-component tests) everything reads in English.
const I18nContext = createContext<I18nValue>({ lang: "en", setLang: () => {}, t: (k, v) => translate("en", k, v) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* the choice just will not persist */ }
  }, []);
  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  return useContext(I18nContext);
}

/** EN · РУС · КЫР. Each button says its language in that language, so anyone can find their own. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <div className={`av-langs ${className ?? ""}`} role="group" aria-label={t("lang.label")}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} aria-label={l.name} onClick={() => setLang(l.code)}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
