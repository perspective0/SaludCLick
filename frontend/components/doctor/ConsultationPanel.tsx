'use client';

import Link from 'next/link';
import { AlertCircle, CalendarCheck, ClipboardList, Pill } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

type ConsultationPanelProps = {
  patientId: string;
  appointments: any[];
  prescriptions: any[];
  records: any[];
};

const mockClinicalContext = {
  diagnoses: ['Control general', 'Seguimiento hipertension', 'Dolor agudo'],
  medications: ['Sin medicacion actual documentada'],
  allergies: ['Sin alergias registradas'],
  history: ['Antecedentes no documentados'],
};

export default function ConsultationPanel({ patientId, appointments, prescriptions, records }: ConsultationPanelProps) {
  return (
    <aside className="space-y-5">
      <Panel title="Historial de citas" icon={CalendarCheck}>
        {appointments.length ? (
          <div className="space-y-3">
            {appointments.slice(0, 5).map((appointment) => (
              <div key={appointment.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{formatDate(appointment.appointment_date)} · {appointment.appointment_time}</p>
                <p className="text-xs text-gray-500">{appointment.reason_for_visit || appointment.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Sin citas previas." />
        )}
      </Panel>

      <Panel title="Recetas recientes" icon={Pill}>
        {prescriptions.length ? (
          <div className="space-y-3">
            {prescriptions.slice(0, 4).map((prescription) => (
              <div key={prescription.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{formatMedications(prescription.medications)}</p>
                <p className="text-xs text-gray-500">{formatRecordDate(prescription.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Sin recetas emitidas." />
        )}
        <Link href={`/doctor/prescriptions?patientId=${patientId}`} className="mt-3 h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 flex items-center justify-center">
          Generar receta
        </Link>
      </Panel>

      <Panel title="Contexto clinico" icon={ClipboardList}>
        <ContextList title="Diagnosticos frecuentes" items={records.length ? records.slice(0, 3).map((record) => record.diagnosis || 'Registro clinico') : mockClinicalContext.diagnoses} />
        <ContextList title="Medicamentos actuales" items={mockClinicalContext.medications} />
        <ContextList title="Alergias" items={mockClinicalContext.allergies} />
        <ContextList title="Antecedentes" items={mockClinicalContext.history} />
      </Panel>
    </aside>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: any }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-600" />
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ContextList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-t border-gray-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-xs font-semibold uppercase text-gray-400 mb-2">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-sm text-gray-700">{item}</p>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-center">
      <AlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function formatRecordDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-DO');
}

function formatMedications(value: any) {
  const medications = typeof value === 'string' ? safeJson(value) : value;
  if (!Array.isArray(medications) || medications.length === 0) return 'Sin medicamentos registrados';
  return medications.map((item) => `${item.name || item.medication || 'Medicamento'} ${item.dosage || ''}`.trim()).join(', ');
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
