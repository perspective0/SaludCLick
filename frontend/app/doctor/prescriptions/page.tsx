'use client';

import { FormEvent, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import PrescriptionPreview from '@/components/doctor/PrescriptionPreview';
import { doctorAPI, medicalAPI, vademecumAPI } from '@/utils/api';
import { AlertTriangle, Copy, Download, PlusCircle, Printer, Star, Trash2, XCircle } from 'lucide-react';

type MedicationForm = {
  vademecumId?: string;
  activeIngredient?: string;
  name: string;
  presentation: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
  requiresPrescription?: boolean;
  controlled?: boolean;
  otc?: boolean;
  vademecumWarnings?: VademecumWarning[];
  warningsConfirmed?: boolean;
};

type VademecumWarning = {
  severity: string;
  type: string;
  message: string;
  recommendation?: string;
  blocking?: boolean;
};

const emptyMedication: MedicationForm = {
  name: '',
  presentation: '',
  dosage: '',
  route: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: '',
};

const frequentMedications: MedicationForm[] = [
  { ...emptyMedication, name: 'Paracetamol', presentation: 'Tableta 500 mg', dosage: '500 mg', route: 'Oral', frequency: 'cada 8 horas', duration: '5 dias', quantity: '15 tabletas' },
  { ...emptyMedication, name: 'Ibuprofeno', presentation: 'Tableta 400 mg', dosage: '400 mg', route: 'Oral', frequency: 'cada 8 horas', duration: '3 dias', quantity: '9 tabletas' },
  { ...emptyMedication, name: 'Amoxicilina', presentation: 'Capsula 875 mg', dosage: '875 mg', route: 'Oral', frequency: 'cada 12 horas', duration: '7 dias', quantity: '14 capsulas' },
];

export default function DoctorPrescriptionsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [doctorName, setDoctorName] = useState('Medico tratante');
  const [doctorSealImage, setDoctorSealImage] = useState('');
  const [doctorCenters, setDoctorCenters] = useState<any[]>([]);
  const [vademecumFavorites, setVademecumFavorites] = useState<any[]>([]);
  const [vademecumRecent, setVademecumRecent] = useState<any[]>([]);
  const [quickInfo, setQuickInfo] = useState<any>(null);
  const [quickInfoOpen, setQuickInfoOpen] = useState(false);
  const [quickInfoLoading, setQuickInfoLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    medicalRecordId: '',
    notes: '',
    expiryDate: '',
    healthCenterId: '',
    digitalSealEnabled: false,
    medications: [{ ...emptyMedication }],
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLoading(false);
      return;
    }
    const user = JSON.parse(storedUser);
    const doctorId = resolveCurrentUserId(user);
    if (!doctorId) {
      setError('No se pudo identificar la sesion del medico. Cierra sesion e inicia nuevamente.');
      setLoading(false);
      return;
    }
    setDoctorName(`${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || 'Medico tratante');
    const patientId = new URLSearchParams(window.location.search).get('patientId') || '';
    const recordId = new URLSearchParams(window.location.search).get('recordId') || '';
    if (patientId) setSelectedPatientId(patientId);
    if (recordId) setForm((current) => ({ ...current, medicalRecordId: recordId }));
    loadDoctorCenters(doctorId);
    loadPatients(doctorId);
    loadVademecumShortcuts();
  }, []);

  const loadVademecumShortcuts = async () => {
    try {
      const [favoritesResponse, recentResponse] = await Promise.all([
        vademecumAPI.favorites(),
        vademecumAPI.recent(),
      ]);
      setVademecumFavorites(favoritesResponse?.data || []);
      setVademecumRecent(recentResponse?.data || []);
    } catch (err) {
      console.error('No se pudo cargar el vademecum rapido:', err);
    }
  };

  const loadDoctorCenters = async (doctorId: string) => {
    try {
      const response = await doctorAPI.getById(doctorId);
      const centers = getDoctorCenters(response?.data);
      setDoctorSealImage(response?.data?.prescription_seal || '');
      setDoctorCenters(centers);
      if (centers[0]?.id) {
        setForm((current) => ({ ...current, healthCenterId: current.healthCenterId || centers[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedPatientId) loadPatientData(selectedPatientId);
  }, [selectedPatientId]);

  const loadPatients = async (doctorId: string) => {
    setLoading(true);
    try {
      const response = await doctorAPI.getPatients(doctorId);
      const data = response?.data || [];
      setPatients(data);
      if (!selectedPatientId && data[0]?.id) setSelectedPatientId(data[0].id);
    } catch (err) {
      console.error(err);
      setError(getPatientsError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadPatientData = async (patientId: string) => {
    setError('');
    try {
      const [recordResponse, prescriptionResponse] = await Promise.all([
        medicalAPI.getPatientHistory(patientId),
        medicalAPI.getPatientPrescriptions(patientId),
      ]);
      const recordData = recordResponse?.data || [];
      const prescriptionData = prescriptionResponse?.data || [];
      setRecords(recordData);
      setPrescriptions(prescriptionData);
      setSelectedPrescription(prescriptionData[0] || null);
      setForm((current) => ({ ...current, medicalRecordId: current.medicalRecordId || recordData[0]?.id || '' }));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la informacion del paciente.');
    }
  };

  const savePrescription = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId) return;

    const medications = form.medications.filter((item) => item.name.trim());
    if (!medications.length) {
      setError('Agrega al menos un medicamento.');
      return;
    }
    const pendingWarnings = medications.filter((item) => (item.vademecumWarnings || []).length && !item.warningsConfirmed);
    if (pendingWarnings.length) {
      setError('Confirma las advertencias del vademecum antes de guardar la receta.');
      return;
    }
    const controlledMedications = medications.filter((item) => item.controlled);
    if (controlledMedications.length && !window.confirm('La receta incluye medicamento controlado. Confirma que cumple los requisitos clinicos y regulatorios.')) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await medicalAPI.createPrescription({
        patientId: selectedPatientId,
        medicalRecordId: form.medicalRecordId,
        diagnosis: selectedRecord?.diagnosis,
        medications,
        notes: form.notes,
        expiryDate: form.expiryDate || null,
        healthCenterId: form.healthCenterId || null,
        digitalSealEnabled: form.digitalSealEnabled && Boolean(doctorSealImage),
      });
      setSuccess('Receta creada correctamente.');
      setSelectedPrescription(response?.data || null);
      setForm({ medicalRecordId: records[0]?.id || '', notes: '', expiryDate: '', healthCenterId: doctorCenters[0]?.id || '', digitalSealEnabled: false, medications: [{ ...emptyMedication }] });
      await loadPatientData(selectedPatientId);
    } catch (err: any) {
      setError(getPrescriptionError(err));
    } finally {
      setSaving(false);
    }
  };

  const updateMedication = (index: number, patch: Partial<MedicationForm>) => {
    setSelectedPrescription(null);
    setForm((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const validateVademecumMedication = async (index: number, medication: MedicationForm) => {
    if (!selectedPatientId || !medication.vademecumId) return;
    try {
      const response = await vademecumAPI.validate({
        patientId: selectedPatientId,
        medicamentoId: medication.vademecumId,
        selectedMedications: form.medications.filter((_, itemIndex) => itemIndex !== index),
      });
      updateMedication(index, {
        vademecumWarnings: response?.data?.warnings || [],
        warningsConfirmed: !(response?.data?.warnings || []).length,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const applyVademecumMedication = async (index: number, medication: any) => {
    const nextMedication: MedicationForm = {
      ...form.medications[index],
      vademecumId: medication.id,
      activeIngredient: medication.principio_activo || '',
      name: medication.nombre_comercial || '',
      presentation: [medication.forma_farmaceutica, medication.concentracion].filter(Boolean).join(' ') || medication.presentacion || '',
      route: medication.via_administracion || '',
      requiresPrescription: Boolean(medication.requiere_receta),
      controlled: Boolean(medication.controlado),
      otc: Boolean(medication.otc),
      warningsConfirmed: false,
    };
    updateMedication(index, nextMedication);
    setQuickInfo(medication);
    validateVademecumMedication(index, nextMedication);
    try {
      const detail = await vademecumAPI.detail(medication.id);
      setQuickInfo(detail?.data || medication);
    } catch {
      setQuickInfo(medication);
    }
  };

  const showVademecumInfo = async (item: any) => {
    if (!item?.id) return;
    setQuickInfo(item);
    setQuickInfoOpen(true);
    setQuickInfoLoading(true);
    try {
      const detail = await vademecumAPI.detail(item.id);
      setQuickInfo(detail?.data || item);
    } catch {
      setQuickInfo(item);
    } finally {
      setQuickInfoLoading(false);
    }
  };

  const addMedication = (medication = emptyMedication) => {
    setSelectedPrescription(null);
    setForm((current) => ({ ...current, medications: [...current.medications, { ...medication }] }));
  };

  const removeMedication = (index: number) => {
    setSelectedPrescription(null);
    setForm((current) => {
      const next = current.medications.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, medications: next.length ? next : [{ ...emptyMedication }] };
    });
  };

  const cancelPrescription = async (prescription: any) => {
    if (!window.confirm('¿Anular esta receta?')) return;
    try {
      await medicalAPI.cancelPrescription(prescription.id, 'Anulada por medico');
      setSuccess('Receta anulada.');
      await loadPatientData(selectedPatientId);
    } catch (err: any) {
      setError(getPrescriptionError(err));
    }
  };

  const openPrescriptionPrint = async (prescription: any, autoPrint = false) => {
    setError('');
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueo la ventana de impresion. Permite ventanas emergentes para SaludClick.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write('<!doctype html><html><head><title>Cargando receta</title></head><body style="font-family:Arial,sans-serif;padding:32px;">Cargando receta...</body></html>');
    printWindow.document.close();

    try {
      const html = await medicalAPI.getPrescriptionPrintHtml(prescription.id);
      printWindow.document.open();
      printWindow.document.write(html);
      if (autoPrint) {
        printWindow.document.write('<script>window.addEventListener("load", function(){ window.print(); });</script>');
      }
      printWindow.document.close();
    } catch (err: any) {
      printWindow.document.open();
      printWindow.document.write('<!doctype html><html><head><title>Error</title></head><body style="font-family:Arial,sans-serif;padding:32px;">No se pudo cargar la receta.</body></html>');
      printWindow.document.close();
      setError(getPrescriptionError(err));
    }
  };

  const downloadPrescriptionPdf = async (prescription: any) => {
    setError('');
    try {
      const blob = await medicalAPI.downloadPrescriptionPdf(prescription.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receta-${prescription.validation_code || prescription.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(getPrescriptionError(err));
    }
  };

  const duplicatePrescription = (prescription: any) => {
    const medications = parseMedications(prescription.medications);
    setSelectedPrescription(null);
    setForm({
      medicalRecordId: prescription.medical_record_id || records[0]?.id || '',
      notes: prescription.notes || '',
      expiryDate: '',
      healthCenterId: prescription.health_center_id || form.healthCenterId || doctorCenters[0]?.id || '',
      digitalSealEnabled: Boolean(prescription.digital_seal_enabled),
      medications: medications.length ? medications.map((item) => ({ ...emptyMedication, ...item })) : [{ ...emptyMedication }],
    });
  };

  const startNewPrescription = () => {
    setSelectedPrescription(null);
    setForm({ medicalRecordId: records[0]?.id || '', notes: '', expiryDate: '', healthCenterId: doctorCenters[0]?.id || '', digitalSealEnabled: false, medications: [{ ...emptyMedication }] });
  };

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const selectedRecord = records.find((record) => record.id === form.medicalRecordId);
  const selectedMedications = selectedPrescription ? parseMedications(selectedPrescription.medications) : [];
  const previewMedications = selectedPrescription ? selectedMedications : form.medications.filter((item) => item.name.trim());
  const previewDiagnosis = selectedPrescription?.diagnosis || selectedRecord?.diagnosis;
  const previewNotes = selectedPrescription?.notes || form.notes;
  const selectedCenterName = selectedPrescription?.health_center_name
    || doctorCenters.find((center) => center.id === form.healthCenterId)?.name
    || '';
  const selectedDoctorName = selectedPrescription
    ? `${selectedPrescription.doctor_first_name || ''} ${selectedPrescription.doctor_last_name || ''}`.trim() || doctorName
    : doctorName;
  const usesDigitalSeal = selectedPrescription ? Boolean(selectedPrescription.digital_seal_enabled && selectedPrescription.prescription_seal) : Boolean(form.digitalSealEnabled && doctorSealImage);
  const canCancelSelected = selectedPrescription && !['cancelled', 'voided', 'anulada'].includes(String(selectedPrescription.status || '').toLowerCase());
  const apiOrigin = typeof window === 'undefined' ? '' : window.location.origin.replace(/:\d+$/, ':5000');
  const verifyUrl = selectedPrescription?.validation_code
    ? `${apiOrigin}/api/prescriptions/verify/${selectedPrescription.validation_code}`
    : '';

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Recetas" subtitle="Recetas medicas profesionales, verificables e imprimibles">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_420px] gap-6">
          <aside className="rounded-2xl bg-white border border-gray-200 p-5 h-fit space-y-5 xl:sticky xl:top-28">
            <label>
              <span className="block text-sm font-semibold text-gray-700 mb-2">Paciente</span>
              <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}
              </select>
            </label>

            <div>
              <p className="font-bold text-gray-900 mb-3">Medicamentos frecuentes</p>
              <div className="space-y-2">
                {frequentMedications.map((item) => (
                  <button key={item.name} type="button" onClick={() => addMedication(item)} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-white">
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.dosage} · {item.frequency}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-3">Historial</p>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-gray-500">Sin recetas para este paciente.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {prescriptions.map((prescription) => (
                    <button
                      key={prescription.id}
                      onClick={() => setSelectedPrescription(prescription)}
                      className={`w-full rounded-xl p-3 text-left transition ${selectedPrescription?.id === prescription.id ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50 hover:bg-white'}`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{formatMedications(prescription.medications)}</p>
                      <p className="text-xs text-gray-500">{new Date(prescription.created_at).toLocaleDateString('es-DO')} · {prescription.status}</p>
                      <p className="mt-1 text-[11px] font-semibold text-blue-700">{prescription.validation_code || 'Sin codigo'}</p>
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
                <h2 className="text-lg font-bold">Nueva receta</h2>
                {selectedPrescription && (
                  <button type="button" onClick={startNewPrescription} className="ml-auto h-9 rounded-xl border border-gray-200 px-3 text-sm font-semibold hover:bg-gray-50">
                    Nueva
                  </button>
                )}
              </div>
              <form onSubmit={savePrescription} className="space-y-5">
                <label>
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Registro medico asociado</span>
                  <select value={form.medicalRecordId} onChange={(event) => setForm({ ...form, medicalRecordId: event.target.value })} required className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecciona un registro</option>
                    {records.map((record) => <option key={record.id} value={record.id}>{record.diagnosis} - {new Date(record.created_at).toLocaleDateString('es-DO')}</option>)}
                  </select>
                </label>

                <div className="space-y-4">
                  {form.medications.map((medication, index) => (
                    <MedicationEditor
                      key={index}
                      index={index}
                      medication={medication}
                      patientSelected={Boolean(selectedPatientId)}
                      onChange={(patch) => updateMedication(index, patch)}
                      onRemove={() => removeMedication(index)}
                      onSelectVademecum={(item) => applyVademecumMedication(index, item)}
                      onShowInfo={showVademecumInfo}
                      onConfirmWarnings={() => updateMedication(index, { warningsConfirmed: true })}
                    />
                  ))}
                  <button type="button" onClick={() => addMedication()} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
                    Agregar medicamento
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctorCenters.length > 1 && (
                    <label>
                      <span className="block text-sm font-semibold text-gray-700 mb-1">Centro de salud</span>
                      <select value={form.healthCenterId} onChange={(event) => setForm({ ...form, healthCenterId: event.target.value })} required className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {doctorCenters.map((center) => <option key={center.id} value={center.id}>{center.name}{center.city ? ` - ${center.city}` : ''}</option>)}
                      </select>
                    </label>
                  )}
                  <Input label="Vence" type="date" value={form.expiryDate} onChange={(value) => setForm({ ...form, expiryDate: value })} />
                  <div>
                    <p className="block text-sm font-semibold text-gray-700 mb-1">Firma medica</p>
                    <div className="min-h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                      {doctorName}
                    </div>
                  </div>
                  <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
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
                  <label className="md:col-span-2">
                    <span className="block text-sm font-semibold text-gray-700 mb-1">Indicaciones generales</span>
                    <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                </div>

                <button disabled={!selectedPatientId || !records.length || saving} className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar receta'}
                </button>
              </form>
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-28 h-fit">
            <VademecumPanel
              quickInfo={quickInfo}
              favorites={vademecumFavorites}
              recent={vademecumRecent}
              onPick={(item) => addMedication({
                ...emptyMedication,
                vademecumId: item.id,
                activeIngredient: item.principio_activo || '',
                name: item.nombre_comercial || '',
                presentation: [item.forma_farmaceutica, item.concentracion].filter(Boolean).join(' ') || item.presentacion || '',
                route: item.via_administracion || '',
                requiresPrescription: Boolean(item.requiere_receta),
                controlled: Boolean(item.controlado),
                otc: Boolean(item.otc),
              })}
              onFavorite={async (item) => {
                await vademecumAPI.addFavorite(item.id);
                await loadVademecumShortcuts();
              }}
            />
            <PrescriptionPreview
              patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
              doctorName={selectedDoctorName}
              medications={previewMedications}
              notes={previewNotes}
              diagnosis={previewDiagnosis}
              validationCode={selectedPrescription?.validation_code}
              verifyUrl={verifyUrl}
              signature={selectedDoctorName}
              seal={usesDigitalSeal ? selectedPrescription?.prescription_seal || doctorSealImage : ''}
              digitalSealEnabled={usesDigitalSeal}
              healthCenterName={selectedCenterName}
            />

            {selectedPrescription && (
              <section className="rounded-2xl bg-white border border-gray-200 p-5">
                <p className="font-bold text-gray-900 mb-3">Acciones</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => downloadPrescriptionPdf(selectedPrescription)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                  <button type="button" onClick={() => openPrescriptionPrint(selectedPrescription, true)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button type="button" onClick={() => duplicatePrescription(selectedPrescription)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" /> Duplicar
                  </button>
                  {canCancelSelected ? (
                    <button type="button" onClick={() => cancelPrescription(selectedPrescription)} className="h-10 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 inline-flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> Anular
                    </button>
                  ) : (
                    <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm font-semibold inline-flex items-center justify-center">
                      Anulada
                    </div>
                  )}
                </div>
                {selectedPrescription.validation_code && (
                  <p className="mt-3 text-xs text-gray-500 break-all">Verificacion: {verifyUrl}</p>
                )}
              </section>
            )}
          </aside>
        </div>
        {quickInfoOpen && (
          <VademecumInfoModal
            medication={quickInfo}
            loading={quickInfoLoading}
            onClose={() => setQuickInfoOpen(false)}
          />
        )}
      </DoctorShell>
    </ProtectedRoute>
  );
}

function MedicationEditor({
  index,
  medication,
  patientSelected,
  onChange,
  onRemove,
  onSelectVademecum,
  onShowInfo,
  onConfirmWarnings,
}: {
  index: number;
  medication: MedicationForm;
  patientSelected: boolean;
  onChange: (patch: Partial<MedicationForm>) => void;
  onRemove: () => void;
  onSelectVademecum: (item: any) => void;
  onShowInfo: (item: any) => void;
  onConfirmWarnings: () => void;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestionsLocked, setSuggestionsLocked] = useState(false);

  useEffect(() => {
    const text = medication.name.trim();
    if (suggestionsLocked || medication.vademecumId || text.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await vademecumAPI.search(text, 6);
        setSuggestions(response?.data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [medication.name, medication.vademecumId, suggestionsLocked]);

  const warnings = medication.vademecumWarnings || [];
  return (
    <section className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">Medicamento {index + 1}</h3>
        <button type="button" onClick={onRemove} className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Input label="Nombre" value={medication.name} onChange={(value) => {
            setSuggestionsLocked(false);
            onChange({ name: value, vademecumId: '', activeIngredient: '', vademecumWarnings: [], warningsConfirmed: false });
          }} required />
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSuggestionsLocked(true);
                    setSuggestions([]);
                    setSearching(false);
                    onSelectVademecum(item);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50"
                >
                  <span className="block text-sm font-semibold text-gray-900">{item.nombre_comercial}</span>
                  <span className="block text-xs text-gray-500">{item.principio_activo} · {item.concentracion || 'Sin concentracion'} · {item.via_administracion || 'Via no especificada'}</span>
                </button>
              ))}
            </div>
          )}
          {searching && <p className="mt-1 text-xs text-gray-400">Buscando en vademecum...</p>}
        </div>
        <Input label="Presentacion" value={medication.presentation} onChange={(value) => onChange({ presentation: value })} placeholder="Tableta 500 mg" />
        {medication.activeIngredient && (
          <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{medication.activeIngredient}</span>
              {medication.requiresPrescription && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">Requiere receta</span>}
              {medication.controlled && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Controlado</span>}
              {medication.otc && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">OTC</span>}
              {medication.vademecumId && (
                <button type="button" onClick={() => onShowInfo({ id: medication.vademecumId })} className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-900">
                  Ver ficha
                </button>
              )}
            </div>
          </div>
        )}
        <Input label="Dosis" value={medication.dosage} onChange={(value) => onChange({ dosage: value })} required />
        <Input label="Via" value={medication.route} onChange={(value) => onChange({ route: value })} placeholder="Oral" />
        <Input label="Frecuencia" value={medication.frequency} onChange={(value) => onChange({ frequency: value })} required />
        <Input label="Duracion" value={medication.duration} onChange={(value) => onChange({ duration: value })} />
        <Input label="Cantidad" value={medication.quantity} onChange={(value) => onChange({ quantity: value })} />
        <Input label="Indicaciones" value={medication.instructions} onChange={(value) => onChange({ instructions: value })} />
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Advertencias del vademecum
          </div>
          <div className="space-y-2">
            {warnings.map((warning, warningIndex) => (
              <div key={`${warning.type}-${warningIndex}`} className="text-sm text-amber-900">
                <p className="font-semibold uppercase text-[11px]">{warning.severity} · {warning.type}</p>
                <p>{warning.message}</p>
                {warning.recommendation && <p className="text-xs text-amber-800">{warning.recommendation}</p>}
              </div>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <input type="checkbox" checked={Boolean(medication.warningsConfirmed)} disabled={!patientSelected} onChange={onConfirmWarnings} className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
            Confirmo que revise estas advertencias
          </label>
        </div>
      )}
    </section>
  );
}

function VademecumInfoModal({ medication, loading, onClose }: { medication: any; loading: boolean; onClose: () => void }) {
  const details = [medication?.concentracion, medication?.forma_farmaceutica, medication?.presentacion, medication?.via_administracion].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-blue-600">Ficha del vademecum</p>
            <h3 className="text-lg font-bold text-gray-950">{medication?.nombre_comercial || 'Medicamento'}</h3>
            {medication?.principio_activo && <p className="text-sm text-gray-600">{medication.principio_activo}</p>}
          </div>
          <button type="button" onClick={onClose} className="h-9 rounded-xl border border-gray-200 px-3 text-sm font-semibold hover:bg-gray-50">
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {loading && <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">Cargando ficha...</p>}

          {details && <p className="text-sm text-gray-700">{details}</p>}

          <div className="flex flex-wrap gap-2">
            {medication?.requiere_receta && <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Requiere receta</span>}
            {medication?.controlado && <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Controlado</span>}
            {medication?.otc && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">OTC</span>}
          </div>

          {Array.isArray(medication?.posologias) && medication.posologias.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-gray-900">Posologias sugeridas</p>
              <div className="space-y-2">
                {medication.posologias.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <p className="font-semibold text-gray-950">{item.grupo_paciente || 'General'}</p>
                    <p>{[item.dosis_sugerida, item.frecuencia, item.duracion].filter(Boolean).join(' · ') || 'Sin posologia especifica'}</p>
                    {item.instrucciones && <p className="mt-1 text-xs text-gray-500">{item.instrucciones}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(medication?.advertencias) && medication.advertencias.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-gray-900">Advertencias</p>
              <div className="space-y-2">
                {medication.advertencias.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-semibold uppercase text-[11px]">{item.severidad} · {item.tipo}</p>
                    <p>{item.mensaje}</p>
                    {item.recomendacion && <p className="mt-1 text-xs text-amber-800">{item.recomendacion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !medication?.posologias?.length && !medication?.advertencias?.length && (
            <p className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">No hay posologias o advertencias adicionales registradas para este medicamento.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function VademecumPanel({ quickInfo, favorites, recent, onPick, onFavorite }: { quickInfo: any; favorites: any[]; recent: any[]; onPick: (item: any) => void; onFavorite: (item: any) => void }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900">Vademecum</p>
          <p className="text-xs text-gray-500">Datos internos editables, no sustituyen criterio medico.</p>
        </div>
        {quickInfo?.id && (
          <button type="button" onClick={() => onFavorite(quickInfo)} className="h-9 w-9 rounded-lg border border-gray-200 hover:bg-gray-50 inline-flex items-center justify-center" title="Agregar a favoritos">
            <Star className="h-4 w-4" />
          </button>
        )}
      </div>

      {quickInfo?.nombre_comercial ? (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="font-bold text-blue-950">{quickInfo.nombre_comercial}</p>
          <p className="text-sm text-blue-900">{quickInfo.principio_activo}</p>
          <p className="mt-1 text-xs text-blue-800">{[quickInfo.concentracion, quickInfo.forma_farmaceutica, quickInfo.presentacion, quickInfo.via_administracion].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {quickInfo.requiere_receta && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-800">Receta</span>}
            {quickInfo.controlado && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Controlado</span>}
            {quickInfo.otc && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">OTC</span>}
          </div>
          {Array.isArray(quickInfo.posologias) && quickInfo.posologias.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-bold uppercase text-blue-700">Posologias sugeridas</p>
              {quickInfo.posologias.slice(0, 3).map((item: any) => (
                <p key={item.id} className="text-xs text-blue-900">{item.grupo_paciente}: {[item.dosis_sugerida, item.frecuencia, item.duracion].filter(Boolean).join(' · ')}</p>
              ))}
            </div>
          )}
          {Array.isArray(quickInfo.advertencias) && quickInfo.advertencias.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-bold uppercase text-amber-700">Advertencias</p>
              {quickInfo.advertencias.slice(0, 3).map((item: any) => (
                <p key={item.id} className="text-xs text-amber-900">{item.severidad}: {item.mensaje}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mb-5 text-sm text-gray-500">Selecciona un medicamento del buscador para ver su ficha rapida.</p>
      )}

      <ShortcutList title="Favoritos" items={favorites} onPick={onPick} />
      <ShortcutList title="Recientes" items={recent} onPick={onPick} />
    </section>
  );
}

function ShortcutList({ title, items, onPick }: { title: string; items: any[]; onPick: (item: any) => void }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-sm font-bold text-gray-900">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">Sin medicamentos.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <button key={`${title}-${item.id}`} type="button" onClick={() => onPick(item)} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-white">
              <p className="text-sm font-semibold text-gray-900">{item.nombre_comercial}</p>
              <p className="text-xs text-gray-500">{item.principio_activo} · {item.concentracion || 'Sin concentracion'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, required = false, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label>
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );
}

function parseMedications(value: any): MedicationForm[] {
  const medications = typeof value === 'string' ? safeJson(value) : value;
  return Array.isArray(medications) ? medications : [];
}

function formatMedications(value: any) {
  const medications = parseMedications(value);
  if (!medications.length) return 'Sin medicamentos registrados';
  return medications.map((item: any) => `${item.name || item.medication || 'Medicamento'} ${item.dosage || ''} ${item.frequency || ''}`.trim()).join(', ');
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function getPrescriptionError(error: any) {
  if (error?.status === 403) return 'No tienes permiso para crear o modificar recetas de este paciente.';
  if (error?.status === 409) return 'La receta ya fue anulada o existe un conflicto de estado.';
  if (error?.status === 400) return error?.message || 'Revisa los datos de la receta.';
  return error?.message || 'No se pudo procesar la receta.';
}

function getPatientsError(error: any) {
  if (error?.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente para cargar pacientes.';
  if (error?.status === 403) return 'Tu usuario no tiene permisos para ver pacientes en este modulo.';
  return error?.message || 'No se pudieron cargar los pacientes.';
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
