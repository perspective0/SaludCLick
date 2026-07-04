'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  HelpCircle,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react';

type AnimatedCounterProps = {
  end: number;
  suffix?: string;
  duration?: number;
};

type Audience = 'paciente' | 'medico';

function AnimatedCounter({ end, suffix = '', duration = 1800 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated) return;

        setHasAnimated(true);
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          setCount(Math.floor(end * eased));

          if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [duration, end, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [audience, setAudience] = useState<Audience>('paciente');
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setIsScrolled(window.scrollY > 12);
      setScrollProgress(Math.min(window.scrollY / maxScroll, 1));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    { end: 500, label: 'medicos verificados', suffix: '+', icon: Users },
    { end: 10, label: 'citas gestionadas', suffix: 'K+', icon: CalendarCheck },
    { end: 99, label: 'satisfaccion', suffix: '%', icon: Star },
  ];

  const features = [
    {
      icon: CalendarCheck,
      title: 'Agenda sin friccion',
      description: 'Encuentra disponibilidad, confirma tu hora y recibe recordatorios automaticos desde una sola experiencia.',
      tone: 'from-sky-500 to-cyan-500',
    },
    {
      icon: ShieldCheck,
      title: 'Informacion protegida',
      description: 'Historial, recetas y atenciones quedan ordenadas con acceso seguro para pacientes y profesionales.',
      tone: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Video,
      title: 'Atencion conectada',
      description: 'Flujos preparados para consulta presencial, teleconsulta y seguimiento posterior a cada cita.',
      tone: 'from-indigo-500 to-sky-500',
    },
  ];

  const steps = audience === 'paciente'
    ? [
        'Busca por especialidad o centro medico',
        'Elige el horario que mejor calza contigo',
        'Recibe confirmacion, recordatorio e historial',
      ]
    : [
        'Recibe solicitudes de pacientes ordenadas',
        'Administra agenda, ficha y consulta en un lugar',
        'Mantiene seguimiento profesional despues de atender',
      ];

  const faqs = [
    {
      question: '¿Necesito registrarme para buscar medicos?',
      answer: 'Puedes explorar medicos y especialidades desde la pantalla principal. Para agendar, confirmar citas y ver tu historial, necesitas crear una cuenta de paciente.',
    },
    {
      question: '¿SaludClick ofrece consultas medicas directamente?',
      answer: 'SaludClick conecta pacientes con profesionales y centros de salud. La atencion, diagnostico y tratamiento siempre dependen del medico que selecciones.',
    },
    {
      question: '¿Puedo agendar citas presenciales y teleconsultas?',
      answer: 'Si. La disponibilidad depende de cada medico o centro, y en la cita podras ver si la atencion es presencial, virtual o ambas modalidades.',
    },
    {
      question: '¿Donde veo mis recetas e historial?',
      answer: 'Al iniciar sesion como paciente tendras acceso a tus citas, recetas, perfil e informacion medica organizada desde tu dashboard.',
    },
    {
      question: '¿Mis datos personales y de seguro son visibles para todos?',
      answer: 'No. Esa informacion se muestra solo al medico y al personal autorizado relacionado con tu cita, para facilitar la atencion y la gestion administrativa.',
    },
  ];

  return (
    <div className="home-page min-h-screen bg-slate-50 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MedicalOrganization',
            name: 'SaludClick',
            description: 'Plataforma de salud digital que conecta pacientes con medicos especializados.',
            url: 'https://saludclick.com',
            logo: 'https://saludclick.com/saludclick.png',
          }),
        }}
      />

      <style>{`
        .home-shell {
          --mouse-x: ${pointer.x}%;
          --mouse-y: ${pointer.y}%;
          --scroll-progress: ${scrollProgress};
        }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes softFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes scanLine {
          from { transform: translateY(-100%); }
          to { transform: translateY(320%); }
        }

        .rise-in { animation: riseIn 620ms ease both; }
        .soft-float { animation: softFloat 5s ease-in-out infinite; }
        .scan-line { animation: scanLine 4s ease-in-out infinite; }
        .hero-light {
          background:
            radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(14, 165, 233, 0.18), transparent 28rem),
            linear-gradient(135deg, #f8fafc 0%, #ecfeff 45%, #ffffff 100%);
        }

        .dark .home-page {
          background: #020617;
          color: #e2e8f0;
        }

        .dark .hero-light {
          background:
            radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(14, 165, 233, 0.22), transparent 30rem),
            linear-gradient(135deg, #020617 0%, #082f49 48%, #0f172a 100%);
        }

        .dark .home-page nav {
          background-color: rgba(2, 6, 23, 0.86) !important;
          border-color: rgba(51, 65, 85, 0.85) !important;
        }

        .dark .home-hero-title {
          color: #f8fafc !important;
          text-shadow: 0 12px 46px rgba(56, 189, 248, 0.18);
        }

        .dark .home-hero-copy {
          color: #cbd5e1 !important;
        }

        .dark .home-pill,
        .dark .home-surface {
          background-color: rgba(15, 23, 42, 0.84) !important;
          border-color: rgba(56, 189, 248, 0.24) !important;
          color: #e2e8f0 !important;
        }

        .dark .home-section-light {
          background-color: #0f172a !important;
        }

        .dark .home-section-muted {
          background-color: #020617 !important;
        }

        .dark .home-card {
          background-color: rgba(15, 23, 42, 0.92) !important;
          border-color: rgba(51, 65, 85, 0.95) !important;
        }

        .dark .home-card-title {
          color: #f8fafc !important;
        }

        .dark .home-card-text {
          color: #cbd5e1 !important;
        }

        .dark .home-secondary-button {
          background-color: rgba(15, 23, 42, 0.94) !important;
          border-color: rgba(56, 189, 248, 0.35) !important;
          color: #e0f2fe !important;
        }

        .parallax-layer {
          transform: translate3d(0, calc(var(--scroll-progress) * var(--parallax-distance, 80px)), 0);
          transition: transform 120ms linear;
          will-change: transform;
        }

        .parallax-reverse {
          transform: translate3d(0, calc(var(--scroll-progress) * var(--parallax-distance, -70px)), 0);
          transition: transform 120ms linear;
          will-change: transform;
        }

        .interactive-card {
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }

        .interactive-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
          border-color: rgba(14, 165, 233, 0.45);
        }

        @media (prefers-reduced-motion: reduce) {
          .rise-in, .soft-float, .scan-line {
            animation: none !important;
          }

          .parallax-layer,
          .parallax-reverse {
            transform: none !important;
            transition: none !important;
          }

          .interactive-card:hover {
            transform: none;
          }
        }
      `}</style>

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>

      <nav
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          isScrolled ? 'border-slate-200 bg-white/88 shadow-sm backdrop-blur-xl' : 'border-transparent bg-white/60 backdrop-blur'
        }`}
        aria-label="Navegacion principal"
      >
        <div className="container-main flex items-center justify-between py-3">
          <Link href="/" aria-label="Ir al inicio de SaludClick" className="rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
            <Image src="/saludclick.png" alt="SaludClick" width={260} height={120} priority className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 text-sm font-semibold text-slate-600 lg:flex">
              <Link href="/about" className="hover:text-sky-700">Sobre nosotros</Link>
              <Link href="/faq" className="hover:text-sky-700">FAQ</Link>
              <Link href="/contact" className="hover:text-sky-700">Contacto</Link>
              <Link href="/developer" className="hover:text-sky-700">Desarrollador</Link>
            </div>
            <Link href="/login" className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500">
              Iniciar sesion
            </Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
              Registrarse
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="container-main flex gap-2 overflow-x-auto pb-3 text-sm font-semibold text-slate-600 lg:hidden">
          <Link href="/about" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Sobre nosotros</Link>
          <Link href="/faq" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">FAQ</Link>
          <Link href="/contact" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Contacto</Link>
          <Link href="/developer" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Desarrollador</Link>
        </div>
      </nav>

      <main id="main-content" className="home-shell">
        <section
          className="hero-light relative overflow-hidden"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setPointer({
              x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
              y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
            });
          }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className="parallax-layer absolute left-[5%] top-20 h-28 w-28 rounded-3xl border border-sky-200 bg-white/70 shadow-xl shadow-sky-900/5"
              style={{ '--parallax-distance': '130px' } as CSSProperties}
            />
            <div
              className="parallax-reverse absolute right-[10%] top-28 h-20 w-20 rounded-full border border-emerald-200 bg-emerald-100/70 shadow-lg shadow-emerald-900/5"
              style={{ '--parallax-distance': '-90px' } as CSSProperties}
            />
            <div
              className="parallax-layer absolute bottom-16 left-[42%] h-16 w-36 rounded-full border border-cyan-200 bg-cyan-100/70"
              style={{ '--parallax-distance': '180px' } as CSSProperties}
            />
          </div>
          <div className="container-main grid min-h-[calc(100vh-72px)] items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
            <div className="rise-in">
              <div className="home-pill mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-800 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Salud digital simple, segura y conectada
              </div>
              <h1 className="home-hero-title max-w-4xl text-5xl font-black leading-[1.02] text-slate-950 sm:text-6xl lg:text-7xl">
                Tu salud, tu agenda y tus medicos en un solo lugar
              </h1>
              <p className="home-hero-copy mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                SaludClick une pacientes, doctores y centros de salud con reservas rapidas, historial digital y una experiencia clara desde la primera busqueda.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/booking" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-4 font-bold text-white shadow-xl shadow-sky-600/25 transition hover:-translate-y-1 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                  <CalendarCheck className="h-5 w-5" />
                  Agendar ahora
                </Link>
                <Link href="/doctors" className="home-secondary-button inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                  <Stethoscope className="h-5 w-5" />
                  Ver medicos
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="home-surface rounded-xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur">
                      <Icon className="mb-3 h-5 w-5 text-sky-600" />
                      <div className="text-2xl font-black text-slate-950 sm:text-3xl">
                        <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative rise-in [animation-delay:120ms]">
              <div
                className="parallax-reverse absolute -right-6 -top-8 z-0 hidden rounded-2xl border border-white bg-white/70 p-4 shadow-xl backdrop-blur md:block"
                style={{ '--parallax-distance': '-120px' } as CSSProperties}
                aria-hidden="true"
              >
                <div className="h-2 w-24 rounded-full bg-sky-200" />
                <div className="mt-3 h-2 w-16 rounded-full bg-emerald-200" />
              </div>
              <div
                className="parallax-layer absolute -bottom-7 -left-5 z-0 hidden rounded-2xl border border-white bg-white/80 p-4 shadow-xl backdrop-blur md:block"
                style={{ '--parallax-distance': '95px' } as CSSProperties}
                aria-hidden="true"
              >
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded-xl bg-sky-200" />
                  <div className="h-8 w-8 rounded-xl bg-cyan-200" />
                  <div className="h-8 w-8 rounded-xl bg-emerald-200" />
                </div>
              </div>
              <div className="home-surface soft-float relative z-10 rounded-[2rem] border border-white bg-white/78 p-4 shadow-2xl shadow-sky-950/10 backdrop-blur-xl">
                <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 p-5 text-white">
                  <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/0 via-cyan-300/20 to-cyan-300/0" />
                  <div className="mb-6 flex items-center justify-between">
                    <Image src="/icono.png" alt="" width={42} height={42} className="rounded-xl bg-white p-1" />
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">En linea</span>
                  </div>

                  <div className="grid gap-4">
                    <div className="home-card rounded-2xl bg-white p-4 text-slate-950">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Busca atencion</p>
                          <h2 className="mt-1 text-2xl font-black">Encuentra un medico</h2>
                        </div>
                        <HeartPulse className="h-10 w-10 text-rose-500" />
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-sky-50 p-3 text-slate-700 dark:bg-sky-950/50 dark:text-sky-100">
                          <Clock3 className="mb-2 h-4 w-4 text-sky-700" />
                          Horarios disponibles
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-3">
                          <Video className="mb-2 h-4 w-4 text-emerald-700" />
                          Presencial o video
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-sky-500 p-4">
                        <Activity className="mb-4 h-7 w-7" />
                        <p className="text-sm text-sky-100">Especialidades</p>
                        <p className="text-2xl font-black">+25</p>
                      </div>
                      <div className="rounded-2xl bg-cyan-400 p-4 text-slate-950">
                        <BellRing className="mb-4 h-7 w-7" />
                        <p className="text-sm text-slate-700">Registro</p>
                        <p className="text-2xl font-black">Gratis</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section-light bg-white py-20">
          <div className="container-main">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="font-bold uppercase text-sky-700">Experiencia completa</p>
                <h2 className="mt-2 max-w-2xl text-4xl font-black text-slate-950 md:text-5xl">Mas que agendar: todo el recorrido medico se siente ordenado</h2>
              </div>
              <div className="inline-grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
                {(['paciente', 'medico'] as Audience[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAudience(item)}
                    className={`rounded-lg px-5 py-3 text-sm font-bold capitalize transition ${
                      audience === item ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="home-card interactive-card rounded-2xl border border-slate-200 bg-white p-6">
                    <div className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br ${feature.tone} p-4 text-white shadow-lg`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <p className="mb-3 text-sm font-black text-sky-700">0{index + 1}</p>
                    <h3 className="home-card-title text-2xl font-black text-slate-950">{feature.title}</h3>
                    <p className="home-card-text mt-3 leading-7 text-slate-600">{feature.description}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
              <div className="grid gap-4 md:grid-cols-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 rounded-xl bg-white/8 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                    <div>
                      <p className="text-sm font-bold text-cyan-200">Paso {index + 1}</p>
                      <p className="mt-1 font-semibold">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="home-section-muted bg-slate-50 py-20">
          <div className="container-main grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="font-bold uppercase text-sky-700">Medicos destacados</p>
              <h2 className="mt-2 text-4xl font-black md:text-5xl">Elige con confianza y agenda en segundos</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Tarjetas claras, disponibilidad visible y acciones directas para que el paciente avance sin perderse.
              </p>
              <Link href="/doctors" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                Explorar especialistas
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {['Dra. Camila Rojas', 'Dr. Mateo Silva', 'Dra. Ana Torres', 'Dr. Lucas Vidal'].map((doctor, index) => (
                <article key={doctor} className="home-card interactive-card rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-700">
                      <Stethoscope className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-black">{doctor}</h3>
                      <p className="text-sm font-semibold text-slate-500">{index % 2 === 0 ? 'Medicina general' : 'Cardiologia'}</p>
                    </div>
                  </div>
                  <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-600">Disponible</span>
                    <span className="font-black text-emerald-600">{index + 2} horarios</span>
                  </div>
                  <Link href="/booking" className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                    Agendar cita
                    <CalendarCheck className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section-light bg-white py-20">
          <div className="container-main">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <p className="font-bold uppercase text-sky-700">Preguntas frecuentes</p>
                <h2 className="mt-2 max-w-xl text-4xl font-black text-slate-950 md:text-5xl">Respuestas claras antes de dar el siguiente paso</h2>
                <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                  Lo esencial sobre busqueda, citas, teleconsulta, historial y privacidad en SaludClick.
                </p>
              </div>

              <div className="home-card divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  const contentId = `home-faq-${index}`;

                  return (
                    <div key={faq.question} className={`p-5 transition sm:p-6 ${isOpen ? 'bg-slate-50' : 'bg-white'}`}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? -1 : index)}
                        className="flex w-full items-center justify-between gap-4 text-left text-lg font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-4"
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                      >
                      <span>{faq.question}</span>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white transition ${isOpen ? 'rotate-180 border-sky-200 text-sky-700' : 'border-slate-200 text-slate-500'}`}>
                        <ChevronDown className="h-5 w-5" />
                      </span>
                      </button>
                      {isOpen && (
                        <p id={contentId} className="mt-4 max-w-3xl leading-7 text-slate-600">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="home-section-light bg-white py-20">
          <div className="container-main">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-cyan-600 to-emerald-500 p-8 text-white shadow-2xl shadow-sky-900/20 md:p-12">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="text-4xl font-black md:text-5xl">Empieza hoy a cuidar tu salud con menos vueltas</h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-white/88">
                    Crea tu cuenta, encuentra un especialista y deja que SaludClick mantenga el resto ordenado.
                  </p>
                </div>
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 font-black text-sky-700 shadow-xl transition hover:-translate-y-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-sky-600">
                  Crear cuenta gratis
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-12 text-white">
        <div className="container-main grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Image src="/saludclick.png" alt="SaludClick" width={220} height={90} className="h-12 w-auto rounded bg-white px-2 py-1" />
            <p className="mt-5 max-w-md leading-7 text-slate-400">
              Plataforma de salud digital para conectar pacientes, medicos y centros de atencion con una experiencia moderna.
            </p>
          </div>
          <div>
            <h3 className="font-black text-white">Pacientes</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link href="/doctors" className="hover:text-white">Buscar medicos</Link>
              <Link href="/appointments" className="hover:text-white">Mis citas</Link>
              <Link href="/medical-records" className="hover:text-white">Historial medico</Link>
            </div>
          </div>
          <div>
            <h3 className="font-black text-white">Cuenta</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link href="/login" className="hover:text-white">Iniciar sesion</Link>
              <Link href="/register?type=doctor" className="hover:text-white">Registro medico</Link>
              <Link href="/privacy" className="hover:text-white">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
