'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '@/i18n';

type Medication = {
  name: string;
  presentation?: string;
  dosage: string;
  route?: string;
  frequency: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
};

type PrescriptionPreviewProps = {
  patientName: string;
  doctorName?: string;
  medications?: Medication[];
  notes?: string;
  diagnosis?: string;
  validationCode?: string;
  verifyUrl?: string;
  signature?: string;
  seal?: string;
  digitalSealEnabled?: boolean;
  healthCenterName?: string;
};

export default function PrescriptionPreview({
  patientName,
  doctorName = 'Medico tratante',
  medications = [],
  notes,
  diagnosis,
  validationCode,
  verifyUrl,
  signature,
  seal,
  digitalSealEnabled = false,
  healthCenterName,
}: PrescriptionPreviewProps) {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!verifyUrl) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 160,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [verifyUrl]);

  return (
    <section translate="no" className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
        <div>
          <Image src="/saludclick.png" alt="SaludClick" width={160} height={70} className="h-10 w-auto" />
          <p className="text-xs text-gray-500 mt-2">{en ? 'Digital prescription' : 'Receta médica digital'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
          <p className="text-xs text-gray-500">{validationCode || (en ? 'Code after saving' : 'Código al guardar')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <PreviewLine label={en ? 'Patient' : 'Paciente'} value={patientName || (en ? 'Selected patient' : 'Paciente seleccionado')} />
        {healthCenterName && <PreviewLine label={en ? 'Health center' : 'Centro de salud'} value={healthCenterName} />}
        <PreviewLine label={en ? 'Associated diagnosis' : 'Diagnóstico asociado'} value={diagnosis || (en ? 'Select a medical record' : 'Selecciona un registro médico')} />

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-3">{en ? 'Medications' : 'Medicamentos'}</p>
          {medications.length === 0 ? (
            <p className="text-sm text-gray-500">{en ? 'Add medications to preview the prescription.' : 'Agrega medicamentos para previsualizar la receta.'}</p>
          ) : (
            <div className="space-y-3">
              {medications.map((item, index) => (
                <div key={`${item.name}-${index}`} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                  <p className="font-bold text-gray-900">{index + 1}. {item.name || (en ? 'Medication' : 'Medicamento')}</p>
                  <p className="text-sm text-gray-600 mt-1">{[item.presentation, item.dosage, item.route, item.frequency, item.duration, item.quantity].filter(Boolean).join(' · ')}</p>
                  {item.instructions && <p className="text-sm text-gray-500 mt-1">{item.instructions}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {notes && <PreviewLine label={en ? 'General instructions' : 'Indicaciones generales'} value={notes} />}

        <div className="pt-8 flex items-end justify-between gap-4">
          <div className="space-y-4">
            {!digitalSealEnabled && (
              <div>
                <div className="h-12 w-40 border-b border-gray-300 flex items-end text-sm text-gray-600">{signature || doctorName}</div>
                <p className="text-xs text-gray-500 mt-2">{en ? 'Medical signature' : 'Firma médica'}</p>
                <p className="text-sm font-semibold text-gray-900">{doctorName}</p>
              </div>
            )}
            {digitalSealEnabled && (
              <div>
                <p className="text-sm font-semibold text-gray-900">{doctorName}</p>
                <p className="text-xs text-gray-500">{en ? 'Electronically signed' : 'Firmada electrónicamente'}</p>
              </div>
            )}
            <div className="flex min-h-16 w-44 items-center justify-center rounded-lg border border-dashed border-gray-300 p-2">
              {seal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seal} alt={en ? 'Medical seal' : 'Sello médico'} className="max-h-14 max-w-full object-contain" />
              ) : null}
            </div>
          </div>
          <div className="w-28 rounded-lg border border-blue-100 bg-white p-2 text-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={en ? 'Prescription verification QR' : 'QR de validación de receta'} className="h-24 w-24" />
            ) : (
              <div className="h-24 w-24 rounded-lg border-2 border-dashed border-blue-200 text-blue-500 flex items-center justify-center text-[10px] font-bold">
                {en ? 'Verification QR' : 'QR validación'}
              </div>
            )}
            {validationCode && <p className="mt-1 text-[10px] font-bold text-gray-500 break-all">{validationCode}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
