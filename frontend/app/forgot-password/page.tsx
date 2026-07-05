'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex">
            <Image
              src="/saludclick.png"
              alt="SaludClick"
              width={180}
              height={70}
              priority
              className="h-12 w-auto"
            />
          </Link>
        </div>

        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-100 p-3 text-blue-600">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Por ahora, solicita el restablecimiento al administrador de SaludClick. Esta pantalla evita que el enlace quede roto mientras activamos el flujo automático por correo.
          </p>
        </div>

        <a
          href="mailto:admin@saludclick.com?subject=Restablecer%20contrase%C3%B1a%20SaludClick"
          className="block w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-center font-semibold text-white transition hover:shadow-lg"
        >
          Contactar soporte
        </a>

        <Link
          href="/login"
          className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al login
        </Link>
      </div>
    </main>
  );
}
