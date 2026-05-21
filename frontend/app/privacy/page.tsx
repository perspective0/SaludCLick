'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-light py-16">
      <div className="container-main">
        <h1 className="text-4xl font-bold mb-6">Política de Privacidad</h1>
        <p className="mb-4 text-gray-600">
          En SaludClick respetamos tu privacidad. Esta página describe cómo recopilamos y usamos tus datos.
        </p>
        <p className="text-gray-600">
          Esta es una página de contenido de ejemplo para demostrar navegación correcta en la plataforma.
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
