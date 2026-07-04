'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { 
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Stethoscope,
  Building2,
  Calendar,
  Save,
  Globe,
  Lock,
  Mail,
  Phone,
  CreditCard,
  Palette,
  Database,
  Upload,
  Image,
  AlertCircle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Download,
  Server
} from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  
  // Configuración General
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'SaludClick',
    siteDescription: 'Tu plataforma de salud digital',
    adminEmail: 'admin@saludclick.com',
    supportPhone: '+1 829 386 1067',
    timezone: 'America/Santo_Domingo',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
  });

  // Configuración de Seguridad
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireSpecialChars: true,
    requireNumbers: true,
    ipWhitelist: '',
  });

  // Configuración de Notificaciones
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    newAppointmentAlert: true,
    appointmentReminder: true,
    newDoctorRequest: true,
    systemAlerts: true,
    marketingEmails: false,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
  });

  // Configuración de Apariencia
  const [appearanceSettings, setAppearanceSettings] = useState({
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    logo: null,
    favicon: null,
    darkMode: false,
    showHeroSection: true,
    showTestimonials: true,
  });

  // Configuración de Sistema
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true,
    maxUploadSize: '10',
    allowedFileTypes: 'jpg,png,pdf,doc,docx',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await adminAPI.getSettings();
      const settings = response.data || {};

      if (settings.general) setGeneralSettings(settings.general);
      if (settings.security) setSecuritySettings(settings.security);
      if (settings.notifications) setNotificationSettings(settings.notifications);
      if (settings.appearance) setAppearanceSettings(settings.appearance);
      if (settings.system) setSystemSettings(settings.system);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async (section: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      let payload: any = generalSettings;
      switch (section) {
        case 'general':
          payload = generalSettings;
          break;
        case 'security':
          payload = securitySettings;
          break;
        case 'notifications':
          payload = notificationSettings;
          break;
        case 'appearance':
          payload = appearanceSettings;
          break;
        case 'system':
          payload = systemSettings;
          break;
      }

      await adminAPI.updateSettings(section, payload);
      
      setSuccess('Configuración guardada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
    { id: 'system', label: 'Sistema', icon: Server },
  ];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">SaludClick</h1>
                  <p className="text-xs text-gray-500">Panel Admin</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3 px-2">
                Principal
              </p>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5" />
                Usuarios
              </Link>
              <Link
                href="/admin/doctor-requests"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Stethoscope className="w-5 h-5" />
                Solicitudes Médicos
              </Link>
              <Link
                href="/admin/appointments"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Citas médicas
              </Link>

              <p className="text-xs font-semibold text-gray-400 uppercase mb-3 mt-6 px-2">
                Gestión
              </p>
              <Link
                href="/admin/health-centers"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                Centros de Salud
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Reportes
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium"
              >
                <Settings className="w-5 h-5" />
                Configuración
              </Link>
            </nav>

            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">Administrador</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Contenido Principal */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="bg-white shadow-sm sticky top-0 z-30">
            <div className="px-4 md:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Configuración
                  </h1>
                  <p className="text-sm text-gray-500">
                    Administra la configuración del sistema
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {/* Mensajes */}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="flex gap-6">
              {/* Tabs */}
              <div className="w-64 flex-shrink-0 hidden md:block">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabs móviles */}
              <div className="md:hidden mb-4 w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenido de configuración */}
              <div className="flex-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                  {/* General Settings */}
                  {activeTab === 'general' && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Globe className="w-6 h-6 text-blue-600" />
                        Configuración General
                      </h2>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nombre del Sitio
                            </label>
                            <input
                              type="text"
                              value={generalSettings.siteName}
                              onChange={(e) => setGeneralSettings({...generalSettings, siteName: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Administrativo
                            </label>
                            <div className="relative">
                              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                value={generalSettings.adminEmail}
                                onChange={(e) => setGeneralSettings({...generalSettings, adminEmail: e.target.value})}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Teléfono de Soporte
                            </label>
                            <div className="relative">
                              <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={generalSettings.supportPhone}
                                onChange={(e) => setGeneralSettings({...generalSettings, supportPhone: e.target.value})}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Zona Horaria
                            </label>
                            <select
                              value={generalSettings.timezone}
                              onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="America/Santo_Domingo">America/Santo Domingo (GMT-4)</option>
                              <option value="America/New_York">America/New York (GMT-5)</option>
                              <option value="America/Mexico_City">America/Mexico City (GMT-6)</option>
                              <option value="America/Bogota">America/Bogota (GMT-5)</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descripción del Sitio
                            </label>
                            <textarea
                              value={generalSettings.siteDescription}
                              onChange={(e) => setGeneralSettings({...generalSettings, siteDescription: e.target.value})}
                              rows={3}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Settings */}
                  {activeTab === 'security' && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Lock className="w-6 h-6 text-blue-600" />
                        Configuración de Seguridad
                      </h2>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Autenticación de Dos Factores (2FA)</p>
                            <p className="text-sm text-gray-500">Requiere verificación adicional al iniciar sesión</p>
                          </div>
                          <button
                            onClick={() => setSecuritySettings({...securitySettings, twoFactorAuth: !securitySettings.twoFactorAuth})}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              securitySettings.twoFactorAuth ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                          >
                            <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                              securitySettings.twoFactorAuth ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tiempo de Sesión (minutos)
                            </label>
                            <input
                              type="number"
                              value={securitySettings.sessionTimeout}
                              onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Máximos Intentos de Login
                            </label>
                            <input
                              type="number"
                              value={securitySettings.maxLoginAttempts}
                              onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Longitud Mínima de Contraseña
                            </label>
                            <input
                              type="number"
                              value={securitySettings.passwordMinLength}
                              onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notification Settings */}
                  {activeTab === 'notifications' && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-blue-600" />
                        Configuración de Notificaciones
                      </h2>
                      
                      <div className="space-y-4">
                        {[
                          { key: 'emailNotifications', label: 'Notificaciones por Email', desc: 'Enviar notificaciones por correo electrónico' },
                          { key: 'newAppointmentAlert', label: 'Alertas de nuevas citas médicas', desc: 'Notificar cuando se agenda una nueva cita médica' },
                          { key: 'appointmentReminder', label: 'Recordatorios de citas médicas', desc: 'Enviar recordatorios automáticos' },
                          { key: 'newDoctorRequest', label: 'Solicitudes de Médicos', desc: 'Notificar nuevas solicitudes de registro' },
                          { key: 'systemAlerts', label: 'Alertas del Sistema', desc: 'Notificaciones de errores y mantenimiento' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                              <p className="font-medium text-gray-900">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => setNotificationSettings({
                                ...notificationSettings,
                                [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings]
                              })}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                notificationSettings[item.key as keyof typeof notificationSettings]
                                  ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                                notificationSettings[item.key as keyof typeof notificationSettings]
                                  ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Appearance Settings */}
                  {activeTab === 'appearance' && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Palette className="w-6 h-6 text-blue-600" />
                        Apariencia
                      </h2>
                      
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Color Primario
                            </label>
                            <div className="flex gap-3">
                              <input
                                type="color"
                                value={appearanceSettings.primaryColor}
                                onChange={(e) => setAppearanceSettings({...appearanceSettings, primaryColor: e.target.value})}
                                className="w-12 h-12 rounded-lg cursor-pointer border-0"
                              />
                              <input
                                type="text"
                                value={appearanceSettings.primaryColor}
                                onChange={(e) => setAppearanceSettings({...appearanceSettings, primaryColor: e.target.value})}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Color Secundario
                            </label>
                            <div className="flex gap-3">
                              <input
                                type="color"
                                value={appearanceSettings.secondaryColor}
                                onChange={(e) => setAppearanceSettings({...appearanceSettings, secondaryColor: e.target.value})}
                                className="w-12 h-12 rounded-lg cursor-pointer border-0"
                              />
                              <input
                                type="text"
                                value={appearanceSettings.secondaryColor}
                                onChange={(e) => setAppearanceSettings({...appearanceSettings, secondaryColor: e.target.value})}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Modo Oscuro</p>
                            <p className="text-sm text-gray-500">Activar tema oscuro en la plataforma</p>
                          </div>
                          <button
                            onClick={() => setAppearanceSettings({...appearanceSettings, darkMode: !appearanceSettings.darkMode})}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              appearanceSettings.darkMode ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                          >
                            <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                              appearanceSettings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* System Settings */}
                  {activeTab === 'system' && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Server className="w-6 h-6 text-blue-600" />
                        Configuración del Sistema
                      </h2>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Modo Mantenimiento</p>
                            <p className="text-sm text-gray-500">Deshabilitar acceso a usuarios mientras se realizan actualizaciones</p>
                          </div>
                          <button
                            onClick={() => setSystemSettings({...systemSettings, maintenanceMode: !systemSettings.maintenanceMode})}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              systemSettings.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                          >
                            <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                              systemSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Modo Debug</p>
                            <p className="text-sm text-gray-500">Mostrar errores detallados (solo desarrollo)</p>
                          </div>
                          <button
                            onClick={() => setSystemSettings({...systemSettings, debugMode: !systemSettings.debugMode})}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              systemSettings.debugMode ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                          >
                            <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                              systemSettings.debugMode ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tamaño Máximo de Subida (MB)
                            </label>
                            <input
                              type="number"
                              value={systemSettings.maxUploadSize}
                              onChange={(e) => setSystemSettings({...systemSettings, maxUploadSize: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipos de Archivo Permitidos
                            </label>
                            <input
                              type="text"
                              value={systemSettings.allowedFileTypes}
                              onChange={(e) => setSystemSettings({...systemSettings, allowedFileTypes: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800">Zona de Peligro</p>
                              <p className="text-sm text-yellow-600 mb-3">
                                Las siguientes acciones pueden afectar el funcionamiento del sistema
                              </p>
                              <div className="flex gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                                  <Trash2 className="w-4 h-4" />
                                  Limpiar Cache
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                                  <Database className="w-4 h-4" />
                                  Resetear Base de Datos
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botón de Guardar */}
                  <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleSave(activeTab)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
