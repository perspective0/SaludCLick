'use client';

import { FormEvent, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import { doctorAPI } from '@/utils/api';
import { BadgeDollarSign, Building2, Camera, Clock, Eye, FileText, Save, Star, Trash2, Upload, Video } from 'lucide-react';

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const defaultAvailability = dayNames.map((_, index) => ({
  dayOfWeek: index,
  startTime: '08:00',
  endTime: '17:00',
  isBreak: false,
  enabled: index < 5,
  healthCenterId: '',
}));

function cleanTime(value?: string) {
  return value ? value.slice(0, 5) : '08:00';
}

function timeToMinutes(value?: string) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function findAvailabilityConflict(slots: any[], centers: any[]) {
  const activeSlots = slots
    .filter((slot) => slot.enabled)
    .map((slot) => ({
      ...slot,
      startMinutes: timeToMinutes(slot.startTime),
      endMinutes: timeToMinutes(slot.endTime),
      healthCenterId: slot.healthCenterId || '',
    }));

  for (const slot of activeSlots) {
    if (slot.startMinutes === null || slot.endMinutes === null || slot.startMinutes >= slot.endMinutes) {
      return 'Cada horario debe tener una hora de inicio menor que la hora de cierre.';
    }
  }

  for (let index = 0; index < activeSlots.length; index += 1) {
    const current = activeSlots[index];
    for (let nextIndex = index + 1; nextIndex < activeSlots.length; nextIndex += 1) {
      const next = activeSlots[nextIndex];
      if (current.dayOfWeek !== next.dayOfWeek) continue;
      if (current.healthCenterId === next.healthCenterId) continue;
      const overlaps = current.startMinutes < next.endMinutes && next.startMinutes < current.endMinutes;
      if (!overlaps) continue;

      const currentCenter = centers.find((center) => center.id === current.healthCenterId)?.name || 'un centro';
      const nextCenter = centers.find((center) => center.id === next.healthCenterId)?.name || 'otro centro';
      return `Hay un choque el ${dayNames[current.dayOfWeek]}: ${current.startTime}-${current.endTime} en ${currentCenter} se cruza con ${next.startTime}-${next.endTime} en ${nextCenter}.`;
    }
  }

  return '';
}

function buildDefaultAvailability(healthCenterId = '') {
  return defaultAvailability.map((day) => ({ ...day, healthCenterId }));
}

export default function DoctorProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [healthCenters, setHealthCenters] = useState<any[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [sealUploading, setSealUploading] = useState(false);
  const [form, setForm] = useState({
    bio: '',
    consultationPrice: '',
    yearsExperience: '',
    avatar: '',
    prescriptionLogo: '',
    prescriptionSeal: '',
    specialtiesText: '',
    healthCenterId: '',
    selectedHealthCenterIds: [] as string[],
    healthCenterMode: 'existing',
    newHealthCenterName: '',
    newHealthCenterAddress: '',
    newHealthCenterCity: '',
    newHealthCenterPhone: '',
    newHealthCenterEmail: '',
    documentNumber: '',
    idFrontImage: '',
    idBackImage: '',
    exequaturImage: '',
    specialtyProofImage: '',
    hasIdFrontImage: false,
    hasIdBackImage: false,
    hasExequaturImage: false,
    hasSpecialtyProofImage: false,
  });
  const [settings, setSettings] = useState({
    consultationDuration: '30',
    teleconsultation: false,
    vacationMode: false,
  });
  const [availability, setAvailability] = useState(buildDefaultAvailability());
  const [scheduleHealthCenterId, setScheduleHealthCenterId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      setLoading(false);
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    loadProfile(parsed.id);
    loadHealthCenters();
  }, []);

  const loadHealthCenters = async () => {
    try {
      const response = await doctorAPI.listHealthCenters();
      setHealthCenters(response?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProfile = async (doctorId: string, options: { throwOnError?: boolean } = {}) => {
    setLoading(true);
    setError('');
    try {
      const response = await doctorAPI.getById(doctorId);
      const data = response?.data || null;
      const assignedCenters = Array.isArray(data?.health_centers) ? data.health_centers : [];
      const selectedHealthCenterIds = assignedCenters.length
        ? assignedCenters.map((center: any) => center.id).filter(Boolean)
        : data?.health_center_id
          ? [data.health_center_id]
          : [];
      setProfile(data);
      setForm({
        bio: data?.bio || '',
        consultationPrice: data?.consultation_price ? String(data.consultation_price) : '',
        yearsExperience: data?.years_experience ? String(data.years_experience) : '',
        avatar: data?.avatar || '',
        prescriptionLogo: data?.prescription_logo || '',
        prescriptionSeal: data?.prescription_seal || '',
        specialtiesText: Array.isArray(data?.specialties) ? data.specialties.join(', ') : '',
        healthCenterId: data?.health_center_id || '',
        selectedHealthCenterIds,
        healthCenterMode: 'existing',
        newHealthCenterName: '',
        newHealthCenterAddress: '',
        newHealthCenterCity: '',
        newHealthCenterPhone: '',
        newHealthCenterEmail: '',
        documentNumber: data?.document_number || '',
        idFrontImage: '',
        idBackImage: '',
        exequaturImage: '',
        specialtyProofImage: '',
        hasIdFrontImage: Boolean(data?.has_id_front_image),
        hasIdBackImage: Boolean(data?.has_id_back_image),
        hasExequaturImage: Boolean(data?.has_exequatur_image),
        hasSpecialtyProofImage: Boolean(data?.has_specialty_proof_image),
      });
      setScheduleHealthCenterId(data?.health_center_id || selectedHealthCenterIds[0] || '');
      setSettings({
        consultationDuration: data?.consultation_duration ? String(data.consultation_duration) : '30',
        teleconsultation: Boolean(data?.teleconsultation_enabled),
        vacationMode: Boolean(data?.vacation_mode),
      });
      const saved = Array.isArray(data?.availability) ? data.availability : [];
      if (saved.length) {
        const normalizedSaved = saved
          .filter((slot: any) => !slot.is_break)
          .map((slot: any) => ({
            dayOfWeek: Number(slot.day_of_week),
            startTime: cleanTime(slot.start_time),
            endTime: cleanTime(slot.end_time),
            isBreak: false,
            enabled: true,
            healthCenterId: slot.health_center_id || data?.health_center_id || selectedHealthCenterIds[0] || '',
          }));
        setAvailability(normalizedSaved);
      } else {
        setAvailability(buildDefaultAvailability(data?.health_center_id || selectedHealthCenterIds[0] || ''));
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el perfil profesional.');
      if (options.throwOnError) {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (
        !form.documentNumber.trim() ||
        (!form.hasIdFrontImage && !form.idFrontImage) ||
        (!form.hasIdBackImage && !form.idBackImage) ||
        (!form.hasExequaturImage && !form.exequaturImage) ||
        (!form.hasSpecialtyProofImage && !form.specialtyProofImage)
      ) {
        setError('Debes adjuntar cédula frontal, cédula reverso, exequátur y soporte de especialidad para completar tu perfil.');
        setSaving(false);
        return;
      }

      const activeAvailability = availability.filter((slot) => slot.enabled);
      const scheduleConflict = findAvailabilityConflict(activeAvailability, healthCenters);
      if (scheduleConflict) {
        setError(scheduleConflict);
        setSaving(false);
        return;
      }

      await doctorAPI.update(user.id, {
        bio: form.bio,
        consultationPrice: Number(form.consultationPrice || 0),
        yearsExperience: Number(form.yearsExperience || 0),
        consultationDuration: Number(settings.consultationDuration || 30),
        teleconsultationEnabled: settings.teleconsultation,
        vacationMode: settings.vacationMode,
        avatar: form.avatar.trim(),
        prescriptionLogo: form.prescriptionLogo.trim(),
        prescriptionSeal: form.prescriptionSeal.trim(),
        documentNumber: form.documentNumber.trim(),
        idFrontImage: form.idFrontImage || undefined,
        idBackImage: form.idBackImage || undefined,
        exequaturImage: form.exequaturImage || undefined,
        specialtyProofImage: form.specialtyProofImage || undefined,
        healthCenterId: form.healthCenterMode === 'existing'
          ? form.healthCenterId || form.selectedHealthCenterIds[0]
          : undefined,
        healthCenterIds: form.selectedHealthCenterIds,
        newHealthCenter: form.healthCenterMode === 'new'
          ? {
              name: form.newHealthCenterName,
              address: form.newHealthCenterAddress,
              city: form.newHealthCenterCity,
              phone: form.newHealthCenterPhone,
              email: form.newHealthCenterEmail,
            }
          : undefined,
        specialties: form.specialtiesText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        availability: activeAvailability
          .map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            healthCenterId: slot.healthCenterId || form.healthCenterId || form.selectedHealthCenterIds[0] || null,
            isBreak: false,
          })),
      });
      await loadProfile(user.id, { throwOnError: true });
      setSuccess('Configuración profesional actualizada correctamente.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    setError('');
    setSuccess('');
    try {
      const response = await doctorAPI.uploadAvatar(user.id, file);
      const avatar = response.data.avatar;
      setForm({ ...form, avatar: response.data.avatar });
      const nextUser = { ...user, avatar };
      setUser(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
      await loadProfile(user.id, { throwOnError: true });
      setSuccess('Foto de perfil actualizada.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir la foto.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadPrescriptionLogo = async (file?: File) => {
    if (!file || !user?.id) return;
    setLogoUploading(true);
    setError('');
    setSuccess('');
    try {
      const response = await doctorAPI.uploadPrescriptionLogo(user.id, file);
      const prescriptionLogo = response.data.prescriptionLogo || response.data.prescription_logo;
      setForm((current) => ({ ...current, prescriptionLogo }));
      await loadProfile(user.id, { throwOnError: true });
      setSuccess('Logo de recetas actualizado.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir el logo de recetas.');
    } finally {
      setLogoUploading(false);
    }
  };

  const uploadPrescriptionSeal = async (file?: File) => {
    if (!file || !user?.id) return;
    setSealUploading(true);
    setError('');
    setSuccess('');
    try {
      const response = await doctorAPI.uploadPrescriptionSeal(user.id, file);
      const prescriptionSeal = response.data.prescriptionSeal || response.data.prescription_seal;
      setForm((current) => ({ ...current, prescriptionSeal }));
      await loadProfile(user.id, { throwOnError: true });
      setSuccess('Sello de recetas actualizado.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir el sello de recetas.');
    } finally {
      setSealUploading(false);
    }
  };

  const handleDocumentFile = (
    field: 'idFrontImage' | 'idBackImage' | 'exequaturImage' | 'specialtyProofImage',
    file?: File
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imagenes para los documentos.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Cada documento debe pesar 4MB o menos.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, [field]: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const completion = getProfileCompletion(form, availability);
  const documentsComplete = Boolean(
    form.documentNumber.trim() &&
    (form.hasIdFrontImage || form.idFrontImage) &&
    (form.hasIdBackImage || form.idBackImage) &&
    (form.hasExequaturImage || form.exequaturImage) &&
    (form.hasSpecialtyProofImage || form.specialtyProofImage)
  );
  const assignedCenters = Array.isArray(profile?.health_centers) ? profile.health_centers : [];
  const assignedCenterLabel = assignedCenters.length
    ? assignedCenters.map((center: any) => `${center.name}${center.city ? ` · ${center.city}` : ''}`).join(', ')
    : `${profile?.health_center_name || 'No asignado'}${profile?.city ? ` · ${profile.city}` : ''}`;

  const toggleHealthCenter = (centerId: string) => {
    setForm((current) => {
      const exists = current.selectedHealthCenterIds.includes(centerId);
      const selectedHealthCenterIds = exists
        ? current.selectedHealthCenterIds.filter((id) => id !== centerId)
        : [...current.selectedHealthCenterIds, centerId];
      const healthCenterId = current.healthCenterId && selectedHealthCenterIds.includes(current.healthCenterId)
        ? current.healthCenterId
        : selectedHealthCenterIds[0] || '';

      if (!scheduleHealthCenterId || scheduleHealthCenterId === centerId) {
        setScheduleHealthCenterId(healthCenterId);
      }

      return { ...current, selectedHealthCenterIds, healthCenterId };
    });
  };

  const activeScheduleCenterId = scheduleHealthCenterId || form.healthCenterId || form.selectedHealthCenterIds[0] || '';
  const scheduleCenters = healthCenters.filter((center) => form.selectedHealthCenterIds.includes(center.id));
  const availabilityForActiveCenter = buildDefaultAvailability(activeScheduleCenterId).map((day) => {
    const match = availability.find((slot) =>
      Number(slot.dayOfWeek) === day.dayOfWeek &&
      (slot.healthCenterId || activeScheduleCenterId) === activeScheduleCenterId
    );
    return match || { ...day, enabled: false };
  });

  const updateAvailabilityForActiveCenter = (dayOfWeek: number, updates: any) => {
    if (!activeScheduleCenterId) return;
    setAvailability((current) => {
      const index = current.findIndex((slot) =>
        Number(slot.dayOfWeek) === dayOfWeek &&
        (slot.healthCenterId || activeScheduleCenterId) === activeScheduleCenterId
      );

      if (index >= 0) {
        const next = [...current];
        next[index] = { ...next[index], ...updates, healthCenterId: activeScheduleCenterId };
        return next;
      }

      return [
        ...current,
        {
          ...buildDefaultAvailability(activeScheduleCenterId).find((day) => day.dayOfWeek === dayOfWeek),
          ...updates,
          dayOfWeek,
          healthCenterId: activeScheduleCenterId,
        },
      ];
    });
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Perfil profesional" subtitle="Informacion visible para pacientes y equipo administrativo">
        <div className="space-y-6">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Metric title={assignedCenters.length > 1 ? 'Centros' : 'Centro'} value={assignedCenters.length ? assignedCenters.length : assignedCenterLabel} icon={Building2} />
            <Metric title="Consulta" value={profile?.consultation_price ? `$${profile.consultation_price}` : 'Sin precio'} icon={BadgeDollarSign} />
            <Metric title="Valoracion" value={profile?.average_rating || 'Sin valoracion'} icon={Star} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Perfil {completion}% completo</h2>
                  <p className="text-sm text-gray-500">Completa la informacion para mejorar conversion de reservas.</p>
                </div>
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${completion}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                {!form.bio && <span>Falta biografia</span>}
                {!form.specialtiesText && <span>Faltan especialidades</span>}
                {!form.avatar && <span>Falta foto</span>}
                {!availability.some((slot) => slot.enabled) && <span>Faltan horarios</span>}
                {!documentsComplete && <span>Faltan documentos</span>}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Asi te veran los pacientes</p>
              <h2 className="font-bold text-gray-900">{profile?.first_name || user?.firstName || 'Doctor'} {profile?.last_name || user?.lastName || ''}</h2>
              <p className="text-sm text-gray-600 mt-1">{form.specialtiesText || 'Especialidad pendiente'}</p>
              <p className="text-sm text-gray-500 mt-3 line-clamp-3">{form.bio || 'Agrega una biografia profesional para tu perfil publico.'}</p>
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-gray-200 p-6">
            {loading ? (
              <p className="text-gray-500">Cargando perfil...</p>
            ) : (
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                      {form.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.avatar} alt="Foto de perfil" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="w-12 h-12 text-gray-300" />
                      )}
                    </div>
                    <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1">Foto publica</label>
                    <label className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-800">
                      <Upload className="w-4 h-4" />
                      {avatarUploading ? 'Subiendo...' : 'Subir foto'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={avatarUploading}
                        onChange={(event) => uploadAvatar(event.target.files?.[0])}
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      Esta imagen se mostrara en el listado de medicos, perfil publico y reservas.
                    </p>

                    <div className="mt-5 border-t border-gray-200 pt-5">
                      <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white px-4">
                        {form.prescriptionLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.prescriptionLogo} alt="Logo para recetas" className="max-h-20 max-w-full object-contain" />
                        ) : (
                          <FileText className="h-9 w-9 text-gray-300" />
                        )}
                      </div>
                      <label className="mt-3 block text-sm font-semibold text-gray-700">Logo para recetas</label>
                      <label className="mt-1 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        {logoUploading ? 'Subiendo...' : 'Subir logo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={(event) => uploadPrescriptionLogo(event.target.files?.[0])}
                        />
                      </label>
                      {form.prescriptionLogo && (
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, prescriptionLogo: '' }))}
                          className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Quitar logo
                        </button>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Se guarda en tu perfil y saldra en recetas impresas y PDF.
                      </p>
                    </div>

                    <div className="mt-5 border-t border-gray-200 pt-5">
                      <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white px-4">
                        {form.prescriptionSeal ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.prescriptionSeal} alt="Sello para recetas" className="max-h-20 max-w-full object-contain" />
                        ) : (
                          <FileText className="h-9 w-9 text-gray-300" />
                        )}
                      </div>
                      <label className="mt-3 block text-sm font-semibold text-gray-700">Sello para recetas y ordenes</label>
                      <label className="mt-1 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        {sealUploading ? 'Subiendo...' : 'Subir sello'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={sealUploading}
                          onChange={(event) => uploadPrescriptionSeal(event.target.files?.[0])}
                        />
                      </label>
                      {form.prescriptionSeal && (
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, prescriptionSeal: '' }))}
                          className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Quitar sello
                        </button>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Si no se sube una imagen, el documento mostrara el espacio de sello vacio.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-900">Centros/clinicas donde trabajas</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {assignedCenterLabel}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {healthCenters.map((center) => (
                          <label key={center.id} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2 text-sm text-blue-950 shadow-sm">
                            <input
                              type="checkbox"
                              checked={form.selectedHealthCenterIds.includes(center.id)}
                              onChange={() => toggleHealthCenter(center.id)}
                              className="mt-1 h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                              <span className="block font-semibold">{center.name}</span>
                              <span className="block text-xs text-blue-600">{center.city || 'Ciudad no indicada'}{center.address ? ` · ${center.address}` : ''}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {form.selectedHealthCenterIds.length > 1 && (
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-blue-900">Centro principal</span>
                          <select
                            value={form.healthCenterId}
                              onChange={(event) => {
                                setForm({ ...form, healthCenterId: event.target.value });
                                setScheduleHealthCenterId(event.target.value);
                              }}
                            className="h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {healthCenters
                              .filter((center) => form.selectedHealthCenterIds.includes(center.id))
                              .map((center) => (
                                <option key={center.id} value={center.id}>{center.name} · {center.city}</option>
                              ))}
                          </select>
                        </label>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <select
                          value={form.healthCenterMode === 'new' ? 'new' : ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm({ ...form, healthCenterMode: value === 'new' ? 'new' : 'existing' });
                          }}
                          className="h-11 rounded-xl border border-blue-100 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Agregar otro centro</option>
                          <option value="new">Mi centro no aparece</option>
                        </select>
                      </div>
                      {form.healthCenterMode === 'new' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input value={form.newHealthCenterName} onChange={(event) => setForm({ ...form, newHealthCenterName: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm" placeholder="Nombre del centro" />
                          <input value={form.newHealthCenterCity} onChange={(event) => setForm({ ...form, newHealthCenterCity: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm" placeholder="Ciudad" />
                          <input value={form.newHealthCenterAddress} onChange={(event) => setForm({ ...form, newHealthCenterAddress: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm" placeholder="Direccion" />
                          <input value={form.newHealthCenterPhone} onChange={(event) => setForm({ ...form, newHealthCenterPhone: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm" placeholder="Telefono" />
                          <input value={form.newHealthCenterEmail} onChange={(event) => setForm({ ...form, newHealthCenterEmail: event.target.value })} className="h-10 rounded-xl border border-blue-100 px-3 text-sm md:col-span-2" placeholder="Correo del centro" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Biografia profesional</label>
                      <textarea
                        value={form.bio}
                        onChange={(event) => setForm({ ...form, bio: event.target.value })}
                        rows={6}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe tu experiencia, enfoque clinico y servicios..."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Precio de consulta</label>
                    <input
                      type="number"
                      min="0"
                      value={form.consultationPrice}
                      onChange={(event) => setForm({ ...form, consultationPrice: event.target.value })}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Años de experiencia</label>
                    <input
                      type="number"
                      min="0"
                      value={form.yearsExperience}
                      onChange={(event) => setForm({ ...form, yearsExperience: event.target.value })}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Especialidades</label>
                    <input
                      value={form.specialtiesText}
                      onChange={(event) => setForm({ ...form, specialtiesText: event.target.value })}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Cardiologia, Medicina General"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-base font-bold text-blue-950">Documentos de validación</h3>
                      <p className="text-sm text-blue-700">Obligatorios para completar tu perfil profesional.</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-blue-950 mb-1">Cédula o documento de identidad</label>
                    <input
                      value={form.documentNumber}
                      onChange={(event) => setForm({ ...form, documentNumber: event.target.value })}
                      className="h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 001-0000000-0"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <DocumentInput
                      label="Foto cédula frontal"
                      ready={form.hasIdFrontImage || Boolean(form.idFrontImage)}
                      onChange={(file) => handleDocumentFile('idFrontImage', file)}
                    />
                    <DocumentInput
                      label="Foto cédula reverso"
                      ready={form.hasIdBackImage || Boolean(form.idBackImage)}
                      onChange={(file) => handleDocumentFile('idBackImage', file)}
                    />
                    <DocumentInput
                      label="Foto o captura del exequátur"
                      ready={form.hasExequaturImage || Boolean(form.exequaturImage)}
                      onChange={(file) => handleDocumentFile('exequaturImage', file)}
                    />
                    <DocumentInput
                      label="Soporte de especialidad"
                      ready={form.hasSpecialtyProofImage || Boolean(form.specialtyProofImage)}
                      onChange={(file) => handleDocumentFile('specialtyProofImage', file)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Horario por centro/clinica</h3>
                      <p className="text-sm text-gray-500">Configura dias y horas para cada centro donde atiendes.</p>
                    </div>
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>

                  {scheduleCenters.length > 1 && (
                    <label className="mb-4 block">
                      <span className="mb-1 block text-sm font-semibold text-gray-700">Centro para editar horarios</span>
                      <select
                        value={activeScheduleCenterId}
                        onChange={(event) => setScheduleHealthCenterId(event.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {scheduleCenters.map((center) => (
                          <option key={center.id} value={center.id}>{center.name} · {center.city || 'Ciudad no indicada'}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="space-y-3">
                    {availabilityForActiveCenter.map((slot) => (
                      <div key={slot.dayOfWeek} className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] gap-3 rounded-xl bg-gray-50 p-3">
                        <label className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={(event) => {
                              updateAvailabilityForActiveCenter(slot.dayOfWeek, { enabled: event.target.checked });
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          {dayNames[slot.dayOfWeek]}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="time"
                            value={slot.startTime}
                            disabled={!slot.enabled}
                            onChange={(event) => {
                              updateAvailabilityForActiveCenter(slot.dayOfWeek, { startTime: event.target.value });
                            }}
                            className="h-10 rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100"
                          />
                          <input
                            type="time"
                            value={slot.endTime}
                            disabled={!slot.enabled}
                            onChange={(event) => {
                              updateAvailabilityForActiveCenter(slot.dayOfWeek, { endTime: event.target.value });
                            }}
                            className="h-10 rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateAvailabilityForActiveCenter(slot.dayOfWeek, { enabled: false });
                          }}
                          className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Video className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-gray-900">Configuracion profesional</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label>
                      <span className="block text-sm font-semibold text-gray-700 mb-1">Duracion consulta</span>
                      <select
                        value={settings.consultationDuration}
                        onChange={(event) => setSettings({ ...settings, consultationDuration: event.target.value })}
                        className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm"
                      >
                        <option value="20">20 minutos</option>
                        <option value="30">30 minutos</option>
                        <option value="45">45 minutos</option>
                        <option value="60">60 minutos</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <input type="checkbox" checked={settings.teleconsultation} onChange={(event) => setSettings({ ...settings, teleconsultation: event.target.checked })} />
                      <span>
                        <span className="block text-sm font-semibold text-gray-700">Teleconsulta</span>
                        <span className="block text-xs text-gray-500">Permite que los pacientes agenden citas virtuales contigo.</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                      <input type="checkbox" checked={settings.vacationMode} onChange={(event) => setSettings({ ...settings, vacationMode: event.target.checked })} />
                      <span className="text-sm font-semibold text-gray-700">Modo vacaciones</span>
                    </label>
                  </div>
                </div>

                <button disabled={saving} className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            )}
          </section>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function getProfileCompletion(form: any, availability: any[]) {
  const checks = [
    form.bio,
    form.consultationPrice,
    form.yearsExperience,
    form.avatar,
    form.specialtiesText,
    form.documentNumber &&
      (form.hasIdFrontImage || form.idFrontImage) &&
      (form.hasIdBackImage || form.idBackImage) &&
      (form.hasExequaturImage || form.exequaturImage) &&
      (form.hasSpecialtyProofImage || form.specialtyProofImage),
    availability.some((slot) => slot.enabled),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function DocumentInput({
  label,
  ready,
  onChange,
}: {
  label: string;
  ready: boolean;
  onChange: (file?: File) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm shadow-sm">
      <span>
        <span className="block font-semibold text-blue-950">{label}</span>
        <span className={`block text-xs ${ready ? 'text-emerald-600' : 'text-blue-600'}`}>
          {ready ? 'Documento cargado' : 'Seleccionar imagen'}
        </span>
      </span>
      <span className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
        Subir
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </label>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5">
      <Icon className="w-5 h-5 text-blue-600 mb-3" />
      <p className="text-lg font-bold truncate">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}
