'use client';

import { calculateBMI, VitalSigns } from './clinical';
import { useI18n } from '@/i18n';

type VitalSignsCardProps = {
  value: VitalSigns;
  onChange: (value: VitalSigns) => void;
};

export default function VitalSignsCard({ value, onChange }: VitalSignsCardProps) {
  const { locale } = useI18n();
  const en = locale === 'en';
  const fields: { key: keyof VitalSigns; label: string; placeholder: string }[] = [
    { key: 'bloodPressure', label: en ? 'Blood pressure' : 'Presión arterial', placeholder: '120/80' },
    { key: 'temperature', label: en ? 'Temperature' : 'Temperatura', placeholder: '36.8 C' },
    { key: 'heartRate', label: en ? 'Heart rate' : 'Frecuencia cardíaca', placeholder: en ? '72 bpm' : '72 lpm' },
    { key: 'respiratoryRate', label: en ? 'Respiratory rate' : 'Frecuencia respiratoria', placeholder: '16 rpm' },
    { key: 'oxygenSaturation', label: en ? 'Oxygen saturation' : 'Saturación', placeholder: '98%' },
    { key: 'weight', label: en ? 'Weight' : 'Peso', placeholder: '70 kg' },
    { key: 'height', label: en ? 'Height' : 'Altura', placeholder: '170 cm' },
  ];
  const bmi = calculateBMI(value.weight, value.height);
  const bmiStatus = getBmiStatus(bmi, en);
  const missingBmiData = getMissingBmiData(value.weight, value.height, en);

  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{en ? 'Vital signs' : 'Signos vitales'}</h2>
          <p className="text-sm text-gray-500">{en ? 'Quick consultation entry' : 'Registro rápido de consulta'}</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-right min-w-36">
          <p className="text-xs font-semibold text-blue-600">{en ? 'BMI' : 'IMC'}</p>
          <p className="font-bold text-blue-950">{bmi || (en ? 'Pending' : 'Pendiente')}</p>
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
              inputMode="decimal"
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(field.key === 'weight' || field.key === 'height') && (
              <span className="mt-1 block text-[11px] text-gray-400">
                {field.key === 'weight'
                  ? (en ? 'Enter kg, lb or lbs' : 'Introduce kg, lb o lbs')
                  : (en ? 'Enter cm, m or ft/in' : 'Introduce cm, m o pies/pulgadas')}
              </span>
            )}
          </label>
        ))}
      </div>
    </section>
  );
}

function getMissingBmiData(weight: string, height: string, en: boolean) {
  if (!weight && !height) return en ? 'Add weight and height' : 'Agrega peso y altura';
  if (!weight) return en ? 'Weight missing' : 'Falta peso';
  if (!height) return en ? 'Height missing' : 'Falta altura';
  return en ? 'Check format' : 'Revisa formato';
}

function getBmiStatus(value: string, en: boolean) {
  const bmi = Number(value);
  if (!bmi) return '';
  if (bmi < 18.5) return en ? 'Underweight' : 'Bajo peso';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return en ? 'Overweight' : 'Sobrepeso';
  return en ? 'Obesity' : 'Obesidad';
}
