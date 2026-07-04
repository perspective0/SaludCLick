'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import FeedbackForm from '@/components/FeedbackForm';
import { MessageSquare } from 'lucide-react';

export default function DoctorFeedbackPage() {
  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Preguntas y recomendaciones" subtitle="Canal directo con el equipo administrativo">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <FeedbackForm audience="doctor" />
          <aside className="rounded-2xl bg-white border border-gray-200 p-6 h-fit">
            <MessageSquare className="w-8 h-8 text-blue-600 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Seguimiento administrativo</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Usa este espacio para dudas operativas, solicitudes de mejora, problemas con agenda o recomendaciones para el equipo.
            </p>
          </aside>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}
