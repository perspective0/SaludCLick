'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/i18n';
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  FileCheck,
  FileSearch,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

export default function DoctorPendingApprovalPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const loginToProfile = '/login?redirect=%2Fdoctor%2Fprofile';
  const steps = [
    { title: en ? 'Request received' : 'Solicitud recibida', text: en ? 'Your professional information is registered for review.' : 'Tus datos profesionales quedaron registrados para revisión.', icon: FileSearch },
    { title: en ? 'License validation' : 'Validación de exequátur', text: en ? 'We verify your license with your full name and specialty.' : 'Verificamos tu exequátur junto a tu nombre completo y especialidad.', icon: BadgeCheck },
    { title: en ? 'Portal activation' : 'Activación del portal', text: en ? 'Once approved, you can configure your schedule and practice.' : 'Cuando sea aprobada, podrás configurar tu agenda y tu práctica.', icon: ShieldCheck },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-cyan-400/15 blur-3xl" />
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/saludclick.png"
              alt="SaludClick"
              width={190}
              height={72}
              priority
              className="h-12 w-auto"
            />
          </Link>
          <Link
            href={loginToProfile}
            className="inline-flex h-10 items-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
          >
            {en ? 'Sign in' : 'Iniciar sesión'}
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-sm font-semibold text-blue-200">
              <Clock className="h-4 w-4" />
              {en ? 'Review pending' : 'Revisión pendiente'}
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              {en ? 'Your doctor application is under review' : 'Tu solicitud como médico está en validación'}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              {en ? 'Thanks for joining SaludClick. Before activating your account, our team must validate your license, full name, and professional information.' : 'Gracias por registrarte en SaludClick. Antes de activar tu cuenta, el equipo administrativo debe validar tu exequátur, nombre completo y datos profesionales.'}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={loginToProfile}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                {en ? 'Complete my profile' : 'Completar mi perfil'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register?type=doctor"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/15"
              >
                {en ? 'Submit another request' : 'Enviar otra solicitud'}
              </Link>
            </div>
          </div>

          <aside className="relative rounded-3xl border border-white/10 bg-white/[0.08] p-6 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{en ? 'Approval process' : 'Proceso de aprobación'}</h2>
                <p className="text-sm text-slate-400">{en ? 'Requests are normally reviewed in the order received.' : 'Normalmente se revisa por orden de llegada.'}</p>
              </div>
            </div>

            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link href={loginToProfile} className="mt-6 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-left hover:bg-cyan-300/15">
              <FileCheck className="h-6 w-6 shrink-0 text-cyan-300" />
              <span>
                <span className="flex items-center gap-2 font-semibold text-cyan-100">{en ? 'Complete your professional information' : 'Completa tus datos profesionales'} <Sparkles className="h-4 w-4" /></span>
                <span className="mt-1 block text-sm leading-6 text-cyan-100/70">{en ? 'Sign in with Google and upload any missing documents.' : 'Inicia sesión con Google y adjunta los documentos que faltan.'}</span>
              </span>
            </Link>

            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-sm font-semibold text-amber-100">{en ? 'Check your email' : 'Revisa tu correo'}</p>
              <p className="mt-1 text-sm leading-6 text-amber-100/75">
                {en ? 'If we need to confirm any information, we will contact you through the email or phone number provided during registration.' : 'Si necesitamos confirmar algún dato, te contactaremos por el email o teléfono indicado en el registro.'}
              </p>
            </div>

            <a
              href="mailto:admin@saludclick.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:underline"
            >
              <Mail className="h-4 w-4" />
              {en ? 'Contact administration' : 'Contactar administración'}
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}
