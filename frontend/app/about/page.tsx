import Image from 'next/image';
import Link from 'next/link';
import { CalendarCheck, HeartPulse, ShieldCheck, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/88 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/">
            <Image src="/saludclick.png" alt="SaludClick" width={260} height={120} className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 text-sm font-semibold text-slate-600 lg:flex">
              <Link href="/about" className="text-sky-700">Sobre nosotros</Link>
              <Link href="/faq" className="hover:text-sky-700">FAQ</Link>
              <Link href="/contact" className="hover:text-sky-700">Contacto</Link>
              <Link href="/developer" className="hover:text-sky-700">Desarrollador</Link>
            </div>
            <Link href="/login" className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100">Iniciar sesion</Link>
            <Link href="/register" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-sky-700">Registrarse</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-slate-600 md:px-8 lg:hidden">
          <Link href="/about" className="shrink-0 rounded-lg px-3 py-2 bg-sky-50 text-sky-700">Sobre nosotros</Link>
          <Link href="/faq" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">FAQ</Link>
          <Link href="/contact" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Contacto</Link>
          <Link href="/developer" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Desarrollador</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">
            <HeartPulse className="h-4 w-4" />
            Sobre nosotros
          </div>
          <h1 className="text-4xl font-black md:text-5xl">SaludClick nace para hacer mas simple la atencion medica digital</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            La plataforma ayuda a pacientes a encontrar medicos, agendar citas y mantener informacion importante organizada. Para profesionales, ofrece una forma clara de administrar perfil, centros, horarios, consultas y seguimiento.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <HeartPulse className="mb-4 h-8 w-8 text-sky-600" />
          <h2 className="text-2xl font-black text-slate-950">Nuestra idea central</h2>
          <p className="mt-4 leading-7 text-slate-600">
            Reducir friccion en los procesos de salud: menos llamadas perdidas, menos informacion dispersa y mas claridad para pacientes, doctores y administradores.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Value icon={CalendarCheck} title="Agenda clara" text="Citas, horarios y centros se organizan en un flujo facil de revisar." />
          <Value icon={ShieldCheck} title="Validacion responsable" text="Los medicos pasan por revision de credenciales antes de activar su cuenta." />
          <Value icon={Users} title="Conexion real" text="Pacientes, medicos, secretarias y administracion trabajan sobre la misma informacion." />
        </div>
      </section>
    </main>
  );
}

function Value({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6">
      <Icon className="mb-4 h-7 w-7 text-sky-600" />
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </article>
  );
}
