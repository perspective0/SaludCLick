'use client';

import { useEffect } from 'react';
import { apiRequest } from '@/utils/api';

export default function RuntimeSettings() {
  useEffect(() => {
    apiRequest('/admin/public-settings').then((response) => {
      const { general, appearance } = response.data || {};
      if (general?.siteName) document.title = general.siteName;
      if (general?.siteDescription) document.querySelector('meta[name="description"]')?.setAttribute('content', general.siteDescription);
      if (appearance?.primaryColor) document.documentElement.style.setProperty('--brand-primary', appearance.primaryColor);
      if (appearance?.secondaryColor) document.documentElement.style.setProperty('--brand-secondary', appearance.secondaryColor);
      if (typeof appearance?.darkMode === 'boolean') {
        document.documentElement.classList.toggle('dark', appearance.darkMode);
        document.documentElement.style.colorScheme = appearance.darkMode ? 'dark' : 'light';
      }
    }).catch(() => undefined);
  }, []);
  return null;
}
