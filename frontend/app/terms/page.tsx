'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-light py-16">
      <div className="container-main">
        <h1 className="text-4xl font-bold mb-6">Términos y Condiciones</h1>
        <p className="mb-4 text-gray-600">
          Bienvenido a SaludClick. Estos términos describen el uso permitido de la plataforma.
        </p>
        <p className="text-gray-600">
          Esta página se ha creado para que los enlaces del pie de página no conduzcan a 404.
        </p>
        <div className="mt-8">
          <Link href="/" className="btn-secondary">
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
