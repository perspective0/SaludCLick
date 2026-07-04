'use client';

import Link from 'next/link';
import { Shield, Lock, Eye, FileText, Bell, Cookie, Mail, Phone, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const lastUpdated = '20 de Mayo de 2026';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-16">
      <div className="container-main max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-blue-100 rounded-full mb-6">
            <Shield className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Política de Privacidad
          </h1>
          <p className="text-gray-500 text-sm">
            Última actualización: {lastUpdated}
          </p>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-12 space-y-8">
          {/* Introducción */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Introducción</h2>
                <p className="text-gray-600 leading-relaxed">
                  En <strong>SaludClick</strong>, valoramos y respetamos profundamente tu privacidad. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos tu información personal cuando utilizas nuestra plataforma de agendamiento de citas médicas.
                </p>
                <p className="text-gray-600 leading-relaxed mt-2">
                  Al utilizar nuestros servicios, aceptas las prácticas descritas en esta política. Si no estás de acuerdo con alguno de los términos aquí establecidos, te recomendamos no utilizar nuestra plataforma.
                </p>
              </div>
            </div>
          </section>

          {/* Información que recopilamos */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Información que Recopilamos</h2>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">2.1 Información de Registro</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                  <li>Nombre completo y apellidos</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Número de teléfono celular</li>
                  <li>Fecha de nacimiento</li>
                  <li>Número de identificación (DNI/CE/Pasaporte)</li>
                  <li>Dirección de residencia</li>
                  <li>Contraseña encriptada</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">2.2 Información Médica</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                  <li>Historial de citas médicas agendadas</li>
                  <li>Médicos y especialidades consultadas</li>
                  <li>Centros de salud visitados</li>
                  <li>Notas y razones de consulta proporcionadas voluntariamente</li>
                  <li>Alergias y condiciones médicas reportadas</li>
                  <li>Medicamentos actuales registrados</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">2.3 Datos de Uso de la Plataforma</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                  <li>Dirección IP y ubicación geográfica aproximada</li>
                  <li>Tipo de dispositivo y sistema operativo</li>
                  <li>Navegador web utilizado</li>
                  <li>Páginas visitadas dentro de la plataforma</li>
                  <li>Tiempo de sesión y actividad en la plataforma</li>
                  <li>Interacciones con funciones específicas</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">2.4 Información para Médicos</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Número de colegiatura y certificaciones profesionales</li>
                  <li>Especialidades médicas y experiencia laboral</li>
                  <li>Horarios de atención y disponibilidad</li>
                  <li>Centro de salud o consultorio afiliado</li>
                  <li>Tarifas de consulta y métodos de pago</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Uso de la información */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Cómo Utilizamos tu Información</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  La información recopilada se utiliza exclusivamente para los siguientes fines:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Gestión de citas médicas:</strong> Facilitar el agendamiento, modificación y cancelación de citas con profesionales de la salud.</li>
                  <li><strong>Comunicación:</strong> Enviar confirmaciones de citas, recordatorios automáticos por correo electrónico o SMS, y notificaciones importantes sobre el servicio.</li>
                  <li><strong>Verificación de identidad:</strong> Confirmar la identidad de pacientes y médicos para garantizar la seguridad de la plataforma.</li>
                  <li><strong>Mejora del servicio:</strong> Analizar patrones de uso para optimizar la experiencia del usuario y desarrollar nuevas funcionalidades.</li>
                  <li><strong>Cumplimiento legal:</strong> Cumplir con obligaciones legales y regulatorias aplicables al sector salud.</li>
                  <li><strong>Seguridad:</strong> Prevenir fraudes, actividades no autorizadas y garantizar la integridad de los datos médicos.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Protección de datos */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Lock className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Protección y Seguridad de tus Datos</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  En SaludClick implementamos medidas de seguridad técnicas y organizativas de nivel empresarial:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Encriptación de extremo a extremo:</strong> Utilizamos protocolos SSL/TLS 256-bit para todas las comunicaciones.</li>
                  <li><strong>Almacenamiento seguro:</strong> Los datos se almacenan en servidores certificados con cumplimiento HIPAA y GDPR.</li>
                  <li><strong>Acceso restringido:</strong> Solo personal autorizado puede acceder a información sensible bajo estrictos controles.</li>
                  <li><strong>Autenticación de dos factores (2FA):</strong> Disponible para todas las cuentas como capa adicional de seguridad.</li>
                  <li><strong>Auditorías periódicas:</strong> Realizamos evaluaciones de seguridad regulares y pruebas de penetración.</li>
                  <li><strong>Respaldo y recuperación:</strong> Sistemas de backup automáticos para prevenir pérdida de datos.</li>
                  <li><strong>Anonimización:</strong> Datos utilizados para análisis estadísticos son previamente anonimizados.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Compartir información */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Compartición de Información con Terceros</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  <strong>No vendemos ni comercializamos tus datos personales bajo ninguna circunstancia.</strong> La información solo se comparte en los siguientes casos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Con el médico o centro de salud:</strong> Al agendar una cita, compartimos la información necesaria con el profesional de salud correspondiente.</li>
                  <li><strong>Proveedores de servicios:</strong> Compartimos datos mínimos necesarios con servicios de envío de correos electrónicos, SMS y almacenamiento en la nube, todos bajo acuerdos de confidencialidad.</li>
                  <li><strong>Obligaciones legales:</strong> Cuando sea requerido por ley, orden judicial o autoridad competente.</li>
                  <li><strong>Consentimiento explícito:</strong> En cualquier otro caso, solicitaremos tu autorización previa y explícita.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Cookie className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Uso de Cookies y Tecnologías Similares</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Utilizamos cookies y tecnologías similares para mejorar tu experiencia:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento básico de la plataforma (sesión, seguridad).</li>
                  <li><strong>Cookies de preferencias:</strong> Recuerdan tus preferencias de idioma, tema y configuración regional.</li>
                  <li><strong>Cookies analíticas:</strong> Nos ayudan a entender cómo interactúas con la plataforma para mejorarla (datos anónimos).</li>
                  <li><strong>Cookies de funcionalidad:</strong> Permiten recordar tus búsquedas recientes y médicos favoritos.</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Puedes gestionar las cookies desde la configuración de tu navegador. Sin embargo, deshabilitar cookies esenciales puede afectar el funcionamiento de la plataforma.
                </p>
              </div>
            </div>
          </section>

          {/* Derechos del usuario */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Bell className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Tus Derechos como Usuario</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  De acuerdo con las leyes de protección de datos aplicables, tienes los siguientes derechos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Derecho de acceso:</strong> Solicitar una copia de todos los datos personales que tenemos sobre ti.</li>
                  <li><strong>Derecho de rectificación:</strong> Corregir información inexacta o incompleta en tu perfil.</li>
                  <li><strong>Derecho de supresión:</strong> Solicitar la eliminación de tus datos personales ("derecho al olvido").</li>
                  <li><strong>Derecho de oposición:</strong> Oponerte al procesamiento de tus datos para fines específicos.</li>
                  <li><strong>Derecho de portabilidad:</strong> Recibir tus datos en un formato estructurado y transferirlos a otro servicio.</li>
                  <li><strong>Derecho de limitación:</strong> Restringir el procesamiento de tus datos en ciertas circunstancias.</li>
                  <li><strong>Derecho a retirar consentimiento:</strong> Puedes retirar tu consentimiento en cualquier momento sin afectar la legalidad del procesamiento previo.</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Para ejercer cualquiera de estos derechos, contáctanos a través de los medios indicados en la sección de contacto. Responderemos a tu solicitud en un plazo máximo de 30 días calendario.
                </p>
              </div>
            </div>
          </section>

          {/* Retención de datos */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Retención de Datos</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Conservamos tu información personal solo durante el tiempo necesario para cumplir con los fines descritos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li><strong>Cuentas activas:</strong> Mientras mantengas tu cuenta activa en la plataforma.</li>
                  <li><strong>Historial médico:</strong> Hasta 10 años después de tu última cita, según regulaciones sanitarias.</li>
                  <li><strong>Datos de uso:</strong> Hasta 24 meses para fines analíticos y de mejora del servicio.</li>
                  <li><strong>Datos de facturación:</strong> Según lo requerido por las leyes tributarias (generalmente 5-7 años).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Menores de edad */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Privacidad de Menores de Edad</h2>
                <p className="text-gray-600 leading-relaxed">
                  SaludClick no está diseñado para menores de 18 años. No recopilamos intencionalmente información de menores. Si eres padre/madre o tutor y descubres que tu hijo nos ha proporcionado datos personales sin tu consentimiento, contáctanos inmediatamente para eliminar dicha información. Los menores de edad deben usar la plataforma bajo supervisión y consentimiento de sus padres o tutores legales.
                </p>
              </div>
            </div>
          </section>

          {/* Cambios a la política */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Bell className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Cambios a esta Política de Privacidad</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Nos reservamos el derecho de actualizar esta política periódicamente para reflejar cambios en nuestras prácticas o por razones legales. Te notificaremos sobre cambios significativos mediante:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Un aviso destacado en nuestra plataforma con 30 días de anticipación.</li>
                  <li>Notificación por correo electrónico a la dirección registrada en tu cuenta.</li>
                  <li>Actualización de la fecha de "Última actualización" al inicio de este documento.</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  El uso continuado de la plataforma después de la entrada en vigor de los cambios constituye tu aceptación de la política actualizada.
                </p>
              </div>
            </div>
          </section>

          {/* Contacto */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Contacto y Consultas</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Si tienes preguntas, inquietudes o deseas ejercer tus derechos sobre tus datos personales, no dudes en contactarnos:
                </p>
                <div className="space-y-3 bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">
                      <strong>Email:</strong>{' '}
                      <a href="mailto:francisco.leocadio@saludclick.com" className="text-blue-600 hover:underline">
                        francisco.leocadio@saludclick.com
                      </a>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">
                      <strong>Teléfono:</strong> +1 (829) 386-1067
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-1" />
                    <span className="text-gray-700">
                      <strong>Dirección:</strong> Santiago, República Dominicana.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Base legal */}
          <section>
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Base Legal del Tratamiento</h2>
                <p className="text-gray-600 leading-relaxed">
                  El tratamiento de tus datos personales se fundamenta en las siguientes bases legales:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mt-3">
                  <li><strong>Consentimiento explícito:</strong> Que otorgas al registrarte y aceptar esta política.</li>
                  <li><strong>Ejecución de contrato:</strong> Para proporcionarte los servicios de agendamiento de citas médicas.</li>
                  <li><strong>Obligación legal:</strong> Cumplimiento de normativas sanitarias y de protección de datos.</li>
                  <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y prevenir fraudes.</li>
                </ul>
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
            <Shield className="w-4 h-4" />
            Crear Cuenta Segura
          </Link>
        </div>
      </div>
    </div>
  );
}