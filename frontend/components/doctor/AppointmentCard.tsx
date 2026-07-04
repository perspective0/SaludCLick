'use client';

import Link from 'next/link';
import { CalendarClock, CheckCircle2, Clock3, Stethoscope, X } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

type AppointmentCardProps = {
  appointment: any;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (appointment: any) => void;
};

const statusStyles: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  'no-show': 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  waiting: 'En espera',
  cancelled: 'Cancelada',
  'no-show': 'No asistio',
};

export default function AppointmentCard({ appointment, onComplete, onCancel, onReschedule }: AppointmentCardProps) {
  const patientId = appointment.patient_id || appointment.patientId || '';
  const canManage = !['completed', 'cancelled', 'no-show'].includes(appointment.status);

  return (
    <article className="rounded-2xl bg-white border border-gray-200 p-5 hover:border-blue-200 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-lg font-bold text-gray-900">
              <Clock3 className="w-5 h-5 text-blue-600" />
              {appointment.appointment_time || 'Sin hora'}
            </span>
            <span className={`inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[appointment.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {statusLabels[appointment.status] || appointment.status}
            </span>
            <span className={`inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${appointment.appointment_type === 'teleconsulta' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {appointment.appointment_type === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'}
            </span>
          </div>
          <h2 className="font-bold text-gray-900">{getAppointmentName(appointment)}</h2>
          <p className="text-sm text-gray-500 mt-1">{formatDate(appointment.appointment_date)} · 30 min</p>
          <p className="text-sm text-gray-600 mt-2">{appointment.reason_for_visit || 'Sin motivo registrado'}</p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {canManage && (
            <Link href={`/doctor/consultation?appointmentId=${appointment.id}&patientId=${patientId}`} className="h-10 px-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 inline-flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Iniciar
            </Link>
          )}
          {appointment.appointment_type === 'teleconsulta' && appointment.video_room_url && (
            <Link href={appointment.video_room_url} className="h-10 px-3 rounded-xl border border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-50 inline-flex items-center gap-2">
              Teleconsulta
            </Link>
          )}
          {canManage && onReschedule && (
            <button onClick={() => onReschedule(appointment)} className="h-10 px-3 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 inline-flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Reagendar
            </button>
          )}
          {canManage && onComplete && (
            <button onClick={() => onComplete(appointment.id)} className="h-10 px-3 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completar
            </button>
          )}
          {canManage && onCancel && (
            <button onClick={() => onCancel(appointment.id)} className="h-10 px-3 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 inline-flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function getAppointmentName(appointment: any) {
  return `${appointment.first_name || appointment.patient_first_name || ''} ${appointment.last_name || appointment.patient_last_name || ''}`.trim() || 'Paciente';
}
