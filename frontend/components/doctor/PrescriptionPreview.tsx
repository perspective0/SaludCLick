'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

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
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
        <div>
          <Image src="/saludclick.png" alt="SaludClick" width={160} height={70} className="h-10 w-auto" />
          <p className="text-xs text-gray-500 mt-2">Receta medica digital</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('es-DO')}</p>
          <p className="text-xs text-gray-500">{validationCode || 'Codigo al guardar'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <PreviewLine label="Paciente" value={patientName || 'Paciente seleccionado'} />
        {healthCenterName && <PreviewLine label="Centro de salud" value={healthCenterName} />}
        <PreviewLine label="Diagnostico asociado" value={diagnosis || 'Selecciona un registro medico'} />

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-3">Medicamentos</p>
          {medications.length === 0 ? (
            <p className="text-sm text-gray-500">Agrega medicamentos para previsualizar la receta.</p>
          ) : (
            <div className="space-y-3">
              {medications.map((item, index) => (
                <div key={`${item.name}-${index}`} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                  <p className="font-bold text-gray-900">{index + 1}. {item.name || 'Medicamento'}</p>
                  <p className="text-sm text-gray-600 mt-1">{[item.presentation, item.dosage, item.route, item.frequency, item.duration, item.quantity].filter(Boolean).join(' · ')}</p>
                  {item.instructions && <p className="text-sm text-gray-500 mt-1">{item.instructions}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {notes && <PreviewLine label="Indicaciones generales" value={notes} />}

        <div className="pt-8 flex items-end justify-between gap-4">
          <div className="space-y-4">
            {!digitalSealEnabled && (
              <div>
                <div className="h-12 w-40 border-b border-gray-300 flex items-end text-sm text-gray-600">{signature || doctorName}</div>
                <p className="text-xs text-gray-500 mt-2">Firma medica</p>
                <p className="text-sm font-semibold text-gray-900">{doctorName}</p>
              </div>
            )}
            {digitalSealEnabled && (
              <div>
                <p className="text-sm font-semibold text-gray-900">{doctorName}</p>
                <p className="text-xs text-gray-500">Firmada electronicamente</p>
              </div>
            )}
            <div className="flex min-h-16 w-44 items-center justify-center rounded-lg border border-dashed border-gray-300 p-2">
              {seal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seal} alt="Sello medico" className="max-h-14 max-w-full object-contain" />
              ) : null}
            </div>
          </div>
          <div className="w-28 rounded-lg border border-blue-100 bg-white p-2 text-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR de validacion de receta" className="h-24 w-24" />
            ) : (
              <div className="h-24 w-24 rounded-lg border-2 border-dashed border-blue-200 text-blue-500 flex items-center justify-center text-[10px] font-bold">
                QR validacion
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
