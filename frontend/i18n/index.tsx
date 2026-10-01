'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

export type Locale = 'es' | 'en';

const STORAGE_KEY = 'saludclick_locale';

const messages = {
  es: { language: 'Cambiar idioma', spanish: 'Cambiar a español', english: 'Cambiar a inglés', doctors: 'Médicos', healthCenters: 'Centros de Salud', about: 'Acerca de', login: 'Iniciar sesión', register: 'Registrarse', home: 'Inicio', contact: 'Contacto', faq: 'Preguntas frecuentes', searchDoctors: 'Buscar médicos', bookAppointment: 'Agendar cita', closeNotice: 'Cerrar aviso', installTitle: 'Lleva SaludClick contigo', installIos: 'Puedes guardarlo en tu iPhone. Toca Compartir y luego elige “Añadir a pantalla de inicio”.', installDevice: 'Guárdalo en tu dispositivo y abre SaludClick como cualquier otra aplicación.', installButton: 'Instalar SaludClick' },
  en: { language: 'Change language', spanish: 'Switch to Spanish', english: 'Switch to English', doctors: 'Doctors', healthCenters: 'Health centers', about: 'About us', login: 'Sign in', register: 'Create account', home: 'Home', contact: 'Contact', faq: 'Frequently asked questions', searchDoctors: 'Find doctors', bookAppointment: 'Book appointment', closeNotice: 'Close notice', installTitle: 'Take SaludClick with you', installIos: 'Save it to your iPhone. Tap Share, then choose “Add to Home Screen”.', installDevice: 'Save it to your device and open SaludClick like any other app.', installButton: 'Install SaludClick' },
} as const;

