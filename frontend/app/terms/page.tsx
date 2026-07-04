'use client';

import Link from 'next/link';
import { 
  FileText, 
  Shield, 
  Scale, 
  AlertTriangle, 
  Ban, 
  Clock, 
  CreditCard,
  UserCheck,
  Stethoscope,
  CalendarCheck,
  ClipboardList,
  Phone,
  Mail,
  ArrowLeft,
  CheckCircle,
  Globe,
  Lock,
  Users
} from 'lucide-react';

export default function TermsPage() {
  const lastUpdated = '20 de Mayo de 2026';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-16">
      <div className="container-main max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-blue-100 rounded-full mb-6">
            <Scale className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Términos y Condiciones
          </h1>
          <p className="text-gray-500 text-sm">
            Última actualización: {lastUpdated}
          </p>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-12 space-y-8">
          
          {/* 1. Aceptación de los Términos */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Aceptación de los Términos</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Bienvenido a <strong>SaludClick</strong> ("la Plataforma"). Al acceder, registrarte o utilizar 
                  nuestros servicios de agendamiento de citas médicas, aceptas estar legalmente vinculado por 
                  estos Términos y Condiciones.
                </p>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Si no estás de acuerdo con alguno de estos términos, no debes utilizar la Plataforma. 
                  Te recomendamos leer detenidamente este documento antes de crear una cuenta.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> Al utilizar SaludClick, confirmas que eres mayor de 18 años 
                      y tienes capacidad legal para aceptar estos términos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Descripción del Servicio */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Globe className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Descripción del Servicio</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  SaludClick es una plataforma digital que conecta pacientes con profesionales de la salud, 
                  facilitando el agendamiento de citas médicas. Nuestros servicios incluyen:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>Búsqueda de médicos por especialidad, ubicación y disponibilidad</li>
                  <li>Agendamiento, modificación y cancelación de citas médicas</li>
                  <li>Gestión de historial de citas para pacientes</li>
                  <li>Portal de gestión para profesionales de la salud</li>
                  <li>Recordatorios automáticos de citas por correo electrónico y SMS</li>
                  <li>Almacenamiento seguro de información médica básica</li>
                </ul>
                <div className="bg-blue-50 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      <strong>Aclaración importante:</strong> SaludClick <strong>NO</strong> es un servicio médico 
                      de emergencia. En caso de emergencia, contacta al 9-1-1 o acude al centro de salud más cercano.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Registro de Usuarios */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Users className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Registro y Cuentas de Usuario</h2>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">3.1 Tipos de Cuentas</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  SaludClick ofrece dos tipos de cuentas:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mb-4">
                  <li><strong>Pacientes:</strong> Acceso inmediato para buscar médicos y agendar citas</li>
                  <li><strong>Médicos:</strong> Sujeto a verificación de credenciales profesionales</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">3.2 Responsabilidades del Usuario</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mb-4">
                  <li>Proporcionar información veraz, precisa y actualizada</li>
                  <li>Mantener la confidencialidad de tu contraseña y credenciales de acceso</li>
                  <li>Notificar inmediatamente cualquier uso no autorizado de tu cuenta</li>
                  <li>No compartir tu cuenta con terceros</li>
                  <li>Ser responsable de todas las actividades realizadas con tu cuenta</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">3.3 Verificación de Médicos</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Los profesionales de la salud deben pasar por un proceso de verificación que incluye:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>Validación de número de colegiatura (Colegio Médico Dominicano)</li>
                  <li>Verificación de identidad (cédula de identidad)</li>
                  <li>Confirmación de especialidad y credenciales</li>
                  <li>Revisión de documentos profesionales</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Uso de la Plataforma */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Uso Aceptable de la Plataforma</h2>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">4.1 Usos Permitidos</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mb-4">
                  <li>Agendar, modificar y cancelar citas médicas legítimas</li>
                  <li>Consultar información de profesionales de la salud verificados</li>
                  <li>Gestionar tu historial de citas personales</li>
                  <li>Recibir recordatorios y notificaciones de tus citas</li>
                  <li>Comunicarte con profesionales de salud a través de la plataforma</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">4.2 Actividades Prohibidas</h3>
                <div className="space-y-3 text-gray-600 ml-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>Usar la plataforma para fines fraudulentos o ilegales</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>Suplantar la identidad de otro usuario o profesional de la salud</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>Publicar contenido falso, engañoso o difamatorio</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>Intentar acceder a datos de otros usuarios sin autorización</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>Utilizar bots, scrapers o herramientas automatizadas</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>Realizar spam o enviar comunicaciones no solicitadas</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Citas y Cancelaciones */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <CalendarCheck className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Política de Citas y Cancelaciones</h2>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">5.1 Agendamiento de Citas</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mb-4">
                  <li>Las citas se agendan según la disponibilidad mostrada por cada profesional</li>
                  <li>Recibirás una confirmación inmediata por correo electrónico</li>
                  <li>Se enviarán recordatorios 24 horas y 2 horas antes de la cita</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">5.2 Cancelaciones</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4 mb-4">
                  <li>Las cancelaciones deben realizarse con al menos 24 horas de anticipación</li>
                  <li>Cancelaciones tardías pueden estar sujetas a penalizaciones según la política del médico</li>
                  <li>Las cancelaciones repetitivas sin justificación pueden resultar en restricciones de la cuenta</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">5.3 Inasistencias</h3>
                <p className="text-gray-600 leading-relaxed ml-4">
                  Las inasistencias sin previo aviso serán registradas en tu historial. Después de 3 inasistencias 
                  consecutivas, tu cuenta puede ser suspendida temporalmente.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Responsabilidad Médica */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Stethoscope className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Responsabilidad Médica y Descargo</h2>
                
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Descargo de Responsabilidad Importante:</p>
                      <p>SaludClick es una plataforma de conexión y agendamiento. NO proporcionamos servicios 
                      médicos, diagnósticos, tratamientos ni recomendaciones médicas.</p>
                    </div>
                  </div>
                </div>

                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>Los profesionales de la salud son responsables de sus diagnósticos y tratamientos</li>
                  <li>SaludClick no garantiza la exactitud de la información proporcionada por los médicos</li>
                  <li>No nos hacemos responsables por daños derivados de la relación médico-paciente</li>
                  <li>Los pacientes deben verificar las credenciales de los profesionales antes de consultar</li>
                  <li>En caso de emergencia médica, contacta al 9-1-1 inmediatamente</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Privacidad y Datos */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Lock className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Privacidad y Protección de Datos</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  El manejo de tus datos personales se rige por nuestra{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                    Política de Privacidad
                  </Link>
                  , la cual forma parte integral de estos términos. Al utilizar SaludClick, aceptas:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>La recopilación y uso de tus datos según nuestra política de privacidad</li>
                  <li>El almacenamiento seguro de tu información médica básica</li>
                  <li>La comunicación por correo electrónico y SMS para recordatorios de citas</li>
                  <li>El uso de cookies para mejorar la experiencia de usuario</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 8. Propiedad Intelectual */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Propiedad Intelectual</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo pero no limitado a:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>El nombre "SaludClick" y su logotipo</li>
                  <li>El diseño, código fuente y arquitectura de la plataforma</li>
                  <li>Las bases de datos y algoritmos propietarios</li>
                  <li>El contenido original publicado por SaludClick</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Está prohibida la reproducción, distribución o modificación de cualquier elemento 
                  de la Plataforma sin autorización previa por escrito.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Tarifas y Pagos */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Tarifas y Pagos</h2>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">9.1 Para Pacientes</h3>
                <p className="text-gray-600 leading-relaxed mb-3 ml-4">
                  El registro y uso básico de SaludClick es <strong>completamente gratuito</strong> para pacientes. 
                  Las consultas médicas pueden tener costos establecidos por cada profesional, los cuales 
                  serán claramente indicados antes de confirmar la cita.
                </p>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">9.2 Para Médicos</h3>
                <p className="text-gray-600 leading-relaxed ml-4">
                  SaludClick puede cobrar una comisión por cita agendada a través de la plataforma, 
                  la cual será informada durante el proceso de registro y verificación.
                </p>
              </div>
            </div>
          </section>

          {/* 10. Suspensión y Terminación */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Ban className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Suspensión y Terminación de Cuentas</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  SaludClick se reserva el derecho de suspender o terminar cuentas en los siguientes casos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>Violación de estos Términos y Condiciones</li>
                  <li>Actividades fraudulentas o ilegales</li>
                  <li>Inasistencias repetitivas sin justificación (pacientes)</li>
                  <li>Mala praxis profesional reportada y verificada (médicos)</li>
                  <li>Suplantación de identidad o información falsa</li>
                  <li>Por solicitud expresa del titular de la cuenta</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 11. Modificaciones */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Modificaciones a los Términos</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  SaludClick puede modificar estos términos en cualquier momento. Te notificaremos sobre 
                  cambios significativos mediante:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>Un aviso destacado en la plataforma con 30 días de anticipación</li>
                  <li>Notificación por correo electrónico a la dirección registrada</li>
                  <li>Actualización de la fecha de "Última actualización" al inicio de este documento</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  El uso continuado de la plataforma después de los cambios constituye tu aceptación 
                  de los nuevos términos.
                </p>
              </div>
            </div>
          </section>

          {/* 12. Ley Aplicable */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Scale className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Ley Aplicable y Jurisdicción</h2>
                <p className="text-gray-600 leading-relaxed">
                  Estos Términos y Condiciones se rigen por las leyes de la República Dominicana. 
                  Cualquier disputa derivada del uso de la Plataforma será resuelta ante los tribunales 
                  competentes de la ciudad de Santo Domingo, República Dominicana.
                </p>
              </div>
            </div>
          </section>

          {/* 13. Contacto */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">13. Contacto</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Si tienes preguntas sobre estos Términos y Condiciones, contáctanos:
                </p>
                <div className="space-y-3 bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">
                      <strong>Email:</strong>{' '}
                      <a href="mailto:legal@saludclick.com" className="text-blue-600 hover:underline">
                        legal@saludclick.com
                      </a>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">
                      <strong>Teléfono:</strong> +1 829 386 1067
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-1" />
                    <span className="text-gray-700">
                      <strong>Dirección:</strong> Santo Domingo, República Dominicana
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Botones de navegación */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="px-6 py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio
          </Link>
          <Link 
            href="/register" 
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}