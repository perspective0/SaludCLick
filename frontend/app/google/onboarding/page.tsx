'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Stethoscope, UserRound } from 'lucide-react';
import { authAPI, saveToken } from '@/utils/api';
import { useAuthStore } from '@/store';
import { useI18n } from '@/i18n';

export default function GoogleOnboardingPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 dark:bg-slate-950" />}><GoogleOnboardingContent /></Suspense>;
}

function GoogleOnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const { locale } = useI18n();
  const en = locale === 'en';
  const token = useMemo(() => params.get('token') || '', [params]);
  const [loadingRole, setLoadingRole] = useState<'patient' | 'doctor' | ''>('');
  const [error, setError] = useState('');

  const chooseRole = async (role: 'patient' | 'doctor') => {
    if (!token) {
      setError(en ? 'Your Google session expired. Please sign in again.' : 'La sesión de Google expiró. Vuelve a iniciar sesión.');
      return;
    }

    setLoadingRole(role);
    setError('');
    try {
      const response = await authAPI.completeGoogleRegistration(token, role);
      const user = response.data?.user;
      if (!user) throw new Error(en ? 'The account could not be created.' : 'No se pudo crear la cuenta.');
      if (response.data.token) saveToken(response.data.token);
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      router.replace(role === 'doctor' ? '/doctor/pending-approval' : '/patient/dashboard');
    } catch (err: any) {
      setError(err?.message || (en ? 'Registration could not be completed.' : 'No se pudo completar el registro.'));
      setLoadingRole('');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 text-slate-950 transition-colors duration-500 dark:bg-[#050816] dark:text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl dark:bg-blue-500/20" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-300/15 blur-3xl dark:bg-violet-500/10" />

      <section className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-colors duration-500 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/30 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-9 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[24px] border-white/10" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full border-[30px] border-white/10" />
            <div className="relative">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">SaludClick</p>
              <h2 className="mt-4 max-w-xs text-4xl font-bold leading-tight">{en ? 'Your care journey starts here.' : 'Tu camino de salud comienza aquí.'}</h2>
              <p className="mt-5 max-w-sm leading-7 text-blue-50/85">{en ? 'One verified identity, one clear choice, and a portal designed around you.' : 'Una identidad verificada, una elección clara y un portal pensado para ti.'}</p>
            </div>
            <div className="relative space-y-4 text-sm text-blue-50/90">
              <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /><span>{en ? 'Identity verified by Google' : 'Identidad verificada por Google'}</span></div>
              <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5" /><span>{en ? 'Choose your SaludClick experience' : 'Elige tu experiencia en SaludClick'}</span></div>
            </div>
          </aside>

          <div className="p-6 sm:p-10 lg:p-14">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300"><span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_5px_rgba(59,130,246,0.12)]" />{en ? 'New account' : 'Cuenta nueva'}</div>
              <span className="text-xs font-medium text-slate-400">{en ? 'Step 1 of 1' : 'Paso 1 de 1'}</span>
            </div>
            <div className="max-w-xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/25"><CheckCircle2 className="h-9 w-9" /></div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">{en ? 'Google verified your identity' : 'Google verificó tu identidad'}</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{en ? 'Welcome to SaludClick!' : '¡Bienvenido a SaludClick!'}</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">{en ? 'We could not find an account linked to this email. How would you like to use SaludClick?' : 'No encontramos una cuenta asociada a este correo. ¿Cómo deseas utilizar SaludClick?'}</p>
            </div>

            {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">{error}</p>}

            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              <RoleCard role="patient" loading={loadingRole === 'patient'} disabled={Boolean(loadingRole)} onClick={() => chooseRole('patient')} en={en} />
              <RoleCard role="doctor" loading={loadingRole === 'doctor'} disabled={Boolean(loadingRole)} onClick={() => chooseRole('doctor')} en={en} />
            </div>
            <p className="mt-7 flex items-center gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />{en ? 'Your Google identity is used only to create and secure your SaludClick account.' : 'Tu identidad de Google se usa únicamente para crear y proteger tu cuenta de SaludClick.'}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function RoleCard({ role, loading, disabled, onClick, en }: { role: 'patient' | 'doctor'; loading: boolean; disabled: boolean; onClick: () => void; en: boolean }) {
  const patient = role === 'patient';
  const Icon = patient ? UserRound : Stethoscope;
  const title = patient ? (en ? 'I am a patient' : 'Soy paciente') : (en ? 'I am a doctor' : 'Soy médico');
  const description = patient ? (en ? 'Manage appointments, prescriptions and consultations.' : 'Gestiona tus citas, recetas y consultas.') : (en ? 'Manage patients and build your practice.' : 'Gestiona pacientes y tu consulta.');
  const action = loading ? (en ? 'Creating account…' : 'Creando cuenta…') : (en ? `Create ${patient ? 'patient' : 'doctor'} account` : `Crear cuenta de ${patient ? 'paciente' : 'médico'}`);

  return <button type="button" disabled={disabled} onClick={onClick} className={`group relative overflow-hidden rounded-2xl border bg-slate-50 p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl disabled:cursor-wait disabled:opacity-60 dark:bg-slate-950/70 ${patient ? 'border-blue-200 hover:border-blue-400 hover:shadow-blue-500/10 dark:border-blue-900/80 dark:hover:border-blue-500' : 'border-cyan-200 hover:border-cyan-400 hover:shadow-cyan-500/10 dark:border-cyan-900/80 dark:hover:border-cyan-500'}`}>
    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition group-hover:scale-150 ${patient ? 'bg-blue-400/20' : 'bg-cyan-400/20'}`} />
    <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${patient ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300'}`}><Icon className="h-6 w-6" /></div>
    <h2 className="relative mt-5 text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
    <p className="relative mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    <span className={`relative mt-5 inline-flex items-center gap-2 text-sm font-bold ${patient ? 'text-blue-600 dark:text-blue-300' : 'text-cyan-600 dark:text-cyan-300'}`}>{action}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
  </button>;
}
