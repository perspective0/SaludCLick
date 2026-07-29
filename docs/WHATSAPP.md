# WhatsApp oficial en SaludClick

La integración queda preparada para WhatsApp Cloud API de Meta, pero desactivada hasta disponer del número, el token permanente y las plantillas aprobadas.

## Flujos preparados

- Nueva solicitud médica: aviso inmediato al WhatsApp del administrador.
- Recordatorios al paciente: uno dentro de las 24 horas previas y otro dentro de las 2 horas previas.
- Consentimiento: solamente reciben recordatorios los pacientes que los activan desde su perfil.
- Idempotencia: cada recordatorio queda registrado para no enviarlo dos veces.
- Reprogramación: al cambiar la fecha u hora, se reinician los recordatorios de esa cita.
- Privacidad: los mensajes no incluyen diagnóstico, motivo de consulta ni información clínica.
- Tolerancia a fallos: un error de WhatsApp no impide registrar al médico ni actualizar la cita.

## Preparación en Meta

1. Crear o utilizar un portafolio comercial de Meta.
2. Agregar WhatsApp a la aplicación de Meta.
3. Registrar y verificar el número exclusivo de SaludClick.
4. Obtener el identificador del número y el identificador de la cuenta de WhatsApp Business.
5. Crear un usuario del sistema con acceso a WhatsApp y generar un token permanente.
6. Crear y enviar a revisión las dos plantillas descritas debajo.
7. Mantener `WHATSAPP_ENABLED=false` hasta completar una prueba satisfactoria.

No guardar el token en GitHub. Debe configurarse únicamente como variable secreta en Render.

## Plantilla: nueva solicitud médica

- Nombre sugerido: `nueva_solicitud_medico`
- Categoría sugerida: Utility
- Idioma: español
- Variables, en este orden:

```text
Nueva solicitud de médico en SaludClick.

Nombre: {{1}}
Correo: {{2}}
Teléfono: {{3}}
Exequatur: {{4}}
Especialidad: {{5}}

Revisar solicitud: {{6}}
```

## Plantilla: recordatorio de cita

- Nombre sugerido: `recordatorio_cita`
- Categoría sugerida: Utility
- Idioma: español
- Variables, en este orden:

```text
Hola {{1}}:

Te recordamos que tienes una cita con Dr(a). {{2}} el {{3}} a las {{4}}.

Consulta los detalles en SaludClick: {{5}}
```

## Variables para Render

```env
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=cloud
WHATSAPP_DEFAULT_COUNTRY_CODE=1
WHATSAPP_ADMIN_RECIPIENT=18090000000
WHATSAPP_REMINDERS_ENABLED=false
WHATSAPP_REMINDER_INTERVAL_MINUTES=15
WHATSAPP_CRON_SECRET=un_valor_largo_y_aleatorio
APPOINTMENT_TIME_ZONE=America/Santo_Domingo

WHATSAPP_ACCESS_TOKEN=token_permanente_de_meta
WHATSAPP_PHONE_NUMBER_ID=id_del_numero
WHATSAPP_BUSINESS_ACCOUNT_ID=id_de_la_cuenta
WHATSAPP_API_VERSION=v25.0
WHATSAPP_TEMPLATE_LANGUAGE=es
WHATSAPP_DOCTOR_REQUEST_TEMPLATE=nueva_solicitud_medico
WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE=recordatorio_cita
WHATSAPP_TEST_RECIPIENT=18090000000
```

Después de aprobar las plantillas, activar primero `WHATSAPP_ENABLED=true`, enviar una prueba desde el panel administrador y, cuando esa prueba llegue, activar `WHATSAPP_REMINDERS_ENABLED=true`.

## Ejecución automática

El backend revisa las citas cada 15 minutos mientras está encendido. Para despertar un servicio gratuito de Render se puede configurar una llamada externa cada 15 minutos:

- Método: `POST`
- URL: `https://URL-DEL-BACKEND/api/notifications/whatsapp/reminders/run`
- Encabezado: `Authorization: Bearer VALOR_DE_WHATSAPP_CRON_SECRET`

La respuesta informa cuántas citas se procesaron, enviaron o fallaron.
