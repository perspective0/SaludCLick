'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import FeedbackForm from '@/components/FeedbackForm';
import { MessageSquare } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function DoctorFeedbackPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title={en ? 'Questions and recommendations' : 'Preguntas y recomendaciones'} subtitle={en ? 'Direct channel with the administrative team' : 'Canal directo con el equipo administrativo'}>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <FeedbackForm audience="doctor" />
          <aside className="rounded-2xl bg-white border border-gray-200 p-6 h-fit">
            <MessageSquare className="w-8 h-8 text-blue-600 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">{en ? 'Administrative follow-up' : 'Seguimiento administrativo'}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {en ? 'Use this space for operational questions, improvement requests, scheduling issues or recommendations for the team.' : 'Usa este espacio para dudas operativas, solicitudes de mejora, problemas con agenda o recomendaciones para el equipo.'}
            </p>
          </aside>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}
