"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "az" | "ru" | "en" | "tr";
export const SUPPORTED_LOCALES: Locale[] = ["az", "ru", "en", "tr"];
export const LOCALE_LABELS: Record<Locale, string> = { az: "AZ", ru: "RU", en: "EN", tr: "TR" };
export const DEFAULT_LOCALE: Locale = "az";
export type Messages = Record<string, unknown>;

const STORAGE_KEY = "tranzit_locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  const browserLang = navigator.language.slice(0, 2) as Locale;
  if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;
  return DEFAULT_LOCALE;
}

const staticCache: Partial<Record<Locale, Messages>> = {};
const contentCache: Partial<Record<Locale, Messages>> = {};

async function loadStaticMessages(locale: Locale): Promise<Messages> {
  if (staticCache[locale]) return staticCache[locale]!;
  try {
    const res = await fetch(`/locales/${locale}.json`);
    const data = await res.json();
    staticCache[locale] = data;
    return data;
  } catch { return {}; }
}

async function loadDynamicContent(locale: Locale): Promise<Messages> {
  try {
    const res = await fetch(`/api/public/page-content?locale=${locale}`, { cache: "no-store" });
    if (!res.ok) return {};
    const data = await res.json();
    contentCache[locale] = data;
    return data;
  } catch { return {}; }
}

async function loadMessages(locale: Locale): Promise<Messages> {
  const [s, d] = await Promise.all([loadStaticMessages(locale), loadDynamicContent(locale)]);
  return { ...s, ...d };
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
  tArray: (key: string, fallback?: string[]) => string[];
  tSteps: (key: string, fallback?: { icon: string; title: string; text: string }[]) => { icon: string; title: string; text: string }[];
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k, f) => f ?? k,
  tArray: (_, f) => f ?? [],
  tSteps: (_, f) => f ?? [],
  ready: false,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Messages>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const initial = getStoredLocale();
    setLocaleState(initial);
    loadMessages(initial).then((m) => { setMessages(m); setReady(true); });

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue && SUPPORTED_LOCALES.includes(e.newValue as Locale)) {
        const next = e.newValue as Locale;
        setLocaleState(next);
        delete contentCache[next];
        delete staticCache[next];
        loadMessages(next).then(setMessages);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [transitioning, setTransitioning] = useState(false);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    delete contentCache[next];
    delete staticCache[next];
    setTransitioning(true);
    loadMessages(next).then((m) => {
      setLocaleState(next);
      setMessages(m);
      requestAnimationFrame(() => setTransitioning(false));
    });
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const val = messages[key];
    if (typeof val === "string") return val;
    return fallback ?? key;
  }, [messages]);

  const tArray = useCallback((key: string, fallback: string[] = []): string[] => {
    const val = messages[key];
    if (Array.isArray(val) && val.every((v) => typeof v === "string")) return val as string[];
    return fallback;
  }, [messages]);

  const tSteps = useCallback((key: string, fallback: { icon: string; title: string; text: string }[] = []) => {
    const val = messages[key];
    if (Array.isArray(val)) return val as { icon: string; title: string; text: string }[];
    return fallback;
  }, [messages]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, tArray, tSteps, ready }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}