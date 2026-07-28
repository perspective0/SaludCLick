import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sin conexión',
  description: 'SaludClick no tiene conexión a internet en este momento.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100 px-6 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-2xl shadow-sky-900/10 backdrop-blur sm:p-12">
        <Image
          src="/saludclick.png"
          alt="SaludClick"
          width={500}
          height={161}
          priority
          className="mx-auto h-auto w-64 max-w-full"
        />

        <div className="mx-auto mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-4xl">
          <span aria-hidden="true">♡</span>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Estás sin conexión
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          No pudimos conectar con SaludClick. Comprueba tu acceso a internet y
          vuelve a intentarlo.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200"
        >
          Volver a intentar
        </Link>
      </section>
    </main>
  );
}
