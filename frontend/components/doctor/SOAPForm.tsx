'use client';

import { useEffect, useState } from 'react';
import { SOAPData } from './clinical';
import { clinicalAPI } from '@/utils/api';
import { Icd10Suggestion, getIcd10Suggestions, suggestIcd10 } from '@/utils/icd10';

type SOAPFormProps = {
  value: SOAPData;
  onChange: (value: SOAPData) => void;
};

export default function SOAPForm({ value, onChange }: SOAPFormProps) {
  const [icd10Suggestions, setIcd10Suggestions] = useState<Icd10Suggestion[]>([]);
  const icd10Suggestion = icd10Suggestions[0] || suggestIcd10(value.primaryDiagnosis);

  useEffect(() => {
    const diagnosis = value.primaryDiagnosis.trim();
    if (diagnosis.length < 3) {
      setIcd10Suggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await clinicalAPI.searchIcd10(diagnosis, 6);
        const remoteSuggestions = (response?.data || []).map((item: any) => ({
          code: item.code,
          label: item.description,
          keywords: [],
        }));
        setIcd10Suggestions(remoteSuggestions.length ? remoteSuggestions : getIcd10Suggestions(diagnosis));
      } catch {
        setIcd10Suggestions(getIcd10Suggestions(diagnosis));
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value.primaryDiagnosis]);

  useEffect(() => {
    if (!value.primaryDiagnosisIcd10 && icd10Suggestions[0]?.code) {
      onChange({ ...value, primaryDiagnosisIcd10: icd10Suggestions[0].code });
    }
  }, [icd10Suggestions]);

  const updateDiagnosis = (diagnosis: string) => {
    const suggestion = suggestIcd10(diagnosis);
    onChange({
      ...value,
      primaryDiagnosis: diagnosis,
      primaryDiagnosisIcd10: value.primaryDiagnosisIcd10 || suggestion?.code || '',
    });
  };

  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Historia clinica SOAP</h2>
        <p className="text-sm text-gray-500">Registro estructurado de la atencion</p>
      </div>

      <div className="space-y-6">
        <SOAPSection title="Subjetivo">
          <Textarea label="Sintomas" value={value.symptoms} onChange={(text) => onChange({ ...value, symptoms: text })} required />
          <Textarea label="Motivo consulta" value={value.reasonForVisit} onChange={(text) => onChange({ ...value, reasonForVisit: text })} />
          <Input label="Dolor" value={value.pain} onChange={(text) => onChange({ ...value, pain: text })} placeholder="EVA 0-10, localizacion" />
          <Textarea label="Evolucion sintomas" value={value.symptomEvolution} onChange={(text) => onChange({ ...value, symptomEvolution: text })} />
        </SOAPSection>

        <SOAPSection title="Objetivo">
          <Textarea label="Examen fisico" value={value.physicalExam} onChange={(text) => onChange({ ...value, physicalExam: text })} />
          <Textarea label="Observaciones" value={value.objectiveObservations} onChange={(text) => onChange({ ...value, objectiveObservations: text })} />
        </SOAPSection>

        <SOAPSection title="Analisis">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px] gap-4">
            <Input label="Diagnostico principal" value={value.primaryDiagnosis} onChange={updateDiagnosis} required />
            <Input label="CIE-10" value={value.primaryDiagnosisIcd10 || ''} onChange={(text) => onChange({ ...value, primaryDiagnosisIcd10: text.toUpperCase() })} placeholder="E11" />
            {icd10Suggestion && icd10Suggestion.code !== value.primaryDiagnosisIcd10 && (
              <button
                type="button"
                onClick={() => onChange({ ...value, primaryDiagnosisIcd10: icd10Suggestion.code })}
                className="md:col-span-2 w-fit rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-800 hover:bg-blue-100"
              >
                Sugerido: {icd10Suggestion.code} · {icd10Suggestion.label}
              </button>
            )}
            {icd10Suggestions.length > 1 && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {icd10Suggestions.slice(1, 5).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => onChange({ ...value, primaryDiagnosisIcd10: item.code })}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-900">{item.code}</span>
                    <span className="ml-2 text-gray-600">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input label="Diagnosticos secundarios" value={value.secondaryDiagnoses} onChange={(text) => onChange({ ...value, secondaryDiagnoses: text })} />
          <Textarea label="Impresion clinica" value={value.clinicalImpression} onChange={(text) => onChange({ ...value, clinicalImpression: text })} />
        </SOAPSection>

        <SOAPSection title="Plan">
          <Textarea label="Tratamiento" value={value.treatment} onChange={(text) => onChange({ ...value, treatment: text })} required />
          <Textarea label="Medicamentos" value={value.medications} onChange={(text) => onChange({ ...value, medications: text })} />
          <Textarea label="Laboratorios" value={value.labs} onChange={(text) => onChange({ ...value, labs: text })} />
          <Textarea label="Indicaciones" value={value.instructions} onChange={(text) => onChange({ ...value, instructions: text })} />
          <Textarea label="Seguimiento" value={value.followUp} onChange={(text) => onChange({ ...value, followUp: text })} />
        </SOAPSection>
      </div>
    </section>
  );
}

function SOAPSection({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase text-gray-400">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label>
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="md:col-span-2">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={3}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
