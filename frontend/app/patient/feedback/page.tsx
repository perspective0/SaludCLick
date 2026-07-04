'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import FeedbackForm from '@/components/FeedbackForm';

export default function PatientFeedbackPage() {
  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title="Ayuda y sugerencias" subtitle="Comparte dudas, recomendaciones o comentarios sobre tu experiencia">
        <div className="max-w-3xl rounded-2xl border border-gray-200 bg-white p-6">
          <FeedbackForm audience="patient" />
        </div>
      </PatientShell>
    </ProtectedRoute>
  );
}
