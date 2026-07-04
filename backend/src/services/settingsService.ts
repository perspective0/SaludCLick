import { query } from '../db';

export type SettingsSection = 'general' | 'security' | 'notifications' | 'appearance' | 'system';

const defaults: Record<SettingsSection, Record<string, any>> = {
  general: { siteName: 'SaludClick', siteDescription: 'Tu plataforma de salud digital', adminEmail: '', supportPhone: '', timezone: 'America/Santo_Domingo', language: 'es', dateFormat: 'DD/MM/YYYY' },
  security: { twoFactorAuth: false, sessionTimeout: '30', maxLoginAttempts: '5', passwordMinLength: '8', requireSpecialChars: true, requireNumbers: true, ipWhitelist: '' },
  notifications: { emailNotifications: true, smsNotifications: false, newAppointmentAlert: true, appointmentReminder: true, newDoctorRequest: true, systemAlerts: true, marketingEmails: false, smtpHost: '', smtpPort: '587', smtpUser: '', smtpPassword: '' },
  appearance: { primaryColor: '#0ea5e9', secondaryColor: '#06b6d4', darkMode: false, showHeroSection: true, showTestimonials: true },
  system: { autoBackup: true, backupFrequency: 'daily', maintenanceMode: false, debugMode: false, cacheEnabled: true, maxUploadSize: '10', allowedFileTypes: 'jpg,png,pdf,doc,docx' },
};

let cache: Partial<Record<SettingsSection, Record<string, any>>> = {};

export async function ensureSettingsTable() {
  await query(`CREATE TABLE IF NOT EXISTS admin_settings (section VARCHAR(50) PRIMARY KEY, settings JSONB NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
}

export async function getSettings(section?: SettingsSection) {
  await ensureSettingsTable();
  if (section && cache[section]) return { ...defaults[section], ...cache[section] };
  const result = await query(section ? 'SELECT section, settings FROM admin_settings WHERE section = $1' : 'SELECT section, settings FROM admin_settings', section ? [section] : []);
  for (const row of result.rows) cache[row.section as SettingsSection] = row.settings || {};
  if (section) return { ...defaults[section], ...(cache[section] || {}) };
  return Object.fromEntries((Object.keys(defaults) as SettingsSection[]).map((key) => [key, { ...defaults[key], ...(cache[key] || {}) }]));
}

export function invalidateSettings(section?: SettingsSection) {
  if (section) delete cache[section]; else cache = {};
}

export async function getPublicSettings() {
  const all = await getSettings() as any;
  return { general: all.general, appearance: all.appearance, system: { maintenanceMode: all.system.maintenanceMode } };
}
