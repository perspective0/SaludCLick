'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  FileSearch,
  Mail,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

const steps = [
  {
    title: 'Solicitud recibida',
    text: 'Tus datos profesionales quedaron registrados para revision.',
    icon: FileSearch,
  },
  {
    title: 'Validacion de exequatur',
    text: 'Verificamos tu exequatur junto a tu nombre completo y especialidad.',
    icon: BadgeCheck,
  },
  {
    title: 'Activacion del portal',
    text: 'Cuando sea aprobada, recibiras tus accesos para configurar tu agenda.',
    icon: ShieldCheck,
  },
];

export default function DoctorPendingApprovalPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-gray-950">
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
            href="/login"
            className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Iniciar sesion
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <Clock className="h-4 w-4" />
              Revision pendiente
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-gray-950 md:text-5xl">
              Tu solicitud como medico esta en validacion
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
              Gracias por registrarte en SaludClick. Antes de activar tu cuenta, el equipo administrativo debe validar tu exequatur, nombre completo y datos profesionales.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Ir a iniciar sesion
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register?type=doctor"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Enviar otra solicitud
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Proceso de aprobacion</h2>
                <p className="text-sm text-gray-500">Normalmente se revisa por orden de llegada.</p>
              </div>
            </div>

            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-3 rounded-xl bg-gray-50 p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Revisa tu correo</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Si necesitamos confirmar algun dato, te contactaremos por el email o telefono indicado en el registro.
              </p>
            </div>

            <a
              href="mailto:admin@saludclick.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              <Mail className="h-4 w-4" />
              Contactar administracion
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}
