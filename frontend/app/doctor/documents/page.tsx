'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import { doctorAPI, medicalAPI } from '@/utils/api';
import { Copy, FileText, Printer, Save, XCircle } from 'lucide-react';

type DocumentType = 'certificate' | 'medical_constancy' | 'referral' | 'disability';

type FrequentText = {
  title: string;
  category: string;
  content: string;
};

const documentTypes: Array<{ value: DocumentType; label: string; title: string; categoryLabel: string; titlePlaceholder: string; categoryPlaceholder: string; contentLabel: string }> = [
  {
    value: 'certificate',
    label: 'Certificado medico',
    title: 'Certificado medico',
    categoryLabel: 'Tipo de certificado',
    titlePlaceholder: 'Certificado medico',
    categoryPlaceholder: 'Condicion de salud, aptitud, reposo...',
    contentLabel: 'Texto del certificado',
  },
  {
    value: 'medical_constancy',
    label: 'Constancia medica',
    title: 'Constancia medica',
    categoryLabel: 'Tipo de constancia',
    titlePlaceholder: 'Constancia medica',
    categoryPlaceholder: 'Asistencia a consulta, evaluacion...',
    contentLabel: 'Texto de la constancia',
  },
  {
    value: 'referral',
    label: 'Referimiento',
    title: 'Referimiento medico',
    categoryLabel: 'Especialidad / destino',
    titlePlaceholder: 'Referimiento a cardiologia',
    categoryPlaceholder: 'Cardiologia, endocrinologia...',
    contentLabel: 'Motivo / indicaciones',
  },
  {
    value: 'disability',
    label: 'Incapacidad',
    title: 'Incapacidad medica',
    categoryLabel: 'Periodo',
    titlePlaceholder: 'Reposo medico',
    categoryPlaceholder: '3 dias, 5 dias...',
    contentLabel: 'Indicaciones',
  },
];

const defaultFrequent: Record<DocumentType, FrequentText[]> = {
  certificate: [
    { title: 'Certificado medico', category: 'Condicion de salud', content: 'Paciente evaluado clinicamente. Se emite certificacion medica segun hallazgos y criterio profesional.' },
    { title: 'Certificado medico laboral', category: 'Aptitud laboral', content: 'Se emite certificacion medica para fines laborales segun evaluacion clinica realizada.' },
  ],
  medical_constancy: [
    { title: 'Constancia medica', category: 'Asistencia a consulta', content: 'Se hace constar que el paciente asistio a consulta medica en la fecha indicada.' },
    { title: 'Constancia de evaluacion', category: 'Evaluacion medica', content: 'Se hace constar que el paciente fue evaluado en este centro de salud.' },
  ],
  referral: [
    { title: 'Referimiento a cardiologia', category: 'Cardiologia', content: 'Se refiere para evaluacion y manejo especializado.' },
    { title: 'Referimiento a ortopedia', category: 'Ortopedia', content: 'Se refiere para evaluacion por especialista.' },
  ],
  disability: [
    { title: 'Reposo medico', category: '3 dias', content: 'Reposo domiciliario, tratamiento indicado y reevaluacion segun evolucion.' },
    { title: 'Incapacidad laboral temporal', category: '5 dias', content: 'Evitar esfuerzos fisicos durante el periodo indicado.' },
  ],
};

const frequentStorageKey = 'saludclick_doctor_document_frequents';

