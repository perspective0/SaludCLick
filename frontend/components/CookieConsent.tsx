'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Cookie, Settings, X } from 'lucide-react';
import { useI18n } from '@/i18n';

// Versionada para reiniciar el consentimiento después de cambios en el flujo.
const CONSENT_KEY = 'saludclick_cookie_consent_v2';
type ConsentChoice = 'accepted' | 'rejected' | 'custom';

export default function CookieConsent() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (!saved) setVisible(true);
    else setAnalytics(saved === 'accepted');
  }, []);

  const saveChoice = (choice: ConsentChoice, analyticsEnabled: boolean) => {
    localStorage.setItem(CONSENT_KEY, choice);
    setAnalytics(analyticsEnabled);
    setVisible(false);
    setSettingsOpen(false);
    window.dispatchEvent(new CustomEvent('saludclick:cookie-consent', {
      detail: { analytics: analyticsEnabled },
    }));
  };

  if (!visible) return null;

  return (
    <div translate="no" className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-5" role="dialog" aria-label={en ? 'Cookie preferences' : 'Preferencias de cookies'}>
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex dark:bg-blue-500/15">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">{en ? 'Your privacy matters' : 'Tu privacidad importa'}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {en ? 'We use essential cookies to sign in and protect SaludClick. Analytics cookies are optional and currently do not activate any external service.' : 'Usamos cookies esenciales para iniciar sesión y proteger SaludClick. Las cookies analíticas son opcionales y actualmente no activan ningún servicio externo.'}
                </p>
              </div>
              <button type="button" onClick={() => saveChoice('rejected', false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label={en ? 'Reject optional cookies' : 'Rechazar cookies opcionales'}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {settingsOpen && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{en ? 'Essential cookies' : 'Cookies esenciales'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{en ? 'Session and security. Always active.' : 'Sesión y seguridad. Siempre activas.'}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{en ? 'Required' : 'Necesarias'}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{en ? 'Analytics cookies' : 'Cookies analíticas'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{en ? 'Help improve the service with aggregated data.' : 'Ayudan a mejorar el servicio con datos agregados.'}</p>
                  </div>
                  <button type="button" onClick={() => setAnalytics(!analytics)} className={`relative h-6 w-11 rounded-full transition ${analytics ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} aria-pressed={analytics} aria-label={en ? 'Enable analytics cookies' : 'Activar cookies analíticas'}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${analytics ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/privacy" className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-300">{en ? 'Read privacy policy' : 'Leer política de privacidad'}</Link>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Settings className="h-4 w-4" /> {en ? 'Configure' : 'Configurar'}
                </button>
                {settingsOpen ? (
                  <button type="button" onClick={() => saveChoice(analytics ? 'custom' : 'rejected', analytics)} className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">{en ? 'Save selection' : 'Guardar selección'}</button>
                ) : (
                  <button type="button" onClick={() => saveChoice('accepted', true)} className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">{en ? 'Accept optional' : 'Aceptar opcionales'}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
