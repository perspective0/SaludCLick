'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { authAPI } from '@/utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ accountExists: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await authAPI.requestPasswordRecovery(email.trim());
      setResult({
        accountExists: Boolean(response?.data?.accountExists),
        message: response?.message || 'Solicitud procesada.',
      });
    } catch (requestError: any) {
      setError(requestError?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  }

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
            Introduce tu correo y notificaremos a los administradores para ayudarte.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            Correo electrónico
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {result && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p>{result.message}</p>
              </div>
              {!result.accountExists && (
                <Link href={`/register?type=patient&email=${encodeURIComponent(email.trim())}`} className="mt-3 inline-block font-bold text-blue-700 hover:underline">
                  Crear una cuenta
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Procesando...' : 'Solicitar ayuda'}
          </button>
        </form>

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
