'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(String(data.get('subject') || 'Contacto SaludClick'));
    const body = encodeURIComponent(
      [
        `Nombre: ${data.get('name') || ''}`,
        `Correo: ${data.get('email') || ''}`,
        `Telefono: ${data.get('phone') || ''}`,
        `Tipo: ${data.get('type') || ''}`,
        '',
        String(data.get('message') || ''),
      ].join('\n')
    );

    window.location.href = `mailto:francisco.leocadio@saludclick.com.do?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/88 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/">
            <Image src="/saludclick.png" alt="SaludClick" width={260} height={120} className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 text-sm font-semibold text-slate-600 lg:flex">
              <Link href="/about" className="hover:text-sky-700">Sobre nosotros</Link>
              <Link href="/faq" className="hover:text-sky-700">FAQ</Link>
              <Link href="/contact" className="text-sky-700">Contacto</Link>
              <Link href="/developer" className="hover:text-sky-700">Desarrollador</Link>
            </div>
            <Link href="/login" className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100">Iniciar sesion</Link>
            <Link href="/register" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-sky-700">Registrarse</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-slate-600 md:px-8 lg:hidden">
          <Link href="/about" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Sobre nosotros</Link>
          <Link href="/faq" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">FAQ</Link>
          <Link href="/contact" className="shrink-0 rounded-lg px-3 py-2 bg-sky-50 text-sky-700">Contacto</Link>
          <Link href="/developer" className="shrink-0 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-sky-700">Desarrollador</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">
            <MessageSquare className="h-4 w-4" />
            Contacto
          </div>
          <h1 className="text-4xl font-black md:text-5xl">Hablemos de SaludClick</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Para soporte, solicitudes medicas, centros de salud o colaboraciones, puedes escribirnos por los canales principales.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ContactCard icon={Mail} title="Correo" text="francisco.leocadio@saludclick.com.do" href="mailto:francisco.leocadio@saludclick.com.do" />
          <ContactCard icon={Phone} title="Telefono" text="Configurar numero oficial" href="#" />
          <ContactCard icon={MapPin} title="Ubicacion" text="Republica Dominicana" href="#" />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <MessageSquare className="mb-4 h-7 w-7 text-sky-600" />
          <h2 className="text-2xl font-black">Enviar mensaje</h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre completo" name="name" placeholder="Tu nombre" required />
              <Field label="Correo electronico" name="email" placeholder="correo@ejemplo.com" type="email" required />
              <Field label="Telefono" name="phone" placeholder="+1 809 000 0000" />
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">Tipo de consulta</span>
                <select
                  name="type"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  defaultValue="Soporte"
                >
                  <option>Soporte</option>
                  <option>Solicitud medica</option>
                  <option>Centro de salud</option>
                  <option>Alianza o colaboracion</option>
                  <option>Otro</option>
                </select>
              </label>
            </div>
            <Field label="Asunto" name="subject" placeholder="Motivo del mensaje" required />
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">Mensaje</span>
              <textarea
                name="message"
                rows={6}
                required
                placeholder="Describe brevemente lo que necesitas..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            {sent && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Se abrio tu cliente de correo con el mensaje preparado.
              </p>
            )}
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-600 px-5 text-sm font-bold text-white hover:bg-sky-700 md:w-fit">
              Enviar mensaje
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
      />
    </label>
  );
}

function ContactCard({ icon: Icon, title, text, href }: { icon: any; title: string; text: string; href: string }) {
  return (
    <a href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-200 hover:bg-sky-50">
      <Icon className="mb-4 h-7 w-7 text-sky-600" />
      <h2 className="font-black">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </a>
  );
}
