import Image from 'next/image';
import Link from 'next/link';
import { Code2, Database, HeartHandshake, Layers, Shield, Smartphone, UserRound } from 'lucide-react';

export default function DeveloperPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-950">
      <style>{`
        @keyframes codeDrift {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: .22; }
          50% { transform: translate3d(12px, -18px, 0); opacity: .42; }
        }

        @keyframes cursorBlink {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        @keyframes gridPulse {
          0%, 100% { opacity: .22; }
          50% { opacity: .38; }
        }

        .dev-code-float { animation: codeDrift 7s ease-in-out infinite; }
        .dev-code-float:nth-child(2) { animation-delay: 1.4s; }
        .dev-code-float:nth-child(3) { animation-delay: 2.8s; }
        .dev-grid { animation: gridPulse 5s ease-in-out infinite; }
        .dev-cursor { animation: cursorBlink 1.1s steps(1) infinite; }

        @media (prefers-reduced-motion: reduce) {
          .dev-code-float, .dev-grid, .dev-cursor { animation: none !important; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="dev-grid absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.12)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="dev-code-float absolute left-8 top-36 hidden rounded-2xl border border-sky-300/20 bg-white/5 px-5 py-4 font-mono text-sm text-cyan-100 backdrop-blur md:block">
          const product = &quot;SaludClick&quot;;
        </div>
        <div className="dev-code-float absolute right-10 top-64 hidden rounded-2xl border border-sky-300/20 bg-white/5 px-5 py-4 font-mono text-sm text-cyan-100 backdrop-blur lg:block">
          deploy(&quot;healthcare&quot;)
        </div>
        <div className="dev-code-float absolute bottom-24 left-20 hidden rounded-2xl border border-sky-300/20 bg-white/5 px-5 py-4 font-mono text-sm text-cyan-100 backdrop-blur md:block">
          SELECT care, trust FROM platform;
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/88 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/">
            <Image src="/saludclick.png" alt="SaludClick" width={260} height={120} className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 text-sm font-semibold text-slate-600 lg:flex">
              <Link href="/about" className="hover:text-sky-700">Sobre nosotros</Link>
              <Link href="/faq" className="hover:text-sky-700">FAQ</Link>
              <Link href="/contact" className="hover:text-sky-700">Contacto</Link>
              <Link href="/developer" className="text-sky-700">Desarrollador</Link>
            </div>
            <Link href="/login" className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100">Iniciar sesion</Link>
            <Link href="/register" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-sky-700">Registrarse</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-slate-600 md:px-8 lg:hidden">
          <Link href="/about" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Sobre nosotros</Link>
          <Link href="/faq" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">FAQ</Link>
          <Link href="/contact" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Contacto</Link>
          <Link href="/developer" className="shrink-0 rounded-lg px-3 py-2 bg-sky-50 text-sky-700">Desarrollador</Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-sky-950/20 backdrop-blur">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">
            <Code2 className="h-4 w-4" />
            Desarrollador
          </div>
          <h1 className="text-4xl font-black md:text-5xl">
            Francisco Leocadio<span className="dev-cursor text-sky-600">_</span>
          </h1>
          <p className="mt-3 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-cyan-100">
            Ingeniero en Sistemas
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            SaludClick es un proyecto pensado, construido y mantenido con foco en resolver problemas reales de gestion medica: solicitudes, validaciones, agenda, centros, recetas, notificaciones y experiencia para pacientes.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
          <UserRound className="mb-4 h-8 w-8 text-sky-600" />
          <h2 className="text-2xl font-black text-slate-950">Sobre mi</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-600">
            Soy Francisco Leocadio, ingeniero en sistemas y desarrollador de SaludClick. Mi enfoque es construir soluciones utiles, claras y mantenibles para procesos reales, especialmente donde la tecnologia puede ahorrar tiempo y reducir friccion.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Tech icon={Code2} title="Producto a medida" text="Flujos adaptados a SaludClick, no una plantilla generica." />
          <Tech icon={Database} title="Datos organizados" text="Pacientes, medicos, citas, centros y documentos bajo una estructura clara." />
          <Tech icon={Smartphone} title="Experiencia practica" text="Pantallas pensadas para uso diario en web y movil." />
          <Tech icon={Shield} title="Cuidado de acceso" text="Roles, validaciones y permisos para proteger informacion sensible." />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Tech icon={Layers} title="Lo que construye SaludClick" text="Registro medico, validacion de documentos, centros multiples, disponibilidad por sede, reservas, recetas e historial." />
          <Tech icon={HeartHandshake} title="Lo que viene" text="Recordatorios por WhatsApp, mejoras de aprobacion, reportes administrativos y mas herramientas para operacion diaria." />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <HeartHandshake className="mb-4 h-8 w-8 text-sky-600" />
          <h2 className="text-2xl font-black text-slate-950">Nota del desarrollador</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-600">
            Este espacio puede crecer con enlaces profesionales, portafolio, redes, roadmap publico, version del sistema y formas de contacto directo para colaboraciones o soporte.
          </p>
        </div>
      </section>
    </main>
  );
}

function Tech({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg">
      <Icon className="mb-4 h-7 w-7 text-sky-600" />
      <h2 className="font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}