// Textos compartidos que todavía están escritos directamente en pantallas antiguas.
// Se mantienen aquí durante la migración progresiva de cada pantalla a `t(...)`.
const phrasePairs: Record<string, string> = {
  'Médicos': 'Doctors', 'Centros de Salud': 'Health centers', 'Acerca de': 'About us',
  'Iniciar sesión': 'Sign in', 'Iniciar Sesión': 'Sign in', 'Registrarse': 'Create account',
  'Contacto': 'Contact', 'Preguntas frecuentes': 'Frequently asked questions',
  'Buscar médicos': 'Find doctors', 'Agendar cita': 'Book appointment', 'Cerrar sesión': 'Sign out',
  'Cerrar Sesión': 'Sign out', 'Guardar': 'Save', 'Cancelar': 'Cancel', 'Editar': 'Edit',
  'Eliminar': 'Delete', 'Confirmar': 'Confirm', 'Volver': 'Back', 'Continuar': 'Continue',
  'Enviar': 'Submit', 'Buscar': 'Search', 'Filtrar': 'Filter', 'Cargando...': 'Loading...',
  'Guardar cambios': 'Save changes', 'No disponible': 'Not available', 'Sin registro': 'No record',
  'Fecha pendiente': 'Date pending', 'Sí': 'Yes', 'No': 'No', 'Aceptar': 'Accept',
  'Paciente': 'Patient', 'Médico': 'Doctor', 'Profesionales': 'Professionals',
  'Administración': 'Administration', 'Administrador': 'Administrator', 'Configuración': 'Settings',
  'Usuarios': 'Users', 'Citas médicas': 'Appointments', 'Reportes': 'Reports',
  'Laboratorios': 'Laboratories',
  'Especialistas destacados': 'Featured specialists', 'Notificaciones': 'Notifications',
  'Mi perfil': 'My profile', 'Historial médico': 'Medical records', 'Recetas': 'Prescriptions',
  'Privacidad': 'Privacy', 'Términos de uso': 'Terms of use', 'Siguiente': 'Next', 'Anterior': 'Previous',
  'En línea': 'Online', 'Presencial': 'In person', 'Virtual': 'Virtual',
  'Información protegida': 'Protected information', 'Atención conectada': 'Connected care',
  'Agenda sin fricción': 'Frictionless scheduling', 'Encuentra un médico': 'Find a doctor',
  'Horarios disponibles': 'Available times', 'Presencial o video': 'In person or video',
  'Especialidades': 'Specialties', 'Registro': 'Registration', 'Gratis': 'Free',
  'Paso': 'Step', 'Sobre nosotros': 'About us', 'Desarrollador': 'Developer',
  'Salud digital simple, segura y conectada': 'Simple, secure and connected digital health',
  'Tu salud, tu agenda y tus médicos en un solo lugar': 'Your health, your schedule and your doctors in one place',
  'Verificados': 'Verified', 'perfiles médicos': 'medical profiles', 'Simple': 'Simple',
  'agenda digital': 'digital scheduling', 'Flexible': 'Flexible', 'presencial o virtual': 'in person or virtual',
  'Informacion protegida': 'Protected information', 'Atencion conectada': 'Connected care',
  'Encuentra disponibilidad, confirma tu hora y recibe recordatorios automáticos desde una sola experiencia.': 'Find availability, confirm your time and receive automatic reminders in one seamless experience.',
  'Historial, recetas y atenciones quedan ordenadas con acceso seguro para pacientes y profesionales.': 'Records, prescriptions and visits stay organized with secure access for patients and professionals.',
  'Flujos preparados para consulta presencial, teleconsulta y seguimiento posterior a cada cita.': 'Workflows ready for in-person care, telehealth and follow-up after every appointment.',
  'SaludClick une pacientes, doctores y centros de salud con reservas rápidas, historial digital y una experiencia clara desde la primera búsqueda.': 'SaludClick connects patients, doctors and health centers with fast bookings, digital records and a clear experience from the very first search.',
  'Agendar ahora': 'Book now', 'Ver médicos': 'View doctors', 'Busca atención': 'Find care',
  'Experiencia completa': 'Complete experience',
  'Más que agendar: todo el recorrido médico se siente ordenado': 'More than scheduling: your entire healthcare journey feels organized',
  'Busca por especialidad o centro médico': 'Search by specialty or health center',
  'Elige el horario que mejor calza contigo': 'Choose the time that works best for you',
  'Recibe confirmacion, recordatorio e historial': 'Receive confirmations, reminders and records',
  'Medicos destacados': 'Featured doctors', 'Elige con confianza y agenda en segundos': 'Choose with confidence and book in seconds',
  'Tarjetas claras, disponibilidad visible y acciones directas para que el paciente avance sin perderse.': 'Clear profiles, visible availability and direct actions so patients can move forward with confidence.',
  'Explorar especialistas': 'Explore specialists', 'Selecciona médicos destacados desde el panel de administrador.': 'Select featured doctors from the administrator panel.',
  'Respuestas claras antes de dar el siguiente paso': 'Clear answers before taking the next step',
  'Lo esencial sobre búsqueda, citas, teleconsulta, historial y privacidad en SaludClick.': 'Everything you need to know about search, appointments, telehealth, records and privacy at SaludClick.',
  'Empieza hoy a cuidar tu salud con menos vueltas': 'Start taking care of your health today, with less hassle',
  'Crea tu cuenta, encuentra un especialista y deja que SaludClick mantenga el resto ordenado.': 'Create your account, find a specialist and let SaludClick keep the rest organized.',
  'Crear cuenta gratis': 'Create a free account', 'Tu siguiente paso': 'Your next step',
  'Tu salud merece una agenda que sí te siga el ritmo.': 'Your health deserves a schedule that keeps up with you.',
  'Encuentra atención, elige tu horario y mantén todo tu recorrido médico organizado.': 'Find care, choose your time and keep your entire healthcare journey organized.',
  'Encontrar un médico': 'Find a doctor', 'La forma más clara de encontrar atención médica, organizar tus citas y mantener tu salud en movimiento.': 'The clearest way to find care, organize appointments and keep your health moving.',
  'Perfiles verificados': 'Verified profiles', 'Agenda simple': 'Simple scheduling', 'Para pacientes': 'For patients',
  'Unirme como médico': 'Join as a doctor', 'Acceso profesional': 'Professional access', 'Conoce SaludClick': 'Learn about SaludClick',
  'Alianzas y soporte': 'Partnerships and support', 'Estamos para ayudarte': 'We are here to help',
  '¿Tienes una pregunta sobre tu cuenta o una cita?': 'Have a question about your account or an appointment?',
  'Bienvenido de vuelta': 'Welcome back', 'Accede a tu cuenta para gestionar tus citas médicas, consultar tu historial y conectarte con profesionales de la salud.': 'Sign in to manage your appointments, view your records and connect with healthcare professionals.',
  'Acceso seguro a tu historial médico': 'Secure access to your medical records', 'Gestiona tus citas en un solo lugar': 'Manage your appointments in one place',
  'Conecta con +500 profesionales verificados': 'Connect with 500+ verified professionals', 'Protegido con encriptación AES-256 y SSL/TLS': 'Protected with AES-256 and SSL/TLS encryption',
  'Ingresa tus credenciales para acceder': 'Enter your credentials to continue', 'Correo Electrónico': 'Email address', 'Contraseña': 'Password',
  'Recuérdame': 'Remember me', '¿Olvidaste tu contraseña?': 'Forgot your password?', 'Iniciando sesión...': 'Signing in...',
  '¿No tienes cuenta?': 'Don’t have an account?', 'Regístrate aquí': 'Sign up here', '¿Eres nuevo? Regístrate como:': 'New here? Sign up as:',
  'Conexión segura mediante SSL/TLS': 'Secure connection through SSL/TLS',
  'Crear Cuenta': 'Create account', 'Registro de Médico': 'Doctor registration', 'Completa tus datos para unirte a nuestra red': 'Complete your details to join our network',
  'Regístrate para comenzar a agendar citas': 'Sign up to start booking appointments', 'Nombre': 'First name', 'Apellido': 'Last name',
  'Correo electronico': 'Email address', 'Teléfono': 'Phone', 'Cédula': 'National ID', 'Especialidad': 'Specialty',
  'Selecciona tu especialidad': 'Select your specialty', 'Número de exequatur': 'Professional license number', 'Centro o clínica': 'Health center or clinic',
  'Selecciona un centro': 'Select a center', 'Otro...': 'Other...', 'Nombre del centro o clínica': 'Health center or clinic name',
  'Mínimo 8 caracteres': 'At least 8 characters', 'Confirmar Contraseña': 'Confirm password',
  'Repite tu contraseña': 'Repeat your password', 'Acepto los': 'I accept the', 'términos y condiciones': 'terms and conditions',
  'y la': 'and the', 'política de privacidad': 'privacy policy', 'Creando cuenta...': 'Creating account...', 'Solicitar Acceso': 'Request access',
  '¿Ya tienes cuenta?': 'Already have an account?', 'Protegido por encriptación SSL 256-bit': 'Protected by 256-bit SSL encryption',
  'Conecta con pacientes, gestiona tus citas y haz crecer tu práctica médica con nuestra plataforma.': 'Connect with patients, manage your appointments and grow your medical practice with our platform.',
  'Agenda citas médicas, gestiona tu historial y conecta con los mejores profesionales de la salud.': 'Book medical appointments, manage your records and connect with leading healthcare professionals.',
  'Acceso a +500 médicos verificados': 'Access to 500+ verified doctors', 'Agendamiento en segundos': 'Book in seconds',
  'Historial médico digital seguro': 'Secure digital medical records', 'Gestión inteligente de citas': 'Smart appointment management',
  'Portal profesional personalizado': 'Personalized professional portal', 'Conecta con nuevos pacientes': 'Connect with new patients',
  'Tus datos están protegidos con encriptación de grado médico': 'Your data is protected with medical-grade encryption',
  'Tu nombre': 'Your name', 'Motivo del mensaje': 'Message subject',
  'Únete como Profesional de la Salud': 'Join as a healthcare professional', 'Comienza tu Viaje de Salud': 'Start your healthcare journey',
  'Se validará junto a tu nombre completo usando la fuente oficial del SNS cuando esté disponible.': 'It will be verified together with your full name using the official SNS source when available.',
  'Si eliges Otro..., al completar tu perfil podrás seleccionar un centro existente o solicitar/crear uno nuevo.': 'If you choose Other..., you can select an existing center or request/create a new one when completing your profile.',
  'Debes aceptar los términos y condiciones': 'You must accept the terms and conditions', 'Las contraseñas no coinciden': 'Passwords do not match',
  'La contraseña debe tener al menos 8 caracteres': 'The password must be at least 8 characters', 'Debes seleccionar tu especialidad': 'You must select your specialty',
  'Debes indicar tu número de exequatur para validar tu información médica': 'You must provide your professional license number to verify your medical information',
  'Selecciona un centro existente o marca "Otro..." si no aparece': 'Select an existing center or choose "Other..." if it is not listed',
  'Saltar al contenido': 'Skip to content',
  '¿Necesito registrarme para buscar médicos?': 'Do I need to sign up to search for doctors?',
  'Puedes explorar médicos y especialidades desde la pantalla principal. Para agendar, confirmar citas y ver tu historial, necesitas crear una cuenta de paciente.': 'You can explore doctors and specialties from the home page. To book, confirm appointments and view your records, you need a patient account.',
  '¿SaludClick ofrece consultas médicas directamente?': 'Does SaludClick provide medical consultations directly?',
  'SaludClick conecta pacientes con profesionales y centros de salud. La atención, el diagnóstico y el tratamiento siempre dependen del médico que selecciones.': 'SaludClick connects patients with healthcare professionals and health centers. Care, diagnosis and treatment always depend on the doctor you choose.',
  '¿Puedo agendar citas presenciales y teleconsultas?': 'Can I book in-person appointments and telehealth visits?',
  'Sí. La disponibilidad depende de cada médico o centro, y en la cita podrás ver si la atención es presencial, virtual o ambas modalidades.': 'Yes. Availability depends on each doctor or center, and the appointment will show whether care is in person, virtual or both.',
  '¿Dónde veo mis recetas e historial?': 'Where can I see my prescriptions and records?',
  'Al iniciar sesión como paciente tendrás acceso a tus citas, recetas, perfil e información médica organizada desde tu panel.': 'When you sign in as a patient, you can access your appointments, prescriptions, profile and organized medical information from your dashboard.',
  '¿Mis datos personales y de seguro son visibles para todos?': 'Can everyone see my personal and insurance information?',
  'No. Esa información se muestra solo al médico y al personal autorizado relacionado con tu cita, para facilitar la atención y la gestión administrativa.': 'No. This information is shown only to the doctor and authorized staff involved in your appointment, to support care and administration.',
  // Dashboards and authenticated areas
  'Panel Admin': 'Admin panel', 'Panel medico': 'Doctor panel', 'Portal medico': 'Doctor portal', 'Portal Médico': 'Doctor portal',
  'Portal del paciente': 'Patient portal', 'Tu salud': 'Your health', 'Inicio': 'Home', 'Citas': 'Appointments',
  'Documentos': 'Documents', 'Perfil': 'Profile', 'Ayuda y sugerencias': 'Help and feedback', 'Equipo de apoyo': 'Support team',
  'Citas medicas': 'Appointments', 'Registros medicos': 'Medical records', 'Documentos medicos': 'Medical documents',
  'Analiticas y estudios': 'Labs and studies', 'Preguntas y recomendaciones': 'Feedback and suggestions', 'Perfil profesional': 'Professional profile',
  'Solicitudes Médicos': 'Doctor requests', 'Pagos Médicos': 'Doctor payments',
  'Citas médicas próximas': 'Upcoming appointments', 'Citas médicas completadas': 'Completed appointments', 'Citas médicas realizadas': 'Completed appointments',
  'Citas médicas totales': 'Total appointments', 'Total de citas médicas': 'Total appointments', 'Tus citas médicas': 'Your appointments',
  'Próxima cita': 'Next appointment', 'Proxima atencion': 'Next visit', 'Sin citas próximas': 'No upcoming appointments',
  'Cargando citas...': 'Loading appointments...', 'No tienes citas agendadas': 'You have no scheduled appointments', 'No hay citas para esta vista': 'No appointments for this view',
  'No se encontraron citas': 'No appointments found', 'Nueva cita': 'New appointment', 'Agendar Nueva Cita': 'Book a new appointment',
  'Buscar Médicos': 'Find doctors', 'Médicos disponibles': 'Available doctors', 'No se encontraron médicos': 'No doctors found',
  'Administra laboratorios clínicos y sus servicios disponibles.': 'Manage clinical laboratories and their available services.',
  'Agrega estudios para verlos aqui.': 'Add studies to see them here.', 'No hay laboratorios': 'No laboratories found',
  'No hay pacientes para mostrar': 'No patients to display', 'No se encontraron usuarios': 'No users found', 'No se encontraron pagos': 'No payments found',
  'No hay solicitudes': 'No requests found', 'No hay documentos disponibles': 'No documents available', 'No hay recetas disponibles': 'No prescriptions available',
  'No hay notificaciones por ahora.': 'No notifications right now.', 'No tienes notificaciones pendientes.': 'You have no pending notifications.',
  'Cargando perfil...': 'Loading profile...', 'Cargando documento...': 'Loading document...', 'Cargando receta...': 'Loading prescription...',
  'Acciones': 'Actions', 'Acción': 'Action', 'Estado': 'Status', 'Fecha': 'Date', 'Hora': 'Time', 'Detalles': 'Details', 'Descripción': 'Description',
  'Resultados': 'Results', 'Total': 'Total', 'Activos': 'Active', 'Pendientes': 'Pending', 'Pendiente': 'Pending', 'Completadas': 'Completed',
  'Canceladas': 'Cancelled', 'Aprobadas': 'Approved', 'Pagado': 'Paid', 'Pagados': 'Paid', 'Por validar': 'Pending validation',
  'Agregar otro centro': 'Add another center', 'Crear Centro de Salud': 'Create health center', 'Editar Centro de Salud': 'Edit health center',
  'Crear Nuevo Usuario': 'Create new user', 'Editar usuario': 'Edit user', 'Eliminar usuario': 'Delete user', 'Eliminar laboratorio': 'Delete laboratory',
  'Cancelar cita': 'Cancel appointment', 'Mantener cita': 'Keep appointment', 'Rechazar Solicitud': 'Reject request', 'Abrir imagen': 'Open image',
  'Nombre:': 'Name:', 'Dirección': 'Address', 'Ciudad:': 'City:', 'Provincia/Estado': 'State/Province', 'Código Postal': 'Postal code',
  'Fecha de Registro': 'Registration date', 'Datos personales': 'Personal information', 'Contacto de emergencia': 'Emergency contact',
  'Seguro médico': 'Health insurance', '¿Tienes seguro médico?': 'Do you have health insurance?', 'Años de experiencia': 'Years of experience',
  'Biografia profesional': 'Professional biography', 'Foto publica': 'Public photo', 'Asi te veran los pacientes': 'This is how patients will see you',
  'Configuracion profesional': 'Professional settings', 'Configuracion publica': 'Public settings', 'Cambiar contraseña': 'Change password',
  'Autenticación de Dos Factores (2FA)': 'Two-factor authentication (2FA)', 'Modo Oscuro': 'Dark mode', 'Activar tema oscuro en la plataforma': 'Enable dark mode on the platform',
  'Modo Mantenimiento': 'Maintenance mode', 'Registro manual': 'Manual registration',
  'Nuevo paciente de consultorio': 'New office patient', 'Paciente en consulta': 'Patient in consultation', 'Selecciona un paciente': 'Select a patient',
  'Consulta en curso': 'Consultation in progress', 'Nueva consulta': 'New consultation', 'Historia clinica SOAP': 'SOAP clinical history',
  'Evolucion clinica': 'Clinical progress', 'Motivo de Consulta': 'Reason for visit', 'Signos vitales': 'Vital signs',
  'Alergias visibles': 'Visible allergies', 'Antecedentes conocidos': 'Known medical history', 'Tratamiento:': 'Treatment:',
  'No hay alergias activas registradas por tus médicos.': 'No active allergies have been recorded by your doctors.',
  'Receta médica': 'Medical prescription', 'Receta medica digital': 'Digital prescription', 'Historial de recetas': 'Prescription history',
  'Historial de documentos': 'Document history', 'Emitir con sello digital': 'Issue with digital seal', 'Firma medica': 'Medical signature',
  'Firmada electronicamente': 'Electronically signed', 'Requiere receta': 'Prescription required', 'Buscando en vademecum...': 'Searching drug reference...',
  'Buscar medicamento': 'Search medication', 'Laboratorio sugerido': 'Suggested laboratory', 'Estudios': 'Studies', 'Centro de Salud': 'Health center',
  'Recetas medicas profesionales, verificables e imprimibles': 'Professional, verifiable and printable prescriptions',
  'Medicamentos frecuentes': 'Common medications',
  'Historial': 'History', 'Sin recetas para este paciente.': 'No prescriptions for this patient.',
  'Nueva receta': 'New prescription', 'Nueva': 'New', 'Registro medico asociado': 'Associated medical record',
  'Selecciona un registro medico': 'Select a medical record', 'Notas generales': 'General notes',
  'Indicaciones generales para el paciente': 'General instructions for the patient', 'Fecha de vencimiento': 'Expiration date',
  'Centro de salud para la receta': 'Health center for the prescription', 'Medicamento': 'Medication', 'Presentacion': 'Presentation',
  'Dosis': 'Dosage', 'Via': 'Route', 'Frecuencia': 'Frequency', 'Duracion': 'Duration', 'Cantidad': 'Quantity',
  'Indicaciones': 'Instructions', 'Agregar medicamento': 'Add medication', 'Guardar receta': 'Save prescription',
  'Guardando...': 'Saving...', 'Receta creada correctamente.': 'Prescription created successfully.',
  'Agregar al menos un medicamento.': 'Add at least one medication.',
  'Confirma las advertencias del vademecum antes de guardar la receta.': 'Confirm the drug reference warnings before saving the prescription.',
  'La receta incluye medicamento controlado. Confirma que cumple los requisitos clinicos y regulatorios.': 'This prescription includes a controlled medication. Confirm that it meets clinical and regulatory requirements.',
  'Receta anulada.': 'Prescription cancelled.', 'Anular receta': 'Cancel prescription', 'Duplicar receta': 'Duplicate prescription',
  'Imprimir': 'Print', 'Descargar PDF': 'Download PDF', 'Vista previa': 'Preview', 'Receta medica': 'Prescription',
  'Sin medicamentos registrados': 'No medications recorded', 'Agregar medicamentos para previsualizar la receta.': 'Add medications to preview the prescription.',
  'Posologias sugeridas': 'Suggested dosing', 'Advertencias': 'Warnings', 'Favoritos': 'Favorites', 'Recientes': 'Recent',
  'Sin medicamentos.': 'No medications.', 'Selecciona un medicamento del buscador para ver su ficha rapida.': 'Select a medication from the search to view its quick details.',
  'Código': 'Code', 'Vence': 'Expires', 'Ver receta': 'View prescription',
  'Detalle de receta': 'Prescription details', 'Información segura para consulta e impresión': 'Secure information for review and printing',
  'Fecha emisión': 'Issue date', 'Diagnóstico asociado': 'Associated diagnosis', 'No especificado': 'Not specified',
  'No hay medicamentos detallados.': 'No detailed medications.', 'Código de validación': 'Validation code',
  'Generando...': 'Generating...', 'Imprimir / guardar PDF': 'Print / save PDF',
  'La impresión usa el HTML seguro del backend y requiere tu sesión activa.': 'Printing uses the secure backend HTML and requires an active session.',
  'Receta no encontrada.': 'Prescription not found.', 'No se pudo cargar la receta.': 'Could not load the prescription.',
  'No tienes permiso para acceder a esta receta.': 'You do not have permission to access this prescription.',
  'Vademecum': 'Drug reference', 'Consulta medicamentos, presentaciones, sugerencias y advertencias': 'Browse medications, presentations, suggestions and warnings',
  'Nombre comercial, principio activo, concentracion o laboratorio': 'Brand name, active ingredient, strength or laboratory',
  'Buscando...': 'Searching...', 'Escribe al menos dos caracteres para buscar.': 'Type at least two characters to search.',
  'Ficha rapida': 'Quick details', 'Agregar a favoritos': 'Add to favorites',
  'Selecciona un medicamento para ver su informacion.': 'Select a medication to view its information.',
  'Disponible RD': 'Available in the Dominican Republic',
  'Laboratorio': 'Laboratory', 'Categoria': 'Category', 'Registro sanitario': 'Health registration',
  'Controlado': 'Controlled',
  'Sin concentracion': 'No strength', 'Ficha del vademecum': 'Drug reference details',
  'No hay posologias o advertencias adicionales registradas para este medicamento.': 'No additional dosing or warnings are registered for this medication.',
  'Ordenes medicas para laboratorio, imagenes y procedimientos': 'Medical orders for laboratories, imaging and procedures',
  'Frecuentes': 'Common', 'Sin ordenes para este paciente.': 'No orders for this patient.',
  'Nuevo documento': 'New document', 'Sin registro asociado': 'No associated record',
  'Libre eleccion': 'Free choice', 'Tipo': 'Type', 'Prioridad': 'Priority',
  'Rutina': 'Routine', 'Urgente': 'Urgent', 'Centro emisor': 'Issuing center', 'Nuevo estudio': 'New study',
  'Nombre del estudio': 'Study name', 'Instrucciones para el paciente': 'Instructions for the patient',
  'Agregar estudio': 'Add study', 'Guardar orden': 'Save order', 'Guardando orden...': 'Saving order...',
  'Orden creada correctamente.': 'Order created successfully.', 'Orden anulada.': 'Order cancelled.',
  'Sin estudios registrados.': 'No studies recorded.', 'Estudios solicitados': 'Requested studies',
  'Orden medica': 'Medical order', 'Orden de laboratorio': 'Laboratory order', 'Orden de imagen': 'Imaging order',
  'Procedimiento': 'Procedure', 'En proceso': 'In progress', 'Completado': 'Completed',
  'Anulado': 'Cancelled', 'Imprimir orden': 'Print order', 'Descargar orden': 'Download order',
  'Duplicar orden': 'Duplicate order', 'Anular orden': 'Cancel order',
  'Selecciona un estudio para ver su informacion.': 'Select a study to view its information.',
  'No se pudo cargar la informacion inicial.': 'Could not load the initial information.',
  'No se pudieron cargar las ordenes del paciente.': 'Could not load the patient orders.',
  'No se pudo guardar la orden.': 'Could not save the order.', 'No se pudo anular la orden.': 'Could not cancel the order.',
  'No se pudo imprimir la orden.': 'Could not print the order.', 'Cargando orden...': 'Loading order...',
  'Documentos médicos': 'Medical documents', 'Certificados, referimientos e incapacidades': 'Certificates, referrals and medical leave',
  'Certificado medico': 'Medical certificate', 'Constancia medica': 'Medical attestation', 'Referimiento': 'Referral', 'Incapacidad': 'Medical leave',
  'Tipo de certificado': 'Certificate type', 'Tipo de constancia': 'Attestation type', 'Especialidad / destino': 'Specialty / destination',
  'Periodo': 'Period', 'Texto del certificado': 'Certificate text', 'Texto de la constancia': 'Attestation text',
  'Motivo / indicaciones': 'Reason / instructions', 'Condicion de salud, aptitud, reposo...': 'Health condition, fitness, leave...',
  'Asistencia a consulta, evaluacion...': 'Visit attendance, evaluation...', 'Cardiologia, endocrinologia...': 'Cardiology, endocrinology...',
  '3 dias, 5 dias...': '3 days, 5 days...', 'Textos frecuentes': 'Frequent text', 'Sin documentos para este paciente.': 'No documents for this patient.',
  'Certificados médicos': 'Medical certificates', 'Referimientos': 'Referrals',
  'Incapacidad medica': 'Medical leave', 'Referimiento medico': 'Medical referral',
  'Codigo CIE-10': 'ICD-10 code', 'Contenido del documento': 'Document content',
  'Titulo': 'Title', 'Sello digital': 'Digital seal', 'Guardar documento': 'Save document',
  'Imprimir documento': 'Print document', 'Duplicar documento': 'Duplicate document',
  'Anular documento': 'Cancel document', 'Documento creado correctamente.': 'Document created successfully.',
  'Documento anulado.': 'Document cancelled.', '¿Anular este documento?': 'Cancel this document?',
  'No se pudo guardar el documento.': 'Could not save the document.', 'No se pudo anular el documento.': 'Could not cancel the document.',
  'No se pudo cargar el documento.': 'Could not load the document.',
  'No se pudo imprimir el documento.': 'Could not print the document.', 'No hay documentos disponibles.': 'No documents available.',
  'Asocia secretarias existentes o crea nuevas cuentas': 'Link existing assistants or create new accounts',
  'No se pudo cargar el equipo de apoyo.': 'Could not load the support team.', 'Trabajando con': 'Working with',
  'Sin medico asignado': 'No doctor assigned', 'Centro no asignado': 'No center assigned', 'Seleccionar medico': 'Select doctor',
  'Sin medicos asignados': 'No doctors assigned', 'medico': 'doctor', 'medicos': 'doctors',
  'Citas hoy': 'Appointments today', 'Por confirmar': 'To be confirmed', 'Agenda visible': 'Visible schedule',
  'Agenda de': 'Schedule for', 'medico asignado': 'assigned doctor', 'Confirma, reagenda y revisa citas medicas': 'Confirm, reschedule and review appointments',
  'Registrar paciente': 'Register patient', 'Buscar paciente...': 'Search patient...',
  'Secretarias': 'Assistants', 'Agregar secretaria': 'Add assistant', 'Crear cuenta de apoyo': 'Create support account',
  'Asociar secretaria existente': 'Link existing assistant', 'Telefono': 'Phone',
  'Contrasena temporal': 'Temporary password', 'Crear y asociar': 'Create and link', 'Asociar': 'Link',
  'Buscar secretaria por correo': 'Search assistant by email', 'No hay secretarias asociadas.': 'No assistants linked.',
  'Secretaria creada y asociada.': 'Assistant created and linked.', 'Secretaria existente asociada.': 'Existing assistant linked.',
  'No se pudo asociar la secretaria.': 'Could not link the assistant.', 'No se pudo crear o asociar la secretaria.': 'Could not create or link the assistant.',
  'Cita actualizada.': 'Appointment updated.', 'Cita reagendada.': 'Appointment rescheduled.', 'Cita cancelada.': 'Appointment cancelled.',
  'Agregar al equipo': 'Add to team', 'Assistants assigned': 'Assistants assigned', 'Asistentes asignadas': 'Assigned assistants',
  'Correo': 'Email', 'Contraseña temporal opcional': 'Optional temporary password', 'Crear o asociar secretaria': 'Create or link assistant',
  'Asignada:': 'Assigned:', 'Quitar': 'Remove', 'No hay secretarias asociadas': 'No assistants linked',
  'Informacion visible para pacientes y equipo administrativo': 'Information visible to patients and the administrative team',
  'Valoracion': 'Rating', 'Sin precio': 'No price', 'Sin valoracion': 'No rating',
  'completo': 'complete', 'Completa la informacion para mejorar conversion de reservas.': 'Complete the information to improve booking conversions.',
  'Falta biografia': 'Biography missing', 'Faltan especialidades': 'Specialties missing', 'Falta foto': 'Photo missing', 'Faltan horarios': 'Schedule missing', 'Faltan documentos': 'Documents missing',
  'Especialidad pendiente': 'Specialty pending', 'Agrega una biografia profesional para tu perfil publico.': 'Add a professional biography to your public profile.',
  'Subir foto': 'Upload photo',
  'Esta imagen se mostrara en el listado de medicos, perfil publico y reservas.': 'This image will appear in the doctor directory, public profile and bookings.',
  'Logo para recetas': 'Prescription logo', 'Subir logo': 'Upload logo', 'Quitar logo': 'Remove logo', 'Se guarda en tu perfil y saldra en recetas impresas y PDF.': 'It is saved to your profile and will appear on printed prescriptions and PDFs.',
  'Sello para recetas y ordenes': 'Seal for prescriptions and orders', 'Subir sello': 'Upload seal', 'Quitar sello': 'Remove seal', 'Si no se sube una imagen, el documento mostrara el espacio de sello vacio.': 'If no image is uploaded, the document will show an empty seal area.',
  'Centros/clinicas donde trabajas': 'Health centers/clinics where you work', 'No asignado': 'Not assigned', 'Ciudad no indicada': 'City not provided', 'Centro principal': 'Primary center',
  'Mi centro no aparece': 'My center is not listed', 'Correo del centro': 'Center email',
  'Describe tu experiencia, enfoque clinico y servicios...': 'Describe your experience, clinical approach and services...',
  'Configuración profesional actualizada correctamente.': 'Professional settings updated successfully.', 'Foto de perfil actualizada.': 'Profile photo updated.',
  'Logo de recetas actualizado.': 'Prescription logo updated.', 'Sello de recetas actualizado.': 'Prescription seal updated.',
  'No se pudo cargar el perfil profesional.': 'Could not load the professional profile.', 'No se pudo actualizar el perfil.': 'Could not update the profile.',
  'Solo se permiten imagenes para los documentos.': 'Only images are allowed for documents.', 'Cada documento debe pesar 4MB o menos.': 'Each document must be 4 MB or less.',
  'Preguntas y Recomendaciones': 'Questions and recommendations',
  'Pregunta': 'Question', 'Recomendación': 'Recommendation', 'Preguntas': 'Questions', 'Recomendaciones': 'Recommendations',
  'Nuevo': 'New', 'En revisión': 'Under review', 'Resuelto': 'Resolved', 'Archivado': 'Archived',
  'Todos': 'All', 'Estados': 'Statuses', 'Audiencia': 'Audience', 'General': 'General', 'Pacientes': 'Patients', 'Doctores': 'Doctors',
  'Buscar por asunto, mensaje o usuario...': 'Search by subject, message or user...', 'No hay entradas para mostrar': 'No entries to display',
  'Usuario no disponible': 'User unavailable', 'Sin correo': 'No email', 'Sin correo registrado': 'No email registered',
  'Respuesta o nota interna': 'Response or internal note', 'Escribe la respuesta o seguimiento...': 'Write the response or follow-up...',
  'Guardar respuesta': 'Save response', 'No se pudo cargar el buzón.': 'Could not load the inbox.', 'No se pudo actualizar la entrada.': 'Could not update the entry.',
  'Horarios configurados': 'Configured schedules', 'Disponibilidad': 'Availability', 'Horario por centro/clinica': 'Schedule by center/clinic',
  'Buzón central para solicitudes, ideas y comentarios de usuarios': 'Central inbox for requests, ideas and user comments',
  'Cuando pacientes o doctores envíen mensajes aparecerán aquí.': 'Messages from patients and doctors will appear here.',
  'Total Centros': 'Total health centers', 'Total Solicitudes': 'Total requests', 'Revisa tu correo': 'Check your email',
  'Redirigiendo al panel administrativo...': 'Redirecting to the admin panel...',
};

