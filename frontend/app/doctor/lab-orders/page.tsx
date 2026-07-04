'use client';

import { FormEvent, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import { clinicalAPI, doctorAPI, medicalAPI } from '@/utils/api';
import { Icd10Suggestion, getIcd10Suggestions, suggestIcd10 } from '@/utils/icd10';
import { Copy, FlaskConical, PlusCircle, Printer, Trash2, XCircle } from 'lucide-react';

type StudyForm = {
  name: string;
  category: string;
  instructions: string;
};

type StudyCatalogItem = {
  id?: string;
  name: string;
  study_type?: string;
  area?: string;
  preparation?: string;
};

const emptyStudy: StudyForm = { name: '', category: '', instructions: '' };

const frequentStudies: StudyForm[] = [
  { name: 'Hemograma completo', category: 'Hematologia', instructions: '' },
  { name: 'Glicemia en ayunas', category: 'Quimica sanguinea', instructions: 'Ayuno de 8 horas' },
  { name: 'Perfil lipidico', category: 'Quimica sanguinea', instructions: 'Ayuno de 12 horas' },
  { name: 'Uroanalisis', category: 'Orina', instructions: 'Primera orina de la manana si es posible' },
  { name: 'Radiografia de torax PA', category: 'Imagen', instructions: '' },
];

const orderTypes = [
  { value: 'laboratory', label: 'Laboratorio' },
  { value: 'imaging', label: 'Imagen' },
  { value: 'procedure', label: 'Procedimientos' },
];

const frequentByType: Record<string, StudyForm[]> = {
  laboratory: frequentStudies,
  imaging: [
    { name: 'Radiografia de torax PA', category: 'Torax', instructions: 'Retirar objetos metalicos del area.' },
    { name: 'Sonografia abdominal', category: 'Abdomen', instructions: 'Ayuno de 6 a 8 horas.' },
    { name: 'Tomografia de abdomen', category: 'Abdomen', instructions: 'Confirmar si requiere contraste.' },
    { name: 'Resonancia magnetica lumbar', category: 'Columna lumbar', instructions: 'Informar implantes o dispositivos.' },
  ],
  procedure: [
    { name: 'Curacion', category: 'Normal', instructions: 'Segun protocolo del centro.' },
    { name: 'Retiro de puntos', category: 'Normal', instructions: 'Evaluar cicatrizacion previa.' },
  ],
};

export default function DoctorLabOrdersPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [doctorCenters, setDoctorCenters] = useState<any[]>([]);
  const [doctorSealImage, setDoctorSealImage] = useState('');
  const [studyCatalog, setStudyCatalog] = useState<StudyCatalogItem[]>([]);
  const [icd10Suggestions, setIcd10Suggestions] = useState<Icd10Suggestion[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    medicalRecordId: '',
    laboratoryId: '',
    healthCenterId: '',
    orderType: 'laboratory',
    priority: 'normal',
    diagnosis: '',
    icd10Code: '',
    notes: '',
    digitalSealEnabled: false,
    studies: [{ ...emptyStudy }],
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLoading(false);
      return;
    }
    const user = JSON.parse(storedUser);
    const doctorId = resolveCurrentUserId(user);
    const patientId = new URLSearchParams(window.location.search).get('patientId') || '';
    const recordId = new URLSearchParams(window.location.search).get('recordId') || '';
    if (patientId) setSelectedPatientId(patientId);
    if (recordId) setForm((current) => ({ ...current, medicalRecordId: recordId }));
    loadInitialData(doctorId);
  }, []);

  useEffect(() => {
    if (selectedPatientId) loadPatientData(selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    const diagnosis = form.diagnosis.trim();
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
  }, [form.diagnosis]);

  useEffect(() => {
    if (!form.icd10Code && icd10Suggestions[0]?.code) {
      setForm((current) => ({ ...current, icd10Code: current.icd10Code || icd10Suggestions[0].code }));
    }
  }, [icd10Suggestions]);

  const loadInitialData = async (doctorId: string) => {
    setLoading(true);
    setError('');
    try {
      const [patientResponse, doctorResponse, labResponse, catalogResponse] = await Promise.all([
        doctorAPI.getPatients(doctorId),
        doctorAPI.getById(doctorId).catch(() => null),
        doctorAPI.listLaboratories().catch(() => ({ data: [] })),
        medicalAPI.getStudyCatalog().catch(() => ({ data: [] })),
      ]);
      const patientData = patientResponse?.data || [];
      const centers = getDoctorCenters(doctorResponse?.data);
      setPatients(patientData);
      setDoctorCenters(centers);
      setDoctorSealImage(doctorResponse?.data?.prescription_seal || '');
      setLaboratories((labResponse?.data || []).filter((lab: any) => lab.is_active !== false));
      setStudyCatalog(catalogResponse?.data || []);
      if (!selectedPatientId && patientData[0]?.id) setSelectedPatientId(patientData[0].id);
      if (centers[0]?.id) setForm((current) => ({ ...current, healthCenterId: current.healthCenterId || centers[0].id }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo cargar la informacion inicial.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientData = async (patientId: string) => {
    setError('');
    try {
      const [recordResponse, orderResponse] = await Promise.all([
        medicalAPI.getPatientHistory(patientId),
        medicalAPI.getPatientLabOrders(patientId),
      ]);
      const recordData = recordResponse?.data || [];
      const orderData = (orderResponse?.data || []).filter((order: any) => ['laboratory', 'imaging', 'procedure'].includes(order.order_type || 'laboratory'));
      setRecords(recordData);
      setOrders(orderData);
      setSelectedOrder(orderData[0] || null);
      setForm((current) => ({
        ...current,
        medicalRecordId: current.medicalRecordId || recordData[0]?.id || '',
        diagnosis: current.diagnosis || recordData[0]?.diagnosis || '',
        icd10Code: current.icd10Code || recordData[0]?.icd10_code || suggestIcd10(recordData[0]?.diagnosis || '')?.code || '',
      }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudieron cargar las ordenes del paciente.');
    }
  };

  const saveOrder = async (event: FormEvent) => {
    event.preventDefault();
    const studies = form.studies.filter((item) => item.name.trim());
    if (!selectedPatientId || !studies.length) {
      setError(`Selecciona un paciente y agrega al menos un ${getItemLabel(form.orderType).toLowerCase()}.`);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await medicalAPI.createLabOrder({
        patientId: selectedPatientId,
        medicalRecordId: form.medicalRecordId || null,
        laboratoryId: form.laboratoryId || null,
        healthCenterId: form.healthCenterId || null,
        orderType: ['laboratory', 'imaging', 'procedure'].includes(form.orderType) ? form.orderType : 'laboratory',
        priority: form.priority,
        diagnosis: form.diagnosis,
        icd10Code: form.icd10Code || suggestIcd10(form.diagnosis)?.code || null,
        notes: form.notes,
        digitalSealEnabled: form.digitalSealEnabled && Boolean(doctorSealImage),
        studies,
      });
      setSuccess('Orden creada correctamente.');
      setSelectedOrder(response?.data || null);
      setForm({
        medicalRecordId: records[0]?.id || '',
        laboratoryId: '',
        healthCenterId: doctorCenters[0]?.id || '',
        orderType: form.orderType,
        priority: 'normal',
        diagnosis: records[0]?.diagnosis || '',
        icd10Code: records[0]?.icd10_code || suggestIcd10(records[0]?.diagnosis || '')?.code || '',
        notes: '',
        digitalSealEnabled: false,
        studies: [{ ...emptyStudy }],
      });
      await loadPatientData(selectedPatientId);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la orden.');
    } finally {
      setSaving(false);
    }
  };

  const updateStudy = (index: number, patch: Partial<StudyForm>) => {
    setSelectedOrder(null);
    setForm((current) => ({
      ...current,
      studies: current.studies.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addStudy = (study = emptyStudy) => {
    setSelectedOrder(null);
    setForm((current) => ({ ...current, studies: [...current.studies, { ...study }] }));
  };

  const removeStudy = (index: number) => {
    setSelectedOrder(null);
    setForm((current) => {
      const next = current.studies.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, studies: next.length ? next : [{ ...emptyStudy }] };
    });
  };

  const duplicateOrder = (order: any) => {
    const studies = parseStudies(order.studies);
    setSelectedOrder(null);
    setForm({
      medicalRecordId: order.medical_record_id || records[0]?.id || '',
      laboratoryId: order.laboratory_id || '',
      healthCenterId: order.health_center_id || doctorCenters[0]?.id || '',
      orderType: order.order_type || 'laboratory',
      priority: order.priority || 'normal',
      diagnosis: order.diagnosis || '',
      icd10Code: order.icd10_code || suggestIcd10(order.diagnosis || '')?.code || '',
      notes: order.notes || '',
      digitalSealEnabled: Boolean(order.digital_seal_enabled),
      studies: studies.length ? studies.map((item) => ({ ...emptyStudy, ...item })) : [{ ...emptyStudy }],
    });
  };

  const cancelOrder = async (order: any) => {
    if (!window.confirm('¿Anular esta orden?')) return;
    try {
      await medicalAPI.cancelLabOrder(order.id, 'Anulada por medico');
      setSuccess('Orden anulada.');
      await loadPatientData(selectedPatientId);
    } catch (err: any) {
      setError(err?.message || 'No se pudo anular la orden.');
    }
  };

  const openPrint = async (order: any, autoPrint = false) => {
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueo la ventana de impresion.');
      return;
    }
    printWindow.document.write('<p style="font-family:Arial;padding:32px;">Cargando orden...</p>');
    try {
      const html = await medicalAPI.getLabOrderPrintHtml(order.id);
      printWindow.document.open();
      printWindow.document.write(html);
      if (autoPrint) printWindow.document.write('<script>window.addEventListener("load", function(){ window.print(); });</script>');
      printWindow.document.close();
    } catch (err: any) {
      printWindow.document.body.innerHTML = 'No se pudo cargar la orden.';
      setError(err?.message || 'No se pudo imprimir la orden.');
    }
  };

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const selectedRecord = records.find((record) => record.id === form.medicalRecordId);
  const previewStudies = selectedOrder ? parseStudies(selectedOrder.studies) : form.studies.filter((item) => item.name.trim());
  const icd10Suggestion = icd10Suggestions[0] || suggestIcd10(form.diagnosis);

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Analiticas y estudios" subtitle="Ordenes medicas para laboratorio, imagenes y procedimientos">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_380px] gap-6">
          <aside className="rounded-2xl bg-white border border-gray-200 p-5 h-fit space-y-5 xl:sticky xl:top-28">
            <label>
              <span className="block text-sm font-semibold text-gray-700 mb-2">Paciente</span>
              <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}
              </select>
            </label>

            <div>
              <p className="font-bold text-gray-900 mb-3">Frecuentes</p>
              <div className="space-y-2">
                  {getFrequentOptions(form.orderType, studyCatalog).map((item) => (
                  <button key={item.name} type="button" onClick={() => addStudy(item)} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-white">
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-3">Historial</p>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">Sin ordenes para este paciente.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <button key={order.id} onClick={() => setSelectedOrder(order)} className={`w-full rounded-xl p-3 text-left transition ${selectedOrder?.id === order.id ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50 hover:bg-white'}`}>
                      <p className="text-sm font-semibold text-gray-900">{formatStudies(order.studies)}</p>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('es-DO')} · {order.status}</p>
                      <p className="mt-1 text-[11px] font-semibold text-blue-700">{order.validation_code}</p>
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
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Nuevo documento</h2>
              </div>
              <form onSubmit={saveOrder} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Registro medico asociado</span>
                    <select value={form.medicalRecordId} onChange={(event) => {
                      const record = records.find((item) => item.id === event.target.value);
                      setForm({
                        ...form,
                        medicalRecordId: event.target.value,
                        diagnosis: record?.diagnosis || form.diagnosis,
                        icd10Code: record?.icd10_code || form.icd10Code || suggestIcd10(record?.diagnosis || '')?.code || '',
                      });
                    }} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Sin registro asociado</option>
                      {records.map((record) => <option key={record.id} value={record.id}>{record.diagnosis} - {new Date(record.created_at).toLocaleDateString('es-DO')}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Laboratorio sugerido</span>
                    <select value={form.laboratoryId} onChange={(event) => setForm({ ...form, laboratoryId: event.target.value })} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Libre eleccion</option>
                      {laboratories.map((lab) => <option key={lab.id} value={lab.id}>{lab.name}{lab.city ? ` - ${lab.city}` : ''}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Tipo</span>
                    <select value={form.orderType} onChange={(event) => setForm({ ...form, orderType: event.target.value })} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {orderTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</span>
                    <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="routine">Rutina</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgente</option>
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
                  <label className="md:col-span-2">
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Diagnostico / sospecha clinica</span>
                    <input value={form.diagnosis} onChange={(event) => {
                      const diagnosis = event.target.value;
                      setForm({ ...form, diagnosis, icd10Code: form.icd10Code || suggestIcd10(diagnosis)?.code || '' });
                    }} placeholder={selectedRecord?.diagnosis || ''} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-1">CIE-10</span>
                    <input value={form.icd10Code} onChange={(event) => setForm({ ...form, icd10Code: event.target.value.toUpperCase() })} placeholder="E11" className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  {icd10Suggestion && icd10Suggestion.code !== form.icd10Code && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, icd10Code: icd10Suggestion.code })}
                      className="self-end w-fit rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-800 hover:bg-blue-100"
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
                          onClick={() => setForm({ ...form, icd10Code: item.code })}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span className="font-semibold text-gray-900">{item.code}</span>
                          <span className="ml-2 text-gray-600">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {form.studies.map((study, index) => (
                    <StudyEditor
                      key={index}
                      index={index}
                      study={study}
                      catalog={studyCatalog}
                      orderType={form.orderType}
                      onChange={(patch) => updateStudy(index, patch)}
                      onRemove={() => removeStudy(index)}
                    />
                  ))}
                  <button type="button" onClick={() => addStudy()} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
                    Agregar {getItemLabel(form.orderType).toLowerCase()}
                  </button>
                </div>

                <label>
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Notas generales</span>
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                      {doctorSealImage ? 'Oculta el espacio de firma fisica y usa la imagen de sello subida en tu perfil.' : 'Sube una imagen de sello en tu perfil para activar esta opcion.'}
                    </span>
                  </span>
                </label>

                <button disabled={!selectedPatientId || saving} className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar documento'}
                </button>
              </form>
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-28 h-fit">
            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-blue-600" />
                <p className="font-bold text-gray-900">Vista previa</p>
              </div>
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Paciente:</span> <strong>{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Sin seleccionar'}</strong></p>
                <p><span className="text-gray-500">Diagnostico:</span> {selectedOrder?.diagnosis || form.diagnosis || 'No especificado'}</p>
                <p><span className="text-gray-500">CIE-10:</span> {selectedOrder?.icd10_code || form.icd10Code || 'No especificado'}</p>
                <p><span className="text-gray-500">Codigo:</span> {selectedOrder?.validation_code || 'Se genera al guardar'}</p>
                <p><span className="text-gray-500">Firma:</span> {(selectedOrder ? selectedOrder.digital_seal_enabled : form.digitalSealEnabled) ? 'Digital' : 'Fisica'}</p>
                <div>
                  <p className="font-semibold mb-2">Estudios</p>
                  {previewStudies.length === 0 ? (
                    <p className="text-gray-500">Agrega estudios para verlos aqui.</p>
                  ) : (
                    <ul className="space-y-2">
                      {previewStudies.map((study: any, index: number) => (
                        <li key={`${study.name}-${index}`} className="rounded-xl bg-gray-50 p-3">
                          <p className="font-semibold">{study.name}</p>
                          <p className="text-xs text-gray-500">{study.category || 'Sin categoria'}{study.instructions ? ` · ${study.instructions}` : ''}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {selectedOrder && (
              <section className="rounded-2xl bg-white border border-gray-200 p-5">
                <p className="font-bold text-gray-900 mb-3">Acciones</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openPrint(selectedOrder, true)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button type="button" onClick={() => duplicateOrder(selectedOrder)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" /> Duplicar
                  </button>
                  {selectedOrder.status !== 'cancelled' ? (
                    <button type="button" onClick={() => cancelOrder(selectedOrder)} className="col-span-2 h-10 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 inline-flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> Anular
                    </button>
                  ) : (
                    <div className="col-span-2 h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm font-semibold inline-flex items-center justify-center">
                      Anulada
                    </div>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function StudyEditor({
  index,
  study,
  catalog,
  orderType,
  onChange,
  onRemove,
}: {
  index: number;
  study: StudyForm;
  catalog: StudyCatalogItem[];
  orderType: string;
  onChange: (patch: Partial<StudyForm>) => void;
  onRemove: () => void;
}) {
  const suggestions = getStudySuggestions(study.name, catalog, orderType);
  const itemLabel = getItemLabel(orderType);
  const categoryLabel = getCategoryLabel(orderType);
  const instructionsLabel = getInstructionsLabel(orderType);

  return (
    <section className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">{itemLabel} {index + 1}</h3>
        <button type="button" onClick={onRemove} className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Input label="Nombre" value={study.name} onChange={(value) => onChange({ name: value })} required />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {suggestions.map((item) => (
                <button
                  key={`${item.name}-${item.area}`}
                  type="button"
                  onClick={() => onChange(catalogToStudy(item))}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50"
                >
                  <span className="block text-sm font-semibold text-gray-900">{item.name}</span>
                  <span className="block text-xs text-gray-500">{item.area || 'Sin area'}{item.preparation ? ` · ${item.preparation}` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Input label={categoryLabel} value={study.category} onChange={(value) => onChange({ category: value })} placeholder={getCategoryPlaceholder(orderType)} />
        <label className="md:col-span-2">
          <span className="block text-sm font-semibold text-gray-700 mb-1">{instructionsLabel}</span>
          <input value={study.instructions} onChange={(event) => onChange({ instructions: event.target.value })} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
      </div>
    </section>
  );
}

function Input({ label, value, onChange, required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label>
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );
}

function parseStudies(value: any): StudyForm[] {
  const studies = typeof value === 'string' ? safeJson(value) : value;
  return Array.isArray(studies) ? studies : [];
}

function formatStudies(value: any) {
  const studies = parseStudies(value);
  if (!studies.length) return 'Sin estudios registrados';
  return studies.map((item: any) => item.name || 'Estudio').join(', ');
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function catalogToStudy(item: StudyCatalogItem): StudyForm {
  return {
    name: item.name || '',
    category: item.area || '',
    instructions: item.preparation || '',
  };
}

function getFrequentOptions(orderType: string, catalog: StudyCatalogItem[]) {
  if (['laboratory', 'imaging', 'procedure'].includes(orderType)) {
    const catalogItems = catalog.filter((item) => item.study_type === orderType).slice(0, 8).map(catalogToStudy);
    if (catalogItems.length) return catalogItems;
  }
  return frequentByType[orderType] || frequentStudies;
}

function getStudySuggestions(value: string, catalog: StudyCatalogItem[], orderType: string) {
  const term = value.trim().toLowerCase();
  if (term.length < 2) return [];
  const selectedType = ['laboratory', 'imaging', 'procedure'].includes(orderType) ? orderType : '';

  return catalog
    .filter((item) => !selectedType || item.study_type === selectedType)
    .filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const area = String(item.area || '').toLowerCase();
      return name.includes(term) || area.includes(term);
    })
    .sort((a, b) => {
      const aName = String(a.name || '').toLowerCase();
      const bName = String(b.name || '').toLowerCase();
      const aStarts = aName.startsWith(term) ? 0 : 1;
      const bStarts = bName.startsWith(term) ? 0 : 1;
      return aStarts - bStarts || aName.localeCompare(bName);
    })
    .slice(0, 6);
}

function getItemLabel(orderType: string) {
  if (orderType === 'referral') return 'Referimiento';
  if (orderType === 'disability') return 'Incapacidad';
  if (orderType === 'certificate') return 'Certificado';
  if (orderType === 'procedure') return 'Procedimiento';
  return 'Estudio';
}

function getCategoryLabel(orderType: string) {
  if (orderType === 'referral') return 'Especialidad / destino';
  if (orderType === 'disability') return 'Periodo';
  if (orderType === 'certificate') return 'Tipo';
  if (orderType === 'procedure') return 'Prioridad / area';
  if (orderType === 'imaging') return 'Region anatomica';
  return 'Area';
}

function getCategoryPlaceholder(orderType: string) {
  if (orderType === 'referral') return 'Cardiologia, endocrinologia...';
  if (orderType === 'disability') return '3 dias, 5 dias...';
  if (orderType === 'certificate') return 'Asistencia, condicion de salud...';
  if (orderType === 'procedure') return 'Normal, urgente, area...';
  if (orderType === 'imaging') return 'Torax, abdomen, columna...';
  return 'Hematologia, Imagen, Orina...';
}

function getInstructionsLabel(orderType: string) {
  if (orderType === 'referral') return 'Motivo / observaciones';
  if (orderType === 'disability') return 'Indicaciones';
  if (orderType === 'certificate') return 'Texto / observaciones';
  if (orderType === 'imaging') return 'Contraste / preparacion';
  if (orderType === 'procedure') return 'Observaciones';
  return 'Preparacion / observaciones';
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
