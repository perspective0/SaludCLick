'use client';

import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_AT_KEY = 'saludclick_install_notice_dismissed_at';
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY));
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function isAppAlreadyInstalled() {
  if (typeof window === 'undefined') return false;

  const standalone =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return standalone || iosStandalone;
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const touchEnabledIpad =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || touchEnabledIpad;
}

export default function InstallAppNotice() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (isAppAlreadyInstalled() || wasRecentlyDismissed()) return;

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowNotice(true);
    };

    const handleInstalled = () => {
      setShowNotice(false);
      setInstallPrompt(null);
      try {
        localStorage.removeItem(DISMISSED_AT_KEY);
      } catch {
        // No es necesario guardar nada para completar la instalación.
      }
    };

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosDevice()) {
      setShowIosInstructions(true);
      iosTimer = setTimeout(() => setShowNotice(true), 1200);
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleInstallAvailable
      );
      window.removeEventListener('appinstalled', handleInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismissNotice = () => {
    setShowNotice(false);
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      // El aviso puede cerrarse aunque el navegador no permita guardar datos.
    }
  };

  const installApp = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    setShowNotice(false);
    setInstallPrompt(null);

    if (choice.outcome === 'dismissed') {
      try {
        localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
      } catch {
        // No es necesario guardar nada para continuar usando SaludClick.
      }
    }
  };

  if (!showNotice) return null;

  return (
    <aside
      className="notranslate fixed bottom-32 left-4 right-4 z-[70] rounded-2xl border border-sky-100 bg-white p-5 text-slate-900 shadow-2xl shadow-sky-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:bottom-4 md:right-auto md:w-[28rem]"
      aria-labelledby="install-app-title"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      translate="no"
    >
      <button
        type="button"
        onClick={dismissNotice}
        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Cerrar aviso"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex gap-4 pr-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          {showIosInstructions ? (
            <Share2 className="h-6 w-6" />
          ) : (
            <Download className="h-6 w-6" />
          )}
        </div>

        <div>
          <h2 id="install-app-title" className="text-lg font-bold">
            Lleva SaludClick contigo
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {showIosInstructions
              ? 'Puedes guardarlo en tu iPhone. Toca Compartir y luego elige “Añadir a pantalla de inicio”.'
              : 'Guárdalo en tu dispositivo y abre SaludClick como cualquier otra aplicación.'}
          </p>
        </div>
      </div>

      {installPrompt && (
        <button
          type="button"
          onClick={installApp}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 dark:focus:ring-sky-900"
        >
          <Download className="h-5 w-5" />
          Instalar SaludClick
        </button>
      )}
    </aside>
  );
}
