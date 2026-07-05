'use client';

import { useEffect, useState } from 'react';

type Locale = 'es' | 'en';

const STORAGE_KEY = 'saludclick_locale';
const SCRIPT_ID = 'google-translate-script';

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: new (
          options: Record<string, unknown>,
          elementId: string
        ) => unknown;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

function setTranslateCookie(locale: Locale) {
  const value = locale === 'en' ? '/es/en' : '/es/es';
  const expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
  document.cookie = `googtrans=${value}; ${expires}; path=/; SameSite=Lax`;
  document.cookie = `googtrans=${value}; ${expires}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
}

function initGoogleTranslate() {
  if (!window.google?.translate?.TranslateElement) return;

  new window.google.translate.TranslateElement(
    {
      pageLanguage: 'es',
      includedLanguages: 'es,en',
      autoDisplay: false,
    },
    'google_translate_element'
  );
}

function loadGoogleTranslate() {
  window.googleTranslateElementInit = initGoogleTranslate;

  if (document.getElementById(SCRIPT_ID)) {
    initGoogleTranslate();
    return;
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.body.appendChild(script);
}

export default function LanguageToggle({ floating = false }: { floating?: boolean }) {
  const [locale, setLocale] = useState<Locale>('es');

  useEffect(() => {
    const savedLocale = (localStorage.getItem(STORAGE_KEY) as Locale | null) || 'es';
    setLocale(savedLocale);
    document.documentElement.lang = savedLocale === 'en' ? 'en' : 'es';
    setTranslateCookie(savedLocale);
    loadGoogleTranslate();
  }, []);

  const selectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale === 'en' ? 'en' : 'es';
    setTranslateCookie(nextLocale);
    window.location.reload();
  };

  return (
    <div
      className={
        floating
          ? 'notranslate fixed bottom-4 right-4 z-[60] flex rounded-full border border-gray-200 bg-white p-1 shadow-lg'
          : 'notranslate inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm'
      }
      aria-label="Cambiar idioma"
      translate="no"
    >
      <div id="google_translate_element" className="hidden" />
      {(['es', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => selectLocale(item)}
          className={`min-w-10 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            locale === item
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
