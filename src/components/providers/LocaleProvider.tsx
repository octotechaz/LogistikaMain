"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "az" | "ru" | "en" | "tr";
export const SUPPORTED_LOCALES: Locale[] = ["az", "ru", "en", "tr"];
export const LOCALE_LABELS: Record<Locale, string> = { az: "AZ", ru: "RU", en: "EN", tr: "TR" };
export const DEFAULT_LOCALE: Locale = "az";
export type Messages = Record<string, unknown>;

const STORAGE_KEY = "tranzit_locale";
const STORAGE_DATE_KEY = "tranzit_locale_date";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const today = getTodayString();
  const lastDate = localStorage.getItem(STORAGE_DATE_KEY);
  if (lastDate !== today) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_DATE_KEY, today);
    return null;
  }
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  return null;
}

const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  AZ: "az", RU: "ru", TR: "tr", BY: "ru", KZ: "ru", UA: "ru",
  UZ: "ru", TM: "ru", KG: "ru", TJ: "ru", AM: "ru", GE: "ru", MD: "ru",
};

function getPositionAsync(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("no geolocation")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
  });
}

async function detectLocaleByGeo(): Promise<Locale> {
  try {
    const pos = await getPositionAsync();
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return DEFAULT_LOCALE;
    const data = await res.json();
    const countryCode = (data?.address?.country_code as string)?.toUpperCase();
    return COUNTRY_LOCALE_MAP[countryCode] ?? DEFAULT_LOCALE;
  } catch {
    try {
      const res = await fetch("/api/public/geo-locale", { cache: "no-store" });
      if (!res.ok) return DEFAULT_LOCALE;
      const { locale } = await res.json();
      return (SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE) as Locale;
    } catch {
      return DEFAULT_LOCALE;
    }
  }
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
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { locale: _loc, ...rest } = (json?.data ?? json) as Messages & { locale?: unknown };
    const data = rest as Messages;
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
    const stored = getStoredLocale();
    if (stored) {
      setLocaleState(stored);
      loadMessages(stored).then((m) => {
        setMessages(m);
        setReady(true);
      });
    } else {
      detectLocaleByGeo()
        .then((detected) => {
          localStorage.setItem(STORAGE_KEY, detected);
          localStorage.setItem(STORAGE_DATE_KEY, getTodayString());
          setLocaleState(detected);
          return loadMessages(detected);
        })
        .then((m) => {
          setMessages(m);
          setReady(true);
        })
        .catch(() => {
          setReady(true);
        });
    }

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue && SUPPORTED_LOCALES.includes(e.newValue as Locale)) {
        const next = e.newValue as Locale;
        delete contentCache[next];
        delete staticCache[next];
        loadMessages(next).then((m) => {
          setLocaleState(next);
          setMessages(m);
        });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem(STORAGE_DATE_KEY, getTodayString());
    delete contentCache[next];
    delete staticCache[next];
    loadMessages(next).then((m) => {
      setLocaleState(next);
      setMessages(m);
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

  if (!ready) {
    return (
      <LocaleContext.Provider value={{ locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k, f) => f ?? k, tArray: (_, f) => f ?? [], tSteps: (_, f) => f ?? [], ready: false }}>
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, tArray, tSteps, ready }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}