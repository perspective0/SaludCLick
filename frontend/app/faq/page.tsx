'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, HelpCircle, House, ShieldCheck, Stethoscope } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    question: '¿Qué es SaludClick?',
    answer: 'SaludClick es una plataforma para conectar pacientes, médicos y centros de salud. Permite buscar profesionales, agendar citas, gestionar disponibilidad y mantener información médica organizada.',
  },
  {
    question: '¿Necesito una cuenta para buscar médicos?',
    answer: 'Puedes explorar médicos desde el listado público. Para agendar citas, ver tu historial, consultar recetas o recibir notificaciones necesitas una cuenta de paciente.',
  },
  {
    question: '¿Cómo se valida un médico?',
    answer: 'Las solicitudes médicas pasan por revisión administrativa. Se solicita exequátur, cédula, soporte de especialidad y documentos adicionales para confirmar la identidad y las credenciales.',
  },
  {
    question: '¿Puedo elegir el centro donde quiero ver al médico?',
    answer: 'Si el médico atiende en varios centros, al reservar puedes seleccionar el centro disponible para esa cita. La ciudad del centro aparece para ayudarte a elegir.',
  },
  {
    question: '¿SaludClick ofrece diagnósticos médicos?',
    answer: 'No. SaludClick facilita la conexión, la agenda y la gestión digital. El diagnóstico, el tratamiento y el seguimiento clínico corresponden al profesional de salud que atiende al paciente.',
  },
  {
    question: '¿Mis datos están protegidos?',
    answer: 'La plataforma organiza la información para que solo usuarios autorizados relacionados con tu atención puedan acceder a los datos necesarios.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />
      <PublicHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">
            <HelpCircle className="h-4 w-4" />
            Preguntas frecuentes
          </div>
          <h1 className="text-4xl font-black md:text-5xl">Respuestas rápidas sobre SaludClick</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Lo esencial para pacientes, médicos y centros antes de usar la plataforma.
          </p>
        </div>

        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.question} className="p-5 md:p-6">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 text-left text-lg font-black"
                >
                  {faq.question}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-sky-600 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="mt-4 leading-7 text-slate-600">{faq.answer}</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <InfoCard icon={Stethoscope} title="Para médicos" text="Solicita acceso, valida tus credenciales y configura centros, horarios y perfil profesional." />
          <InfoCard icon={ShieldCheck} title="Para pacientes" text="Agenda con profesionales verificados y mantente al tanto de tus citas e historial." />
        </div>
      </section>
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/88 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/">
          <Image src="/saludclick.png" alt="SaludClick" width={260} height={120} className="h-11 w-auto" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-4 text-sm font-semibold text-slate-600 lg:flex">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700">
              <House className="h-4 w-4" />
              Volver al inicio
            </Link>
            <Link href="/about" className="hover:text-sky-700">Sobre nosotros</Link>
            <Link href="/faq" className="text-sky-700">FAQ</Link>
            <Link href="/contact" className="hover:text-sky-700">Contacto</Link>
            <Link href="/developer" className="hover:text-sky-700">Desarrollador</Link>
          </div>
          <Link href="/login" className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100">Iniciar sesión</Link>
          <Link href="/register" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-sky-700">Registrarse</Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-slate-600 md:px-8 lg:hidden">
        <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700">
          <House className="h-4 w-4" />
          Volver al inicio
        </Link>
        <Link href="/about" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Sobre nosotros</Link>
        <Link href="/faq" className="shrink-0 rounded-lg bg-sky-50 px-3 py-2 text-sky-700">FAQ</Link>
        <Link href="/contact" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Contacto</Link>
        <Link href="/developer" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Desarrollador</Link>
      </nav>
    </header>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <Icon className="mb-3 h-6 w-6 text-sky-600" />
      <h2 className="font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}
