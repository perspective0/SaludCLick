'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Beaker,
  Building2,
  CalendarCheck,
  CreditCard,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

const navigation = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/doctor-requests', label: 'Solicitudes Médicos', icon: Stethoscope },
  { href: '/admin/featured-doctors', label: 'Especialistas destacados', icon: Stethoscope },
  { href: '/admin/appointments', label: 'Citas médicas', icon: CalendarCheck },
  { href: '/admin/doctor-payments', label: 'Pagos Médicos', icon: CreditCard },
  { href: '/admin/health-centers', label: 'Centros de Salud', icon: Building2 },
  { href: '/admin/laboratories', label: 'Laboratorios', icon: Beaker },
  { href: '/admin/feedback', label: 'Preguntas y Recomendaciones', icon: MessageSquare },
  { href: '/admin/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ firstName?: string; lastName?: string } | null>(null);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow lg:hidden"
        aria-label="Abrir menú administrativo"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 h-dvh w-[min(18rem,88vw)] transform transition-transform duration-300 lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4">
            <Link href="/admin" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
              <Shield className="h-7 w-7 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900">SaludClick</h1>
                <p className="text-xs text-slate-500">Panel Admin</p>
              </div>
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Cerrar menú administrativo">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase text-slate-400">Administración</p>
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 break-words">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto shrink-0 border-t border-slate-200 p-3">
            <div className="mb-2 flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500">Administrador</p>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>
      {open && <button type="button" aria-label="Cerrar menú administrativo" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}