export default function DoctorDocumentsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [doctorCenters, setDoctorCenters] = useState<any[]>([]);
  const [doctorSealImage, setDoctorSealImage] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [frequents, setFrequents] = useState<Record<DocumentType, FrequentText[]>>(defaultFrequent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printAfterSave, setPrintAfterSave] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    type: 'certificate' as DocumentType,
    patientId: '',
    medicalRecordId: '',
    healthCenterId: '',
    diagnosis: '',
    icd10Code: '',
    title: '',
    category: '',
    content: '',
    digitalSealEnabled: false,
  });

  const typeConfig = useMemo(() => documentTypes.find((item) => item.value === form.type) || documentTypes[0], [form.type]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLoading(false);
      return;
    }
    const user = JSON.parse(storedUser);
    const doctorId = resolveCurrentUserId(user);
    const patientId = new URLSearchParams(window.location.search).get('patientId') || '';
    if (patientId) {
      setSelectedPatientId(patientId);
      setForm((current) => ({ ...current, patientId }));
    }
    loadInitialData(doctorId);
    loadFrequentTextsFromApi();
  }, []);

  useEffect(() => {
    if (selectedPatientId) loadPatientData(selectedPatientId);
  }, [selectedPatientId]);

  const loadInitialData = async (doctorId: string) => {
    setLoading(true);
    setError('');
    try {
      const [patientResponse, doctorResponse] = await Promise.all([
        doctorAPI.getPatients(doctorId),
        doctorAPI.getById(doctorId).catch(() => null),
      ]);
      const patientData = patientResponse?.data || [];
      const centers = getDoctorCenters(doctorResponse?.data);
      setPatients(patientData);
      setDoctorCenters(centers);
      setDoctorSealImage(doctorResponse?.data?.prescription_seal || '');
      const firstPatientId = selectedPatientId || patientData[0]?.id || '';
      setSelectedPatientId(firstPatientId);
      setForm((current) => ({
        ...current,
        patientId: firstPatientId,
        healthCenterId: current.healthCenterId || centers[0]?.id || '',
        title: current.title || documentTypes[0].title,
      }));
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la informacion inicial.');
    } finally {
      setLoading(false);
    }
  };

  const loadFrequentTextsFromApi = async () => {
    try {
      const response = await medicalAPI.getDocumentTemplates();
      const rows = response?.data || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        setFrequents(loadFrequentTexts());
        return;
      }
      const grouped: Record<DocumentType, FrequentText[]> = {
        certificate: [],
        medical_constancy: [],
        referral: [],
        disability: [],
      };
      rows.forEach((row: any) => {
        const documentType = row.document_type;
        if (!isDocumentType(documentType)) return;
        grouped[documentType].push({
          title: row.title || getTypeTitle(documentType),
          category: row.category || '',
          content: row.content || '',
        });
      });
      setFrequents({
        certificate: grouped.certificate.length ? grouped.certificate : defaultFrequent.certificate,
        medical_constancy: grouped.medical_constancy.length ? grouped.medical_constancy : defaultFrequent.medical_constancy,
        referral: grouped.referral.length ? grouped.referral : defaultFrequent.referral,
        disability: grouped.disability.length ? grouped.disability : defaultFrequent.disability,
      });
    } catch {
      setFrequents(loadFrequentTexts());
    }
  };

  const loadPatientData = async (patientId: string) => {
    setError('');
    try {
      const [recordResponse, documentResponse] = await Promise.all([
        medicalAPI.getPatientHistory(patientId),
        medicalAPI.getPatientLabOrders(patientId),
      ]);
      const recordData = recordResponse?.data || [];
      const documentData = (documentResponse?.data || []).filter((item: any) => ['certificate', 'medical_constancy', 'referral', 'disability'].includes(item.order_type));
      setRecords(recordData);
      setDocuments(documentData);
      setSelectedDocument(documentData[0] || null);
      setForm((current) => ({
        ...current,
        patientId,
        medicalRecordId: current.medicalRecordId || recordData[0]?.id || '',
        diagnosis: current.diagnosis || recordData[0]?.diagnosis || '',
        icd10Code: current.icd10Code || recordData[0]?.icd10_code || '',
      }));
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los documentos del paciente.');
    }
  };

  const saveDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId || !form.content.trim()) {
      setError('Selecciona un paciente y escribe el contenido del documento.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const title = form.title.trim() || typeConfig.title;
      const category = form.category.trim();
      const content = form.content.trim();
      const response = await medicalAPI.createLabOrder({
        patientId: selectedPatientId,
        medicalRecordId: form.medicalRecordId || null,
        laboratoryId: null,
        healthCenterId: form.healthCenterId || null,
        orderType: form.type,
        priority: 'normal',
        diagnosis: form.diagnosis,
        icd10Code: form.icd10Code || null,
        notes: content,
        digitalSealEnabled: form.digitalSealEnabled && Boolean(doctorSealImage),
        studies: [{ name: title, category, instructions: content }],
      });
      const createdDocument = response?.data || null;
      const nextFrequents = rememberFrequent(frequents, form.type, { title, category, content });
      setFrequents(nextFrequents);
      await saveFrequentTextToApi(form.type, { title, category, content });
      setSuccess('Documento creado correctamente.');
      setSelectedDocument(createdDocument);
      setForm((current) => ({
        ...current,
        title: typeConfig.title,
        category: '',
        content: '',
        digitalSealEnabled: false,
      }));
      await loadPatientData(selectedPatientId);
      if (printAfterSave && createdDocument) {
        await openPrint(createdDocument, true);
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el documento.');
    } finally {
      setSaving(false);
      setPrintAfterSave(false);
    }
  };

  const useFrequent = (item: FrequentText) => {
    setSelectedDocument(null);
    setForm((current) => ({
      ...current,
      title: item.title,
      category: item.category,
      content: item.content,
    }));
  };

  const duplicateDocument = (document: any) => {
    const items = parseStudies(document.studies);
    const first = items[0] || {};
    setSelectedDocument(null);
    setForm({
      type: isDocumentType(document.order_type) ? document.order_type : 'certificate',
      patientId: selectedPatientId,
      medicalRecordId: document.medical_record_id || records[0]?.id || '',
      healthCenterId: document.health_center_id || doctorCenters[0]?.id || '',
      diagnosis: document.diagnosis || '',
      icd10Code: document.icd10_code || '',
      title: first.name || getTypeTitle(document.order_type),
      category: first.category || '',
      content: first.instructions || document.notes || '',
      digitalSealEnabled: Boolean(document.digital_seal_enabled),
    });
  };

  const cancelDocument = async (document: any) => {
    if (!window.confirm('¿Anular este documento?')) return;
    try {
      await medicalAPI.cancelLabOrder(document.id, 'Anulado por medico');
      setSuccess('Documento anulado.');
      await loadPatientData(selectedPatientId);
    } catch (err: any) {
      setError(err?.message || 'No se pudo anular el documento.');
    }
  };

  const openPrint = async (document: any, autoPrint = false) => {
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueo la ventana de impresion.');
      return;
    }
    printWindow.document.write('<p style="font-family:Arial;padding:32px;">Cargando documento...</p>');
    try {
      const html = await medicalAPI.getLabOrderPrintHtml(document.id);
      printWindow.document.open();
      printWindow.document.write(html);
      if (autoPrint) printWindow.document.write('<script>window.addEventListener("load", function(){ window.print(); });</script>');
      printWindow.document.close();
    } catch (err: any) {
      printWindow.document.body.innerHTML = 'No se pudo cargar el documento.';
      setError(err?.message || 'No se pudo imprimir el documento.');
    }
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Documentos médicos" subtitle="Certificados, referimientos e incapacidades">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_380px] gap-6">
          <aside className="rounded-2xl bg-white border border-gray-200 p-5 h-fit space-y-5 xl:sticky xl:top-28">
            <label>
              <span className="block text-sm font-semibold text-gray-700 mb-2">Paciente</span>
              <select value={selectedPatientId} onChange={(event) => {
                setSelectedPatientId(event.target.value);
                setForm((current) => ({ ...current, patientId: event.target.value }));
              }} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}
              </select>
            </label>

            <div>
              <p className="font-bold text-gray-900 mb-3">Textos frecuentes</p>
              <div className="space-y-2">
                {(frequents[form.type] || []).map((item) => (
                  <button key={`${item.title}-${item.content}`} type="button" onClick={() => useFrequent(item)} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-white">
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{item.content}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-3">Historial</p>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500">Sin documentos para este paciente.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.map((document) => (
                    <button key={document.id} onClick={() => setSelectedDocument(document)} className={`w-full rounded-xl p-3 text-left transition ${selectedDocument?.id === document.id ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50 hover:bg-white'}`}>
                      <p className="text-sm font-semibold text-gray-900">{getTypeTitle(document.order_type)}</p>
                      <p className="text-xs text-gray-500">{new Date(document.created_at).toLocaleDateString('es-DO')} · {document.status}</p>
                      <p className="mt-1 text-[11px] font-semibold text-blue-700">{document.validation_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="space-y-6">
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-5">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Nuevo documento</h2>
              </div>
              <form onSubmit={saveDocument} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Tipo</span>
                    <select value={form.type} onChange={(event) => {
                      const type = event.target.value as DocumentType;
                      setSelectedDocument(null);
                      setForm((current) => ({ ...current, type, title: getTypeTitle(type), category: '', content: '' }));
                    }} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label>

                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Registro medico asociado</span>
                    <select value={form.medicalRecordId} onChange={(event) => {
                      const record = records.find((item) => item.id === event.target.value);
                      setForm({
                        ...form,
                        medicalRecordId: event.target.value,
                        diagnosis: record?.diagnosis || form.diagnosis,
                        icd10Code: record?.icd10_code || form.icd10Code,
                      });
                    }} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Sin registro asociado</option>
                      {records.map((record) => <option key={record.id} value={record.id}>{record.diagnosis} - {new Date(record.created_at).toLocaleDateString('es-DO')}</option>)}
                    </select>
                  </label>

                  {doctorCenters.length > 0 && (
                    <label className="md:col-span-2">
                      <span className="block text-sm font-semibold text-gray-700 mb-1">Centro emisor</span>
                      <select value={form.healthCenterId} onChange={(event) => setForm({ ...form, healthCenterId: event.target.value })} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {doctorCenters.map((center) => <option key={center.id} value={center.id}>{center.name}{center.city ? ` - ${center.city}` : ''}</option>)}
                      </select>
                    </label>
                  )}

                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Titulo</span>
                    <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={typeConfig.titlePlaceholder} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">{typeConfig.categoryLabel}</span>
                    <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder={typeConfig.categoryPlaceholder} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>

                  <label className="md:col-span-2">
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Diagnostico / motivo clinico</span>
                    <input value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">CIE-10</span>
                    <input value={form.icd10Code} onChange={(event) => setForm({ ...form, icd10Code: event.target.value.toUpperCase() })} placeholder="E11" className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                </div>

                <label>
                  <span className="block text-sm font-semibold text-gray-700 mb-1">{typeConfig.contentLabel}</span>
                  <textarea value={form.content} onChange={(event) => {
                    setSelectedDocument(null);
                    setForm({ ...form, content: event.target.value });
                  }} rows={8} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.digitalSealEnabled}
                    disabled={!doctorSealImage}
                    onChange={(event) => setForm({ ...form, digitalSealEnabled: event.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">Emitir con sello digital</span>
                    <span className="block text-xs text-gray-500">
                      {doctorSealImage ? 'Usa la imagen de sello subida en tu perfil.' : 'Sube una imagen de sello en tu perfil para activar esta opcion.'}
                    </span>
                  </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button type="submit" onClick={() => setPrintAfterSave(false)} disabled={!selectedPatientId || saving} className="h-11 rounded-xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 disabled:opacity-60">
                    {saving ? 'Guardando...' : 'Guardar documento'}
                  </button>
                  <button type="submit" onClick={() => setPrintAfterSave(true)} disabled={!selectedPatientId || saving} className="h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Guardar e imprimir
                  </button>
                </div>
              </form>
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-28 h-fit">
            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <p className="font-bold text-gray-900 mb-3">Vista rapida</p>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase text-blue-700">{typeConfig.label}</p>
                <h3 className="mt-2 font-black text-gray-900">{form.title || typeConfig.title}</h3>
                {form.category && <p className="text-sm text-gray-500">{form.category}</p>}
                <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{form.content || 'Escribe el contenido del documento.'}</p>
              </div>
            </section>

            {selectedDocument && (
              <section className="rounded-2xl bg-white border border-gray-200 p-5">
                <p className="font-bold text-gray-900 mb-3">Acciones</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openPrint(selectedDocument, true)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button type="button" onClick={() => duplicateDocument(selectedDocument)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" /> Duplicar
                  </button>
                  {selectedDocument.status !== 'cancelled' ? (
                    <button type="button" onClick={() => cancelDocument(selectedDocument)} className="col-span-2 h-10 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 inline-flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> Anular
                    </button>
                  ) : (
                    <div className="col-span-2 h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm font-semibold inline-flex items-center justify-center">
                      Anulado
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <p className="font-bold text-gray-900 mb-3">Frecuentes</p>
              <button type="button" onClick={() => {
                const item = {
                  title: form.title.trim() || typeConfig.title,
                  category: form.category.trim(),
                  content: form.content.trim(),
                };
                if (!item.content) return;
                const next = rememberFrequent(frequents, form.type, item);
                setFrequents(next);
                saveFrequentTextToApi(form.type, item)
                  .then(() => setSuccess('Texto frecuente guardado.'))
                  .catch(() => setError('No se pudo guardar el texto frecuente.'));
              }} className="w-full h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Guardar texto actual
              </button>
            </section>
          </aside>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function loadFrequentTexts(): Record<DocumentType, FrequentText[]> {
  try {
    const raw = localStorage.getItem(frequentStorageKey);
    if (!raw) return defaultFrequent;
    const parsed = JSON.parse(raw);
    return {
      certificate: Array.isArray(parsed.certificate) ? parsed.certificate : defaultFrequent.certificate,
      medical_constancy: Array.isArray(parsed.medical_constancy) ? parsed.medical_constancy : defaultFrequent.medical_constancy,
      referral: Array.isArray(parsed.referral) ? parsed.referral : defaultFrequent.referral,
      disability: Array.isArray(parsed.disability) ? parsed.disability : defaultFrequent.disability,
    };
  } catch {
    return defaultFrequent;
  }
}

function rememberFrequent(current: Record<DocumentType, FrequentText[]>, type: DocumentType, item: FrequentText) {
  const normalized = {
    title: item.title.trim(),
    category: item.category.trim(),
    content: item.content.trim(),
  };
  if (!normalized.content) return current;
  const existing = current[type] || [];
  const next = [normalized, ...existing.filter((entry) => entry.content !== normalized.content)].slice(0, 12);
  return { ...current, [type]: next };
}

async function saveFrequentTextToApi(type: DocumentType, item: FrequentText) {
  const normalized = {
    documentType: type,
    title: item.title.trim(),
    category: item.category.trim(),
    content: item.content.trim(),
  };
  if (!normalized.content) return;
  await medicalAPI.saveDocumentTemplate(normalized);
}

function parseStudies(value: any): any[] {
  const studies = typeof value === 'string' ? safeJson(value) : value;
  return Array.isArray(studies) ? studies : [];
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function getTypeTitle(type: string) {
  return documentTypes.find((item) => item.value === type)?.title || 'Documento medico';
}

function isDocumentType(value: string): value is DocumentType {
  return ['certificate', 'medical_constancy', 'referral', 'disability'].includes(value);
}

function resolveCurrentUserId(user: any) {
  if (user?.id || user?.userId) return user.id || user.userId;
  return '';
}

function getDoctorCenters(doctor: any) {
  const centers = doctor?.health_centers || doctor?.healthCenters || [];
  if (Array.isArray(centers) && centers.length) return centers;
  return doctor?.health_center_id
    ? [{ id: doctor.health_center_id, name: doctor.health_center_name || 'Centro asignado', city: doctor.city }]
    : [];
}
