# 🏗️ Arquitectura de SaludClick

## Diagrama General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SALUDCLICK PLATFORM                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐          ┌──────────────────────────────┐
│      FRONTEND (3000)      │          │     BACKEND API (5000)       │
│   Next.js + React 18     │◄────────►│   Express + TypeScript       │
│  ├─ SEO Optimizado       │  HTTP    │  ├─ Autenticación JWT        │
│  ├─ Responsive Design    │  REST    │  ├─ Gestión de datos         │
│  ├─ User Interfaces      │          │  ├─ Validación               │
│  └─ State Management     │          │  └─ Business Logic           │
└──────────────────────────┘          └──────────────────────────────┘
           │                                       │
           │                                       │
           ▼                                       ▼
┌──────────────────────────┐          ┌──────────────────────────────┐
│   Assets & Static Files   │          │    PostgreSQL Database       │
│ ├─ Logo                   │          │  ├─ Users & Roles            │
│ ├─ Icons                  │          │  ├─ Doctors                  │
│ └─ Images                 │          │  ├─ Appointments             │
└──────────────────────────┘          │  ├─ Medical Records           │
                                       │  ├─ Prescriptions             │
                                       │  └─ Reviews                   │
                                       └──────────────────────────────┘
```

## Flujo de Autenticación

```
┌─────────────────┐
│     USUARIO     │
└────────┬────────┘
         │ Registrar/Login
         ▼
┌─────────────────────────┐
│   Frontend (Login Form)  │
│  ├─ Validar datos       │
│  └─ Enviar credenciales │
└────────┬────────────────┘
         │ POST /auth/login
         ▼
┌─────────────────────────┐
│  Backend (Auth Handler) │
│  ├─ Validar email/pass  │
│  ├─ Generar JWT         │
│  └─ Devolver token      │
└────────┬────────────────┘
         │ JWT Token
         ▼
┌─────────────────────────┐
│  Frontend (localStorage)│
│  ├─ Guardar token       │
│  ├─ Redirigir dashboard │
│  └─ Establecer headers  │
└────────┬────────────────┘
         │ Token en Authorization
         ▼
┌─────────────────────────┐
│  Backend (Protected)    │
│  ├─ Verificar JWT       │
│  ├─ Autorizar rol       │
│  └─ Procesar solicitud  │
└────────┬────────────────┘
         │ Datos/Respuesta
         ▼
┌─────────────────────────┐
│  Frontend (Display)     │
│  └─ Mostrar información │
└─────────────────────────┘
```

## Flujo de Agendamiento de Citas

```
PACIENTE                    FRONTEND                    BACKEND                 DATABASE

    │                          │                          │                       │
    │ Buscar médicos           │                          │                       │
    ├────────────────────────► │ GET /doctors             │                       │
    │                          ├─────────────────────────►│ Query doctors          │
    │                          │                          ├─────────────────────►│
    │                          │                          │◄─────────────────────┤
    │                          │                          │ Retorna médicos        │
    │◄─────── Mostrar médicos ─┤                          │                       │
    │                          │                          │                       │
    │ Seleccionar médico       │                          │                       │
    │ y fecha/hora             │                          │                       │
    ├─────────────────────────►│ GET /appointments/:docId/│                       │
    │                          │    available-slots       │                       │
    │                          ├─────────────────────────►│ Calcular slots         │
    │                          │                          ├─────────────────────►│
    │                          │                          │◄─────────────────────┤
    │◄──── Mostrar horarios ───┤                          │                       │
    │                          │                          │                       │
    │ Confirmar cita           │                          │                       │
    ├─────────────────────────►│ POST /appointments       │                       │
    │                          ├─────────────────────────►│ Crear cita             │
    │                          │                          ├─────────────────────►│
    │                          │                          │◄─────────────────────┤
    │◄──── Cita confirmada ────┤                          │                       │
    │                          │                          │                       │
```

## Estructura de Carpetas - Frontend

```
frontend/
├── app/                 # App Router de Next.js
│   ├── page.tsx        # Página principal
│   ├── layout.tsx      # Layout raíz
│   ├── globals.css     # Estilos globales
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── doctors/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── appointments/
│   │   └── page.tsx
│   └── dashboard/
│       └── page.tsx
│
├── components/          # Componentes reutilizables
│   ├── Navbar.tsx
│   ├── DoctorCard.tsx
│   ├── AppointmentForm.tsx
│   └── ...
│
├── store/              # Zustand stores
│   ├── index.ts       # Auth, appointments, doctors
│   └── ...
│
├── types/              # Tipos TypeScript
│   └── index.ts
│
├── utils/              # Utilidades
│   ├── api.ts         # Cliente API
│   ├── helpers.ts     # Funciones helper
│   └── ...
│
├── public/             # Archivos estáticos
│   ├── saludclick.png
│   ├── icono.png
│   └── ...
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Estructura de Carpetas - Backend

```
backend/
├── src/
│   ├── server.ts              # Entrada principal
│   │
│   ├── types/                 # Tipos e interfaces
│   │   └── index.ts
│   │
│   ├── middleware/            # Middlewares
│   │   ├── auth.ts           # Autenticación y roles
│   │   └── ...
│   │
│   ├── routes/               # Rutas del API
│   │   ├── auth.ts
│   │   ├── doctors.ts
│   │   ├── appointments.ts
│   │   └── medical.ts
│   │
│   ├── controllers/          # Lógica de negocio (futuro)
│   │   ├── authController.ts
│   │   └── ...
│   │
│   ├── models/               # Modelos (futuro)
│   │   ├── User.ts
│   │   └── ...
│   │
│   ├── utils/                # Utilidades
│   │   ├── auth.ts          # JWT y hash
│   │   └── ...
│   │
│   └── db/                   # Base de datos
│       └── index.ts
│
├── dist/                      # Compilado
├── package.json
├── tsconfig.json
└── .env
```

