'use client';

import Link from 'next/link';

export default function DoctorLoginPage() {
  return (
    <div className="min-h-screen bg-light py-16">
      <div className="container-main max-w-xl">
        <h1 className="text-4xl font-bold mb-6">Portal Médico</h1>
        <p className="mb-6 text-gray-600">
          Inicia sesión como médico para gestionar tus citas y pacientes.
        </p>
        <div className="space-y-4">
          <button className="btn-primary w-full">Iniciar sesión como médico</button>
          <button className="btn-secondary w-full">Registrarse como médico</button>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-primary underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
