'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import FeedbackForm from '@/components/FeedbackForm';
import { useI18n } from '@/i18n';

export default function PatientFeedbackPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title={en ? 'Help and feedback' : 'Ayuda y sugerencias'} subtitle={en ? 'Share questions, recommendations or comments about your experience' : 'Comparte dudas, recomendaciones o comentarios sobre tu experiencia'}>
        <div className="max-w-3xl rounded-2xl border border-gray-200 bg-white p-6">
          <FeedbackForm audience="patient" />
        </div>
      </PatientShell>
    </ProtectedRoute>
  );
}
