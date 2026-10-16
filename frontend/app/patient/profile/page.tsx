'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { patientAPI } from '@/utils/api';
import { dominicanHealthInsurers } from '@/utils/dominicanInsurance';
import { dominicanLocations } from '@/utils/dominicanLocations';
import { dominicanBarrios } from '@/utils/dominicanBarrios';
import { AlertTriangle, CheckCircle2, MapPin, Phone, Save, Search, ShieldCheck, UserRound } from 'lucide-react';
import { maskDominicanId, maskInsuranceNumber, maskPhone } from '@/utils/inputMasks';

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    phone: '',
    address: '',
    sector: '',
    municipality: '',
    province: '',
    dateOfBirth: '',
    documentNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
    hasInsurance: false,
    insuranceProvider: '',
    insuranceNumber: '',
    whatsappRemindersEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.profile();
      setProfile(response.data);
      setForm({
        phone: response.data.phone || '',
        address: response.data.address || '',
        sector: response.data.sector || '',
        municipality: response.data.municipality || '',
        province: response.data.province || '',
        dateOfBirth: response.data.date_of_birth ? String(response.data.date_of_birth).slice(0, 10) : '',
        documentNumber: response.data.document_number || '',
        emergencyContact: response.data.emergency_contact || '',
        emergencyPhone: response.data.emergency_phone || '',
        hasInsurance: Boolean(response.data.has_insurance || response.data.insurance_provider),
        insuranceProvider: response.data.insurance_provider || '',
        insuranceNumber: response.data.insurance_number || '',
        whatsappRemindersEnabled: Boolean(response.data.whatsapp_reminders_enabled),
      });
    } catch (err: any) {
      setError(err?.status === 403 ? 'No tienes permiso para acceder a este perfil.' : 'No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.phone && form.phone.length < 7) {
      setError('Ingresa un teléfono válido.');
      return;
    }
    if (!form.documentNumber.trim()) {
      setError('La cédula es obligatoria para completar tu perfil.');
      return;
    }
    if (form.hasInsurance && (!form.insuranceProvider || !form.insuranceNumber.trim())) {
      setError('Selecciona tu seguro y escribe tu NSS o número de póliza.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await patientAPI.updateProfile(form);
      setSuccess('Perfil actualizado correctamente.');
      await loadProfile();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title="Mi perfil" subtitle="Mantén actualizados tus datos de contacto y emergencia">
        {error && <Alert tone="error" message={error} />}
        {success && <Alert tone="success" message={success} />}

        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <UserRound className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase text-gray-400">Perfil del paciente</p>
                    <h2 className="text-2xl font-black text-gray-950">{`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Paciente'}</h2>
                    <p className="text-sm text-gray-500">{profile?.email || 'Correo no disponible'}</p>
                  </div>
                </div>
                <div className="min-w-56 rounded-2xl bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-900">Completitud</span>
                    <span className="text-2xl font-black text-blue-700">{profile?.profileCompleteness?.percentage || 0}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${profile?.profileCompleteness?.percentage || 0}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <form onSubmit={updateProfile} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Datos personales</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnly label="Nombre" value={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()} />
                <ReadOnly label="Correo" value={profile?.email || 'N/D'} />
                <Field label="Teléfono" value={form.phone} onChange={(value) => setForm({ ...form, phone: maskPhone(value) })} type="tel" />
                <Field label="Cédula" value={form.documentNumber} onChange={(value) => setForm({ ...form, documentNumber: maskDominicanId(value) })} placeholder="000-0000000-0" />
                <Field label="Fecha nacimiento" value={form.dateOfBirth} onChange={(value) => setForm({ ...form, dateOfBirth: value })} type="date" />
                <div className="md:col-span-2">
                  <LocationPicker
                    sector={form.sector}
                    municipality={form.municipality}
                    province={form.province}
                    onChange={(location) => setForm({ ...form, ...location })}
                    onUseLocation={async () => {
                      if (!navigator.geolocation) {
                        setError('Tu navegador no permite obtener la ubicación.');
                        return;
                      }
                      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                        setError('El navegador solo permite la ubicación usando HTTPS o desde localhost.');
                        return;
                      }
                      setLocationLoading(true);
                      setError('');
                      setSuccess('Solicitando permiso para acceder a tu ubicación...');
                      const requestLocation = (useHighAccuracy = false) => navigator.geolocation.getCurrentPosition(async (position) => {
                        try {
                          const response = await patientAPI.reverseGeocode(position.coords.latitude, position.coords.longitude);
                          const location = response.data || {};
                          if (!location.municipality && !location.province) {
                            throw new Error('La ubicación fue detectada, pero no pudimos asociarla a un municipio. Selecciónalo manualmente.');
                          }
                          setForm((current) => ({ ...current, ...location }));
                          setSuccess(location.sector
                            ? 'Ubicación identificada. Revisa los datos y guarda tu perfil.'
                            : 'Municipio y provincia identificados. Selecciona o escribe tu sector y guarda tu perfil.');
                        } catch (err: any) {
                          setError(err?.message || 'No se pudo identificar tu ubicación.');
                          setSuccess('');
                        } finally {
                          setLocationLoading(false);
                        }
                      }, (positionError) => {
                        if (positionError.code === 3 && !useHighAccuracy) {
                          setSuccess('La ubicación está tardando. Intentando una lectura más precisa...');
                          requestLocation(true);
                          return;
                        }
                        const message = positionError.code === 1
                          ? 'Permiso de ubicación denegado. Actívalo en el candado de la barra del navegador y vuelve a intentarlo.'
                          : positionError.code === 2
                            ? 'No se pudo detectar tu ubicación. Verifica que el GPS o la ubicación del dispositivo estén activos.'
                            : 'El dispositivo tardó en responder. Activa la ubicación/GPS y vuelve a intentarlo, o selecciona tu sector manualmente.';
                        setError(message);
                        setSuccess('');
                        setLocationLoading(false);
                      }, {
                        enableHighAccuracy: useHighAccuracy,
                        timeout: useHighAccuracy ? 30000 : 20000,
                        maximumAge: useHighAccuracy ? 0 : 600000,
                      });
                      requestLocation(false);
                    }}
                    locationLoading={locationLoading}
                  />
                </div>
                <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <label className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block font-bold text-gray-900">¿Tienes seguro médico?</span>
                      <span className="block text-sm text-gray-500">Esto ayuda al médico y a la secretaria a preparar tu atención.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.hasInsurance}
                      onChange={(event) => setForm({
                        ...form,
                        hasInsurance: event.target.checked,
                        insuranceProvider: event.target.checked ? form.insuranceProvider : '',
                        insuranceNumber: event.target.checked ? form.insuranceNumber : '',
                      })}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  {form.hasInsurance && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Seguro médico</span>
                        <select
                          value={form.insuranceProvider}
                          onChange={(event) => setForm({ ...form, insuranceProvider: event.target.value })}
                          className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecciona un seguro</option>
                          {dominicanHealthInsurers.map((insurer) => (
                            <option key={insurer} value={insurer}>{insurer}</option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label={form.insuranceProvider.toLowerCase().includes('senasa') ? 'NSS' : 'No. de póliza'}
                        value={form.insuranceNumber}
                        onChange={(value) => setForm({ ...form, insuranceNumber: maskInsuranceNumber(value) })}
                        placeholder={form.insuranceProvider.toLowerCase().includes('senasa') ? 'Número de Seguridad Social' : 'Número de póliza'}
                      />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <label className="flex items-center justify-between gap-4">
                    <span>
                      <span className="block font-bold text-emerald-950">Recordatorios de citas por WhatsApp</span>
                      <span className="mt-1 block text-sm text-emerald-800">
                        SaludClick podrá avisarte antes de tus citas usando el teléfono indicado arriba. Puedes desactivarlo cuando quieras.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.whatsappRemindersEnabled}
                      onChange={(event) => setForm({
                        ...form,
                        whatsappRemindersEnabled: event.target.checked,
                      })}
                      className="h-5 w-5 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                </div>
                <Field label="Contacto emergencia" value={form.emergencyContact} onChange={(value) => setForm({ ...form, emergencyContact: value })} />
                <Field label="Teléfono emergencia" value={form.emergencyPhone} onChange={(value) => setForm({ ...form, emergencyPhone: maskPhone(value) })} type="tel" />
              </div>

              <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <h2 className="font-bold text-gray-900">Contacto de emergencia</h2>
                </div>
                <p className="font-bold text-gray-950">{form.emergencyContact || 'No registrado'}</p>
                <p className="mt-1 text-sm text-gray-500">{form.emergencyPhone || 'Teléfono pendiente'}</p>
                {form.emergencyContact && form.emergencyPhone && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Información lista
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2 className="font-bold text-gray-900">Alergias visibles</h2>
                </div>
                {profile?.allergies?.length ? (
                  <div className="space-y-3">
                    {profile.allergies.map((allergy: any) => (
                      <div key={allergy.id} className="rounded-xl bg-amber-50 p-3">
                        <p className="font-bold text-amber-900">{allergy.name}</p>
                        <p className="text-sm text-amber-700">{allergy.severity || 'Severidad no especificada'} {allergy.reaction ? `· ${allergy.reaction}` : ''}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay alergias activas registradas por tus médicos.</p>
                )}
              </section>
            </aside>
            </div>
          </div>
        )}
      </PatientShell>
    </ProtectedRoute>
  );
}

function LocationPicker({
  sector,
  municipality,
  province,
  onChange,
  onUseLocation,
  locationLoading,
}: {
  sector: string;
  municipality: string;
  province: string;
  onChange: (location: { sector: string; municipality: string; province: string }) => void;
  onUseLocation: () => void;
  locationLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const locations = useMemo(() => [
    ...dominicanLocations,
    ...dominicanBarrios.flatMap((group) => group.sectors.map((sector) => ({
      sector,
      municipality: findCatalogValue(group.municipality, 'municipality') || group.municipality,
      province: findCatalogValue(group.province, 'province') || group.province,
    }))),
  ], []);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return locations
      .filter((location) => [location.sector, location.municipality, location.province].some((value) => value.toLowerCase().includes(term)))
      .filter((location, index, list) => list.findIndex((item) => item.sector === location.sector && item.municipality === location.municipality && item.province === location.province) === index)
      .slice(0, 50);
  }, [locations, search]);

  const selected = municipality && province;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">Ubicación de residencia</p>
          <p className="mt-1 text-sm text-gray-600">Selecciona tu sector, municipio y provincia.</p>
          <button type="button" onClick={onUseLocation} disabled={locationLoading} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
            <MapPin className="h-4 w-4" />
            {locationLoading ? 'Identificando ubicación...' : 'Usar mi ubicación'}
          </button>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busca un sector o municipio, por ejemplo Fantino"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {results.length > 0 && (
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                {results.map((location) => (
                  <button
                    type="button"
                    key={`${location.sector}-${location.municipality}-${location.province}`}
                    onClick={() => {
                      onChange(location);
                      setSearch('');
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50"
                  >
                    <span className="block text-sm font-bold text-gray-900">{location.sector || location.municipality}</span>
                    <span className="block text-xs text-gray-500">{location.municipality} · {location.province}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected ? (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <label className="rounded-lg bg-white px-3 py-2">
                <span className="block text-[11px] font-semibold uppercase text-gray-400">Sector</span>
                <input
                  value={sector}
                  onChange={(event) => onChange({ sector: event.target.value, municipality, province })}
                  placeholder="Escribe tu sector"
                  className="mt-1 w-full border-0 p-0 text-sm font-bold text-gray-800 outline-none placeholder:font-normal placeholder:text-gray-400"
                />
              </label>
              <LocationValue label="Municipio" value={municipality} />
              <LocationValue label="Provincia" value={province} />
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-amber-700">Selecciona una ubicación para completar estos datos.</p>
          )}
          <p className="mt-3 text-[11px] text-gray-500">Búsqueda local y ubicación aproximada mediante OpenStreetMap.</p>
        </div>
      </div>
    </div>
  );
}

function findCatalogValue(value: string, field: 'municipality' | 'province') {
  const normalized = normalizeLocationText(value);
  if (field === 'province' && normalized === 'baoruco') return 'Baoruco (Bahoruco)';
  return dominicanLocations.find((location) => normalizeLocationText(location[field]) === normalized)?.[field] || '';
}

function normalizeLocationText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function LocationValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white px-3 py-2"><span className="block text-[11px] font-semibold uppercase text-gray-400">{label}</span><span className="font-bold text-gray-800">{value}</span></div>;
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm font-semibold text-gray-700">{label}</p><p className="mt-2 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700">{value || 'N/D'}</p></div>;
}

function Alert({ message, tone }: { message: string; tone: 'error' | 'success' }) {
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>;
}