## Estructura de Base de Datos

```sql
users
├── id (UUID) PRIMARY KEY
├── email UNIQUE
├── password
├── first_name
├── last_name
├── role ENUM (patient, doctor, secretary, admin)
├── phone
├── avatar
├── is_active
└── timestamps

patients
├── id → users.id (FK)
├── date_of_birth
├── gender
├── blood_type
├── address
└── medical_history

doctors
├── id → users.id (FK)
├── health_center_id → health_centers.id (FK)
├── license_number UNIQUE
├── years_experience
├── bio
├── consultation_price
├── specialties ARRAY
└── average_rating

health_centers
├── id (UUID) PRIMARY KEY
├── name
├── address
├── city
├── phone
├── email
└── image

appointments
├── id (UUID) PRIMARY KEY
├── patient_id → patients.id (FK)
├── doctor_id → doctors.id (FK)
├── appointment_date DATE
├── appointment_time TIME
├── duration INT
├── status ENUM
├── reason_for_visit
└── timestamps

medical_records
├── id (UUID) PRIMARY KEY
├── patient_id → patients.id (FK)
├── doctor_id → doctors.id (FK)
├── appointment_id → appointments.id (FK)
├── diagnosis
├── treatment
└── notes

prescriptions
├── id (UUID) PRIMARY KEY
├── patient_id → patients.id (FK)
├── doctor_id → doctors.id (FK)
├── medical_record_id → medical_records.id (FK)
├── medications JSONB
├── status ENUM
└── timestamps

doctor_availability
├── id (UUID) PRIMARY KEY
├── doctor_id → doctors.id (FK)
├── day_of_week INT
├── start_time TIME
├── end_time TIME
└── is_break BOOLEAN

reviews
├── id (UUID) PRIMARY KEY
├── patient_id → patients.id (FK)
├── doctor_id → doctors.id (FK)
├── rating INT (1-5)
└── comment
```

## Flujo de Datos - Crear Cita

```
1. USUARIO SELECCIONA MÉDICO Y FECHA
   ↓
2. FRONTEND VALIDA DATOS
   ↓
3. FRONTEND ENVÍA POST /appointments
   {
     doctorId: "uuid",
     appointmentDate: "2026-01-20",
     appointmentTime: "14:30",
     reasonForVisit: "Revisión general"
   }
   ↓
4. BACKEND AUTENTICACIÓN
   - Verifica JWT token
   - Obtiene user ID del token
   ↓
5. BACKEND VALIDACIÓN
   - Valida datos
   - Verifica disponibilidad del médico
   - Comprueba conflictos de citas
   ↓
6. BACKEND GUARDA EN BD
   INSERT INTO appointments (patient_id, doctor_id, ...) 
   VALUES (uuid, uuid, ...)
   ↓
7. BACKEND ENVÍA RESPUESTA
   {
     success: true,
     data: {
       id: "uuid",
       status: "scheduled"
     }
   }
   ↓
8. FRONTEND ACTUALIZA ESTADO
   - Guarda en store Zustand
   - Muestra confirmación
   ↓
9. NOTIFICACIONES (FUTURO)
   - Email al médico
   - Email al paciente
   - SMS recordatorio
```

## Componentes Principales - Frontend

```
App
├── Navbar (Navegación global)
├── Layout (Contenedor principal)
├── Rutas
│   ├── HomePage
│   │   ├── HeroSection
│   │   ├── FeaturesSection
│   │   ├── DoctorsList
│   │   │   └── DoctorCard (x múltiples)
│   │   └── CTASection
│   │
│   ├── LoginPage
│   │   └── LoginForm
│   │
│   ├── RegisterPage
│   │   └── RegisterForm
│   │
│   ├── DoctorsPage
│   │   ├── DoctorFilter
│   │   └── DoctorsList
│   │       └── DoctorCard (x múltiples)
│   │
│   ├── DoctorDetailPage
│   │   ├── DoctorInfo
│   │   ├── DoctorAvailability
│   │   └── AppointmentBooking
│   │
│   ├── AppointmentsPage
│   │   └── AppointmentsList
│   │
│   └── DashboardPage (según rol)
│       ├── PatientDashboard
│       │   ├── UpcomingAppointments
│       │   ├── MedicalHistory
│       │   └── Prescriptions
│       │
│       └── DoctorDashboard
│           ├── DayCalendar
│           ├── AppointmentsList
│           ├── PatientsList
│           └── PrescriptionForm
│
└── Footer
```

## Stack de Seguridad

```
FRONTEND:
├── Validación de entrada en cliente
├── XSS Protection (Next.js)
├── CSRF Protection (Next.js)
└── Almacenamiento seguro de token

BACKEND:
├── JWT Authentication
├── Password Hashing (bcryptjs)
├── SQL Injection Prevention (Prepared statements)
├── Rate Limiting (futuro)
├── CORS Configuration
├── Input Validation
├── Role-Based Access Control
└── HTTPS (Producción)

DATABASE:
├── User roles and permissions
├── Encrypted passwords
├── Audit logs (futuro)
└── Data encryption at rest
```

---

Esta arquitectura está diseñada para ser:
- **Escalable**: Fácil agregar nuevas características
- **Mantenible**: Código organizado y tipado
- **Segura**: Autenticación y autorización robustas
- **SEO-friendly**: Optimizado para motores de búsqueda
- **Performante**: Con caché y optimizaciones
