'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, Megaphone, Play, RefreshCw, UserRound } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import DoctorShell from '@/components/DoctorShell';
import SecretaryShell from '@/components/SecretaryShell';
import { appointmentAPI, secretaryAPI } from '@/utils/api';

type QueueItem = {
  id: string;
  queue_number?: number;
  queue_status: string;
  appointment_time: string;
  first_name: string;
  last_name: string;
  phone?: string;
  health_center_name?: string;
};

const labels: Record<string, string> = {
  waiting: 'En espera',
  called: 'Llamado',
  'in-consultation': 'En consulta',
  completed: 'Atendido',
  'no-show': 'No se presentó',
};

function isoToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function QueuePage() {
  const [user, setUser] = useState<any>(null);
  const [date, setDate] = useState(isoToday());
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [myQueue, setMyQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isPatient = user?.role === 'patient';
  const canManage = ['doctor', 'secretary', 'admin'].includes(user?.role);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'secretary') return;
    secretaryAPI.assignedDoctors().then((response) => {
      const assigned = response.data || [];
      setDoctors(assigned);
      setDoctorId(localStorage.getItem('secretarySelectedDoctorId') || assigned[0]?.id || '');
    }).catch(() => setError('No se pudieron cargar los médicos asignados.'));
  }, [user?.role]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      if (isPatient) {
        const response = await appointmentAPI.myQueue(date);
        setMyQueue(response.data || null);
      } else {
        const selectedDoctorId = user.role === 'doctor' ? user.id : doctorId;
        if (!selectedDoctorId) return;
        const response = await appointmentAPI.queue({ date, doctorId: selectedDoctorId });
        setQueue(response.data || []);
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'No se pudo cargar la cola.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user, date, doctorId]);

  const waitingCount = useMemo(() => queue.filter((item) => item.queue_status === 'waiting').length, [queue]);

  const callNext = async () => {
    setMessage('');
    try {
      await appointmentAPI.callNext({ date, doctorId: user.role === 'doctor' ? user.id : doctorId });
      setMessage('Se llamó al siguiente paciente.');
      await load();
    } catch (callError: any) {
      setError(callError?.message || 'No se pudo llamar al siguiente paciente.');
    }
  };

  const checkIn = async (id: string) => {
    try {
      await appointmentAPI.checkIn(id);
      setMessage('Paciente registrado en la cola.');
      await load();
    } catch (checkInError: any) {
      setError(checkInError?.message || 'No se pudo registrar la llegada.');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await appointmentAPI.updateQueueStatus(id, status);
      await load();
    } catch (statusError: any) {
      setError(statusError?.message || 'No se pudo actualizar el turno.');
    }
  };

  const page = (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-gray-950 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={isPatient ? '/patient/dashboard' : user?.role === 'doctor' ? '/doctor/dashboard' : '/secretary/dashboard'} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"><ChevronLeft className="h-4 w-4" /> Volver</Link>
            <h1 className="text-3xl font-bold">Seguimiento de turnos</h1>
            <p className="mt-1 text-gray-500">Cola de atención del día</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"><CalendarDays className="h-4 w-4 text-gray-500" /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <button type="button" onClick={load} className="rounded-xl border border-gray-200 bg-white p-3 text-gray-700 hover:bg-gray-50" title="Actualizar"><RefreshCw className="h-5 w-5" /></button>
          </div>
        </div>

        {canManage && user?.role === 'secretary' && <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="mb-5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"><option value="">Seleccionar médico</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.first_name} {doctor.last_name}</option>)}</select>}
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        {isPatient ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            {myQueue ? <><p className="text-sm font-semibold uppercase text-gray-500">Tu turno</p><p className="my-3 text-6xl font-black text-blue-600">#{myQueue.queue_number}</p><p className="font-semibold">{labels[myQueue.queue_status] || myQueue.queue_status}</p><p className="mt-2 text-sm text-gray-500">Dr. {myQueue.doctor_first_name} {myQueue.doctor_last_name}</p></> : <p className="text-gray-500">No tienes un turno activo para esta fecha.</p>}
          </div>
        ) : (
          <>
            <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">En espera</p><p className="mt-1 text-3xl font-bold text-amber-600">{waitingCount}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">En consulta</p><p className="mt-1 text-3xl font-bold text-blue-600">{queue.filter((item) => item.queue_status === 'in-consultation').length}</p></div><button type="button" onClick={callNext} disabled={!doctorId && user?.role !== 'doctor'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Megaphone className="h-5 w-5" /> Llamar siguiente</button></div>
            <div className="space-y-3">{loading ? <div className="rounded-2xl bg-white p-8 text-center text-gray-500">Cargando cola...</div> : queue.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center text-gray-500">No hay citas para esta fecha.</div> : queue.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-black text-blue-700">{item.queue_number ? `#${item.queue_number}` : '—'}</div><div><p className="font-bold">{item.first_name} {item.last_name}</p><p className="text-sm text-gray-500"><Clock3 className="mr-1 inline h-4 w-4" />{String(item.appointment_time).slice(0, 5)} · {labels[item.queue_status] || 'Sin llegada'}</p></div></div><div className="flex gap-2">{(!item.queue_status || item.queue_status === 'not_checked_in') && <button type="button" onClick={() => checkIn(item.id)} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white">Registrar llegada</button>}{item.queue_status === 'called' && <button type="button" onClick={() => updateStatus(item.id, 'in-consultation')} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Play className="h-4 w-4" /> Iniciar</button>}{item.queue_status === 'in-consultation' && <button type="button" onClick={() => updateStatus(item.id, 'completed')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4" /> Atender</button>}{item.queue_status === 'waiting' && <button type="button" onClick={() => updateStatus(item.id, 'no-show')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">No se presentó</button>}</div></div>)}</div>
          </>
        )}
      </div>
    </main>
  );

  if (isPatient) {
    return (
      <PatientShell
        title="Mi turno"
        subtitle="Consulta tu posición y el estado de tu atención"
      >
        {page}
      </PatientShell>
    );
  }

  if (user?.role === 'doctor') {
    return <DoctorShell title="Turnos" subtitle="Gestiona la cola de atención del día">{page}</DoctorShell>;
  }

  if (user?.role === 'secretary') {
    return <SecretaryShell title="Seguimiento de turnos" subtitle="Gestiona la cola de atención del día">{page}</SecretaryShell>;
  }

  return page;
}

export default function QueueRoute() {
  return <ProtectedRoute requiredRole={['patient', 'doctor', 'secretary', 'admin']}><QueuePage /></ProtectedRoute>;
}
