'use client';

import Link from 'next/link';

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen bg-light py-16">
      <div className="container-main">
        <h1 className="text-4xl font-bold mb-6">Mis Citas</h1>
        <p className="mb-6 text-gray-600">
          Aquí aparecerán tus citas médicas programadas. En esta versión inicial, todavía estamos cargando tus datos.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Volver al Panel
        </Link>
      </div>
    </div>
  );
}
