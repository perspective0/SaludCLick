'use client';

import { FormEvent } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { maskDominicanId, maskInsuranceNumber, maskPhone } from '@/utils/inputMasks';

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
  hasInsurance: false,
  insuranceProvider: '',
  insuranceNumber: '',
};

export type ManualPatientForm = typeof emptyManualPatientForm;

export default function ManualPatientModal({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
  searchTerm,
  searchResults,
  searching,
  onSearchTermChange,
  onSearch,
  onAssociate,
}: {
  form: ManualPatientForm;
  saving: boolean;
  onChange: (value: ManualPatientForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  searchTerm: string;
  searchResults: any[];
  searching: boolean;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  onAssociate: (patient: any) => void;
}) {
  const { locale } = useI18n();
  const en = locale === 'en';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <p className="text-xs font-bold uppercase text-blue-600">{en ? 'Manual registration' : 'Registro manual'}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950">{en ? 'New office patient' : 'Nuevo paciente de consultorio'}</h2>
            <p className="mt-1 text-sm text-gray-500">{en ? 'For patients who arrive in person and do not yet have a SaludClick account.' : 'Para pacientes que llegan físicamente y aún no tienen cuenta en SaludClick.'}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label={en ? 'Close' : 'Cerrar'}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">{en ? 'Search an existing SaludClick patient' : 'Buscar un paciente existente en SaludClick'}</p>
            <p className="mt-1 text-xs text-blue-700">{en ? 'Use name, email, phone or document before creating a new profile.' : 'Busca por nombre, correo, teléfono o documento antes de crear un perfil nuevo.'}</p>
            <div className="mt-3 flex gap-2">
              <input value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder={en ? 'Search patient...' : 'Buscar paciente...'} className="h-10 min-w-0 flex-1 rounded-lg border border-blue-200 px-3 text-sm" />
              <button type="button" onClick={onSearch} disabled={searching || searchTerm.trim().length < 2} className="rounded-lg bg-blue-600 px-3 text-sm font-bold text-white disabled:opacity-50">{searching ? '...' : (en ? 'Search' : 'Buscar')}</button>
            </div>
            {searchResults.length > 0 && <div className="mt-3 space-y-2">{searchResults.map((patient) => <div key={patient.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm"><div><p className="font-semibold">{patient.first_name} {patient.last_name}</p><p className="text-xs text-gray-500">{patient.document_number || patient.email || patient.phone || (en ? 'No identifier' : 'Sin identificador')}</p></div><button type="button" onClick={() => onAssociate(patient)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{patient.associated ? (en ? 'Associated' : 'Asociado') : (en ? 'Associate' : 'Asociar')}</button></div>)}</div>}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={en ? 'First name *' : 'Nombre *'} value={form.firstName} onChange={(value) => onChange({ ...form, firstName: value })} required />
            <Field label={en ? 'Last name *' : 'Apellido *'} value={form.lastName} onChange={(value) => onChange({ ...form, lastName: value })} required />
            <Field label={en ? 'Phone' : 'Teléfono'} value={form.phone} onChange={(value) => onChange({ ...form, phone: value })} mask={maskPhone} />
            <Field label={en ? 'Optional email' : 'Correo opcional'} type="email" value={form.email} onChange={(value) => onChange({ ...form, email: value })} />
            <Field label={en ? 'Document / ID' : 'Documento / Cédula'} value={form.documentNumber} onChange={(value) => onChange({ ...form, documentNumber: value })} mask={maskDominicanId} maxLength={13} />
            <Field label={en ? 'Date of birth' : 'Fecha de nacimiento'} type="date" value={form.dateOfBirth} onChange={(value) => onChange({ ...form, dateOfBirth: value })} />
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">{en ? 'Gender' : 'Sexo'}</span>
              <select
                value={form.gender}
                onChange={(event) => onChange({ ...form, gender: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{en ? 'Not specified' : 'No especificado'}</option>
                <option value="female">{en ? 'Female' : 'Femenino'}</option>
                <option value="male">{en ? 'Male' : 'Masculino'}</option>
                <option value="other">{en ? 'Other' : 'Otro'}</option>
              </select>
            </label>
            <Field label={en ? 'City' : 'Ciudad'} value={form.city} onChange={(value) => onChange({ ...form, city: value })} />
            <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              <input type="checkbox" checked={form.hasInsurance} onChange={(event) => onChange({ ...form, hasInsurance: event.target.checked, insuranceProvider: event.target.checked ? form.insuranceProvider : '', insuranceNumber: event.target.checked ? form.insuranceNumber : '' })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">{en ? 'Patient has health insurance' : 'El paciente tiene seguro médico'}</span>
            </label>
            {form.hasInsurance && <>
              <Field label={en ? 'Insurance provider' : 'Aseguradora'} value={form.insuranceProvider} onChange={(value) => onChange({ ...form, insuranceProvider: value })} />
              <Field label={en ? 'Insurance / NSS number' : 'Número de seguro / NSS'} value={form.insuranceNumber} onChange={(value) => onChange({ ...form, insuranceNumber: maskInsuranceNumber(value) })} required />
            </>}
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">{en ? 'Address' : 'Dirección'}</span>
              <input
                value={form.address}
                onChange={(event) => onChange({ ...form, address: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">{en ? 'Initial reason' : 'Motivo inicial'}</span>
              <textarea
                value={form.reasonForVisit}
                onChange={(event) => onChange({ ...form, reasonForVisit: event.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={en ? 'E.g. patient arrives with abdominal pain...' : 'Ej: paciente llega por dolor abdominal...'}
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">{en ? 'Known medical history' : 'Antecedentes conocidos'}</span>
              <textarea
                value={form.medicalHistory}
                onChange={(event) => onChange({ ...form, medicalHistory: event.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={en ? 'Allergies, known conditions, current medications...' : 'Alergias, condiciones conocidas, medicamentos actuales...'}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">{en ? 'Cancel' : 'Cancelar'}</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? (en ? 'Registering...' : 'Registrando...') : (en ? 'Register patient' : 'Registrar paciente')}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, mask, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; mask?: (value: string) => string; maxLength?: number }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(mask ? mask(event.target.value) : event.target.value)}
        onBlur={(event) => { if (mask) onChange(mask(event.target.value)); }}
        required={required}
        className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
