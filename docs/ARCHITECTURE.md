# SaludClick Technical Architecture

## Backend Layers

- `controllers/`: HTTP adapters. They read request input, call services/repositories, and return API responses.
- `services/`: business workflows and integration boundaries. New external providers should start here.
- `repositories/`: reusable database access and ownership checks.
- `validators/`: shared validation for identifiers, clinical payloads, statuses, and business rules.
- `utils/`: cross-cutting helpers such as API responses and audit logging.
- `middleware/`: auth, role checks, request logging, and future tracing.
- `constants/`: canonical roles, statuses, notification types, channels, and priorities.

## API Response Shape

New and refactored endpoints should return:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "message": "Optional human message",
  "meta": {}
}
```

Legacy endpoints may still return the older shape during gradual migration.

## Clinical Flow

1. Patient books or confirms an appointment.
2. Doctor starts consultation.
3. SOAP, vital signs, diagnoses and prescriptions are persisted.
4. Timeline, audit logs and notifications are generated.
5. Patient portal exposes owned appointments, prescriptions and profile data.

## Core Data Relationships

- `users` is the identity root.
- `patients`, `doctors`, and `secretaries` extend users by role.
- `appointments` links patient, doctor and health center.
- `medical_records` links patient, doctor and optionally appointment.
- `prescriptions` links patient, doctor and medical record.
- `vital_signs`, `patient_diagnoses`, `patient_allergies`, `patient_medications`, and `patient_antecedents` provide structured clinical data.
- `audit_logs` stores traceability for clinical actions.
- `notifications` stores in-app reminders and prepares external channels.

## Multi-Clinic Preparation

Current ownership uses patient/doctor relationships and `health_center_id` on appointments/doctors. Future multi-clinic enforcement should centralize clinic ownership in repositories and add clinic filters to dashboards and admin reporting.

## Future Integration Boundaries

- Email and WhatsApp: `services/integrations/notificationProviders.ts`
- PDF providers: replace HTML print fallback behind a prescription/PDF service.
- Telemedicine, AI and payments: feature flags live in `config/appConfig.ts` and integration placeholders live in `services/integrations/`.
