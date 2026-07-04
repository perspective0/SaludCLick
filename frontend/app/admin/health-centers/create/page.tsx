'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI } from '@/utils/api';
import { 
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Image,
  Hash,
  AlertCircle,
  CheckCircle,
  Save,
  Upload,
  X
} from 'lucide-react';

export default function AdminCreateHealthCenterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    image: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    
    if (field === 'image' && value) {
      setImagePreview(value);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.createHealthCenter(form);
      setSuccess('Centro de salud creado exitosamente');
      setTimeout(() => {
        router.push('/admin/health-centers');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo crear el centro de salud.');
    } finally {
      setLoading(false);
    }
  };

  // Provincias de República Dominicana
  const provincias = [
    'Distrito Nacional',
    'Santo Domingo',
    'Santiago',
    'San Cristóbal',
    'La Altagracia',
    'La Romana',
    'San Pedro de Macorís',
    'Duarte',
    'Puerto Plata',
    'La Vega',
    'Monseñor Nouel',
    'Sánchez Ramírez',
    'María Trinidad Sánchez',
    'Hermanas Mirabal',
    'Espaillat',
    'Valverde',
    'Monte Cristi',
    'Dajabón',
    'Santiago Rodríguez',
    'Azua',
    'San Juan',
    'Elías Piña',
    'Barahona',
    'Bahoruco',
    'Independencia',
    'Pedernales',
    'El Seibo',
    'Hato Mayor',
    'Monte Plata',
    'Samaná',
    'San José de Ocoa',
    'Peravia'
  ];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/health-centers"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver a Centros de Salud</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Centro de Salud</h1>
            <p className="text-gray-500">
              Agrega un nuevo centro médico al sistema
            </p>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
              {/* Información Básica */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Información Básica
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Centro <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Centro de Salud Central"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <div className="relative">
                      <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                      <textarea
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Describe los servicios y especialidades del centro..."
                        rows={4}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Ubicación
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Av. Principal #123"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ciudad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="Santo Domingo"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provincia/Estado
                      </label>
                      <select
                        value={form.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar provincia</option>
                        {provincias.map((provincia) => (
                          <option key={provincia} value={provincia}>
                            {provincia}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <div className="relative">
                      <Hash className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.postal_code}
                        onChange={(e) => handleChange('postal_code', e.target.value)}
                        placeholder="10101"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  Información de Contacto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+1 809 123 4567"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="centro@ejemplo.com"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagen */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-blue-600" />
                  Imagen del Centro
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de la Imagen
                  </label>
                  <div className="relative">
                    <Globe className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.image}
                      onChange={(e) => handleChange('image', e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Vista previa de la imagen */}
                  {imagePreview && (
                    <div className="mt-4 relative">
                      <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={imagePreview}
                          alt="Vista previa del centro"
                          className="w-full h-full object-cover"
                          onError={() => setImagePreview('')}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          handleChange('image', '');
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vista previa */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Resumen del Centro</h3>
                </div>
                <div className="space-y-1 text-sm text-blue-800">
                  {form.name && <p><strong>Nombre:</strong> {form.name}</p>}
                  {form.city && <p><strong>Ciudad:</strong> {form.city}{form.state ? `, ${form.state}` : ''}</p>}
                  {form.phone && <p><strong>Teléfono:</strong> {form.phone}</p>}
                  {form.email && <p><strong>Email:</strong> {form.email}</p>}
                  {!form.name && !form.city && (
                    <p className="text-blue-600">Completa el formulario para ver el resumen</p>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <Link
                  href="/admin/health-centers"
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Crear Centro
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}