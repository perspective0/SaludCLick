'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Stethoscope, UserRound } from 'lucide-react';
import { authAPI, saveToken } from '@/utils/api';
import { useAuthStore } from '@/store';

export default function GoogleOnboardingPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-950" />}><GoogleOnboardingContent /></Suspense>;
}

function GoogleOnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const token = useMemo(() => params.get('token') || '', [params]);
  const [loadingRole, setLoadingRole] = useState<'patient' | 'doctor' | ''>('');
  const [error, setError] = useState('');

  const chooseRole = async (role: 'patient' | 'doctor') => {
    if (!token) {
      setError('La sesión de Google expiró. Vuelve a iniciar sesión.');
      return;
    }

    setLoadingRole(role);
    setError('');
    try {
      const response = await authAPI.completeGoogleRegistration(token, role);
      const user = response.data?.user;
      if (!user) throw new Error('No se pudo crear la cuenta.');
      if (response.data.token) saveToken(response.data.token);
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      router.replace(role === 'doctor' ? '/doctor/pending-approval' : '/patient/dashboard');
    } catch (err: any) {
      setError(err?.message || 'No se pudo completar el registro.');
      setLoadingRole('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">Google verificó tu identidad</p>
            <h1 className="text-3xl font-bold sm:text-4xl">¡Bienvenido a SaludClick!</h1>
            <p className="mt-4 text-slate-300">No encontramos una cuenta asociada a este correo. ¿Cómo deseas utilizar SaludClick?</p>
          </div>

          {error && <p className="mx-auto mt-6 max-w-xl rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-center text-sm text-red-200">{error}</p>}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button type="button" disabled={Boolean(loadingRole)} onClick={() => chooseRole('patient')} className="group rounded-2xl border border-blue-400/40 bg-slate-950 p-6 text-left transition hover:border-blue-300 hover:bg-blue-950/30 disabled:cursor-wait disabled:opacity-60">
              <UserRound className="h-8 w-8 text-blue-400" />
              <h2 className="mt-5 text-xl font-bold">Soy paciente</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Gestiona tus citas, recetas y consultas.</p>
              <span className="mt-6 inline-block text-sm font-semibold text-blue-300">{loadingRole === 'patient' ? 'Creando cuenta…' : 'Crear cuenta de paciente →'}</span>
            </button>
            <button type="button" disabled={Boolean(loadingRole)} onClick={() => chooseRole('doctor')} className="group rounded-2xl border border-cyan-400/40 bg-slate-950 p-6 text-left transition hover:border-cyan-300 hover:bg-cyan-950/30 disabled:cursor-wait disabled:opacity-60">
              <Stethoscope className="h-8 w-8 text-cyan-400" />
              <h2 className="mt-5 text-xl font-bold">Soy médico</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Gestiona pacientes y tu consulta.</p>
              <span className="mt-6 inline-block text-sm font-semibold text-cyan-300">{loadingRole === 'doctor' ? 'Creando cuenta…' : 'Crear cuenta de médico →'}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
