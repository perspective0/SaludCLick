'use client';

import { useState, useEffect } from 'react';

export default function LanguageToggle() {
  const [locale, setLocale] = useState<'es'|'en'>('es');

  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (path.startsWith('/en')) setLocale('en');
    else setLocale('es');
  }, []);

  const toggle = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const rest = path.replace(/^\/(en|es)/, '') || '/';
    const target = locale === 'en' ? `/es${rest}` : `/en${rest}`;
    window.location.href = target;
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded-md border border-white/10 bg-white/10 text-sm text-white/90 hover:opacity-90"
      aria-label="Cambiar idioma"
    >
      {locale === 'en' ? 'EN' : 'ES'}
    </button>
  );
}
