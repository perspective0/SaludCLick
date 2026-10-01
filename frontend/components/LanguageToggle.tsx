'use client';

import { useI18n, type Locale } from '@/i18n';

export default function LanguageToggle({ floating = false }: { floating?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={
        floating
          ? 'notranslate fixed bottom-4 right-4 z-[60] flex rounded-full border border-gray-200 bg-white p-1 shadow-lg'
          : 'notranslate inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm'
      }
      aria-label={t('language')}
      translate="no"
    >
      {(['es', 'en'] as Locale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          aria-label={item === 'es' ? t('spanish') : t('english')}
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
