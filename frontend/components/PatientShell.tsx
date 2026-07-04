'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, FileText, Home, LogOut, Menu, MessageCircle, Search, Stethoscope, UserRound, X } from 'lucide-react';
import NotificationBell from './NotificationBell';

const navItems = [
  { href: '/patient/dashboard', label: 'Inicio', icon: Home },
  { href: '/doctors', label: 'Médicos', icon: Stethoscope },
  { href: '/patient/appointments', label: 'Citas', icon: CalendarDays },
  { href: '/patient/prescriptions', label: 'Recetas', icon: FileText },
  { href: '/patient/documents', label: 'Documentos', icon: FileText },
  { href: '/patient/profile', label: 'Perfil', icon: UserRound },
  { href: '/patient/feedback', label: 'Ayuda y sugerencias', icon: MessageCircle },
];

export default function PatientShell({
  title,
  subtitle,
  children,
  actions,
  backHref,
  backLabel = 'Volver',
  hideBack = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  hideBack?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const defaultBackHref = getPatientBackHref(pathname);
  const resolvedBackHref = backHref || defaultBackHref;
  const showBack = !hideBack && Boolean(resolvedBackHref);

  return (
    <div className="dashboard-shell min-h-screen text-gray-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 lg:inset-auto h-screen ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-gray-100 p-4">
              <Link href="/patient/dashboard" className="flex items-center">
                <Image src="/saludclick.png" alt="SaludClick" width={260} height={110} priority className="h-14 w-auto" />
              </Link>
              <p className="mt-2 px-1 text-sm font-medium text-gray-500">Portal del paciente</p>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase text-gray-400">Tu salud</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <Search className="mb-3 h-5 w-5 text-blue-700" />
                <p className="text-sm font-bold text-blue-950">Encuentra atención</p>
                <p className="mt-1 text-sm leading-5 text-blue-700">Busca médicos y agenda una cita cuando lo necesites.</p>
                <Link href="/doctors" className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700">
                  Buscar médicos
                </Link>
              </div>
            </nav>

            <div className="border-t border-gray-100 p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  {user?.firstName?.[0] || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">Paciente</p>
                </div>
              </div>
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="min-w-0 flex-1">
          <header className="dashboard-header sticky top-0 z-30">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Abrir menú">
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                {showBack && (
                  <Link
                    href={resolvedBackHref}
                    className="hidden h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:inline-flex"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                  </Link>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold md:text-2xl">{title}</h1>
                  {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />
                {actions}
              </div>
            </div>
          </header>

          <main className="px-4 py-6 md:px-8">
            {showBack && (
              <Link
                href={resolvedBackHref}
                className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function getPatientBackHref(pathname: string | null) {
  if (!pathname || pathname === '/patient/dashboard') return '';
  if (pathname.startsWith('/patient/prescriptions/')) return '/patient/prescriptions';
  if (pathname.startsWith('/patient/documents/')) return '/patient/documents';
  if (pathname.startsWith('/patient/appointments/')) return '/patient/appointments';
  if (pathname.startsWith('/doctors/')) return '/doctors';
  if (pathname.startsWith('/patient')) return '/patient/dashboard';
  if (pathname.startsWith('/doctors')) return '/patient/dashboard';
  return '/patient/dashboard';
}
