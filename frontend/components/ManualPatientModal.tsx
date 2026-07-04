'use client';

import { FormEvent } from 'react';
import { X } from 'lucide-react';

export const emptyManualPatientForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  documentNumber: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  reasonForVisit: '',
  medicalHistory: '',
};

export type ManualPatientForm = typeof emptyManualPatientForm;

export default function ManualPatientModal({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: ManualPatientForm;
  saving: boolean;
  onChange: (value: ManualPatientForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <p className="text-xs font-bold uppercase text-blue-600">Registro manual</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950">Nuevo paciente de consultorio</h2>
            <p className="mt-1 text-sm text-gray-500">Para pacientes que llegan físicamente y aún no tienen cuenta en SaludClick.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre *" value={form.firstName} onChange={(value) => onChange({ ...form, firstName: value })} required />
            <Field label="Apellido *" value={form.lastName} onChange={(value) => onChange({ ...form, lastName: value })} required />
            <Field label="Teléfono" value={form.phone} onChange={(value) => onChange({ ...form, phone: value })} />
            <Field label="Correo opcional" type="email" value={form.email} onChange={(value) => onChange({ ...form, email: value })} />
            <Field label="Documento / Cédula" value={form.documentNumber} onChange={(value) => onChange({ ...form, documentNumber: value })} />
            <Field label="Fecha de nacimiento" type="date" value={form.dateOfBirth} onChange={(value) => onChange({ ...form, dateOfBirth: value })} />
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Sexo</span>
              <select
                value={form.gender}
                onChange={(event) => onChange({ ...form, gender: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No especificado</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <Field label="Ciudad" value={form.city} onChange={(value) => onChange({ ...form, city: value })} />
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Dirección</span>
              <input
                value={form.address}
                onChange={(event) => onChange({ ...form, address: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Motivo inicial</span>
              <textarea
                value={form.reasonForVisit}
                onChange={(event) => onChange({ ...form, reasonForVisit: event.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: paciente llega por dolor abdominal..."
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Antecedentes conocidos</span>
              <textarea
                value={form.medicalHistory}
                onChange={(event) => onChange({ ...form, medicalHistory: event.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Alergias, condiciones conocidas, medicamentos actuales..."
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Registrando...' : 'Registrar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
