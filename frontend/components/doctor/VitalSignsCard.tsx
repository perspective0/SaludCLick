'use client';

import { calculateBMI, VitalSigns } from './clinical';

type VitalSignsCardProps = {
  value: VitalSigns;
  onChange: (value: VitalSigns) => void;
};

const fields: { key: keyof VitalSigns; label: string; placeholder: string }[] = [
  { key: 'bloodPressure', label: 'Presion arterial', placeholder: '120/80' },
  { key: 'temperature', label: 'Temperatura', placeholder: '36.8 C' },
  { key: 'heartRate', label: 'Frecuencia cardiaca', placeholder: '72 lpm' },
  { key: 'respiratoryRate', label: 'Frecuencia respiratoria', placeholder: '16 rpm' },
  { key: 'oxygenSaturation', label: 'Saturacion', placeholder: '98%' },
  { key: 'weight', label: 'Peso', placeholder: '70 kg' },
  { key: 'height', label: 'Altura', placeholder: '170 cm' },
];

export default function VitalSignsCard({ value, onChange }: VitalSignsCardProps) {
  const bmi = calculateBMI(value.weight, value.height);
  const bmiStatus = getBmiStatus(bmi);
  const missingBmiData = getMissingBmiData(value.weight, value.height);

  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Signos vitales</h2>
          <p className="text-sm text-gray-500">Registro rapido de consulta</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-right min-w-36">
          <p className="text-xs font-semibold text-blue-600">IMC</p>
          <p className="font-bold text-blue-950">{bmi || 'Pendiente'}</p>
          <p className="text-[11px] text-blue-700">{bmi ? bmiStatus : missingBmiData}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {fields.map((field) => (
          <label key={field.key}>
            <span className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</span>
            <input
              value={value[field.key]}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
              placeholder={field.placeholder}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function getMissingBmiData(weight: string, height: string) {
  if (!weight && !height) return 'Agrega peso y altura';
  if (!weight) return 'Falta peso';
  if (!height) return 'Falta altura';
  return 'Revisa formato';
}

function getBmiStatus(value: string) {
  const bmi = Number(value);
  if (!bmi) return '';
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidad';
}
