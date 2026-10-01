'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    saludclickInstallPrompt?: Event;
  }
}

export default function PWARegistration() {
  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.saludclickInstallPrompt = event;
      window.dispatchEvent(new Event('saludclick:install-available'));
    };

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);

    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // La aplicación sigue funcionando normalmente si el navegador
        // no permite registrar el service worker.
      });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  return null;
}
