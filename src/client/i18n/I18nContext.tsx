import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { TRANSLATIONS, type LangCode, type TranslationKey } from "./translations";

const STORAGE_KEY = "gilani_ui_lang";

// ─── Context ──────────────────────────────────────────────────────────────────

type I18nContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

function readStoredLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "sw" ? "sw" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(readStoredLang);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
      // Update <html lang="..."> for accessibility
      document.documentElement.lang = next;
    }
  }, []);

  // Apply <html lang> on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, []);

  // Listen for language changes triggered from settings (cross-component)
  useEffect(() => {
    const handler = () => {
      const updated = readStoredLang();
      setLangState(updated);
      document.documentElement.lang = updated;
    };
    window.addEventListener("gilani:lang-changed", handler);
    return () => window.removeEventListener("gilani:lang-changed", handler);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return TRANSLATIONS[lang][key] ?? TRANSLATIONS["en"][key] ?? key;
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

// ─── Utility: persist language from settings ──────────────────────────────────
// Call this from useSettings when uiLanguage changes.
export function persistLang(lang: LangCode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent("gilani:lang-changed"));
}