const reversePhrasePairs = Object.fromEntries(Object.entries(phrasePairs).map(([es, en]) => [en, es]));

function translateRenderedText(locale: Locale) {
  if (typeof document === 'undefined') return;
  const dictionary = locale === 'en' ? phrasePairs : reversePhrasePairs;
  const entries = Object.entries(dictionary).sort(([a], [b]) => b.length - a.length);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  nodes.forEach((textNode) => {
    const parent = textNode.parentElement;
    if (!parent || parent.closest('[translate="no"], script, style, textarea, input')) return;
    const value = textNode.nodeValue || '';
    const trimmed = value.trim();
    const normalized = trimmed.replace(/\s+/g, ' ');
    const translated = dictionary[normalized];
    if (translated) {
      const leading = value.match(/^\s*/)?.[0] || '';
      const trailing = value.match(/\s*$/)?.[0] || '';
      textNode.nodeValue = `${leading}${translated}${trailing}`;
      return;
    }

    // También traduce frases dentro de nodos que contienen iconos, saltos de línea
    // o texto adicional generado por la misma vista.
    let nextValue = value;
    for (const [source, target] of entries) {
      if (nextValue.includes(source)) nextValue = nextValue.split(source).join(target);
    }
    if (nextValue !== value) textNode.nodeValue = nextValue;
  });

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[placeholder]').forEach((field) => {
    if (field.closest('[translate="no"]')) return;
    const placeholder = field.getAttribute('placeholder');
    if (placeholder && dictionary[placeholder]) field.setAttribute('placeholder', dictionary[placeholder]);
  });
}
type MessageKey = keyof typeof messages.es;
type I18nContextValue = { locale: Locale; ready: boolean; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string };
const I18nContext = createContext<I18nContextValue | null>(null);

function readLocale(): Locale {
  try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setLocaleState(readLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Traduce una sola vez después de la hidratación o del cambio de idioma.
    // No usamos MutationObserver: React actualiza el DOM constantemente y observarlo
    // de forma continua puede bloquear interacciones en páginas grandes.
    const translateNow = () => translateRenderedText(locale);
    // Las vistas autenticadas suelen pintar datos después de la respuesta de la API.
    // Estos pequeños pases cubren ese contenido sin observar cada mutación del DOM,
    // evitando el retraso de clics que provocaba el observador anterior.
    const timers = [0, 300, 1000].map((delay) => window.setTimeout(translateNow, delay));
    window.addEventListener('saludclick:content-change', translateNow);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('saludclick:content-change', translateNow);
    };
  }, [locale, mounted, pathname]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try { localStorage.setItem(STORAGE_KEY, nextLocale); } catch { /* almacenamiento no disponible */ }
    document.documentElement.lang = nextLocale;
  };

  const value = useMemo(() => ({ locale, ready: mounted, setLocale, t: (key: MessageKey) => messages[locale][key] }), [locale, mounted]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
