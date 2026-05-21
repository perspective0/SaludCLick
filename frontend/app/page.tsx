'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container-main py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="/saludclick.png"
              alt="SaludClick Logo"
              width={300}
              height={200}
              priority
            />
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="text-primary hover:text-blue-700">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="btn-primary">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-white to-transparent">
        <div className="container-main flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h1 className="text-5xl font-extrabold mb-4 leading-tight">Tu plataforma de salud digital moderna</h1>
            <p className="text-lg text-muted mb-6 max-w-2xl">Agenda citas, gestiona historiales y ofrece recetas digitales de forma segura. Optimizada para pacientes y equipos médicos.</p>

            <div className="flex gap-4 items-center">
              <Link href="/register?type=patient" className="btn-primary">
                Crear cuenta (Paciente)
              </Link>
              <Link href="/register?type=doctor" className="btn-secondary">
                Solicitar acceso (Médicos)
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">+500</div>
                <div className="muted">Médicos registrados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">+10k</div>
                <div className="muted">Citas agendadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">99%</div>
                <div className="muted">Satisfacción</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">24/7</div>
                <div className="muted">Soporte</div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="hero-card card p-8 text-center">
              <Image src="/saludclick.png" alt="SaludClick" width={240} height={240} priority />
              <p className="muted mt-4">Plataforma segura y confiable para conectar pacientes y médicos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-light">
        <div className="container-main">
          <h2 className="text-4xl font-bold text-center mb-16">¿Por qué SaludClick?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🏥',
                title: 'Red de Médicos',
                description: 'Acceso a médicos especializados de centros de salud verificados',
              },
              {
                icon: '📅',
                title: 'Agendamiento Fácil',
                description: 'Reserva tus citas en segundos sin complicaciones',
              },
              {
                icon: '📋',
                title: 'Historial Digital',
                description: 'Mantén tu historial médico seguro y accesible en todo momento',
              },
            ].map((feature, idx) => (
              <div key={idx} className="card text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Preview */}
      <section className="py-20">
        <div className="container-main">
          <h2 className="text-4xl font-bold mb-12">Encuentra tu Médico Ideal</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-gray-400">Foto médico</span>
                </div>
                <h3 className="font-bold mb-2">Dr. Nombre {i}</h3>
                <p className="text-sm text-secondary mb-2">Especialidad</p>
                <p className="text-xs text-gray-600">Centro de Salud</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/doctors" className="btn-primary">
              Ver todos los médicos
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-16">
        <div className="container-main text-center">
          <h2 className="text-3xl font-bold mb-4">¿Listo para cuidar tu salud?</h2>
          <p className="text-lg mb-8">Únete a SaludClick y comienza a agendar tus citas hoy mismo</p>
          <Link href="/register" className="btn-primary bg-white text-primary hover:bg-gray-100">
            Crear Cuenta Ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-12">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">SaludClick</h4>
              <p className="text-gray-400 text-sm">Plataforma de citas médicas 100% confiable</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Pacientes</h4>
              <ul className="text-gray-400 text-sm space-y-2">
                <li><Link href="/doctors" className="hover:text-white">Buscar Médicos</Link></li>
                <li><Link href="/appointments" className="hover:text-white">Mis Citas</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Médicos</h4>
              <ul className="text-gray-400 text-sm space-y-2">
                <li><Link href="/doctor/login" className="hover:text-white">Portal Médico</Link></li>
                <li><Link href="/register?type=doctor" className="hover:text-white">Registrarse</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="text-gray-400 text-sm space-y-2">
                <li><Link href="/privacy" className="hover:text-white">Privacidad</Link></li>
                <li><Link href="/terms" className="hover:text-white">Términos</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 SaludClick. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
