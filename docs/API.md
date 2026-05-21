# SaludClick API Documentation

## Base URL

```
http://localhost:5000/api
```

## Autenticación

La mayoría de endpoints requieren token JWT en el header:

```
Authorization: Bearer <token>
```

## Endpoints

### 🔐 Autenticación

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "phone": "555-1234",
  "role": "patient"
}

Response: 201
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "juan@example.com",
      "role": "patient"
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}

Response: 200
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "juan@example.com",
      "role": "patient"
    }
  }
}
```

### 👨‍⚕️ Médicos

#### List Doctors
```http
GET /doctors?specialty=Cardiología&healthCenter=uuid&page=1&limit=20

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "Carlos",
      "lastName": "Martínez",
      "specialties": ["Cardiología", "Medicina General"],
      "healthCenter": {
        "id": "uuid",
        "name": "Centro de Salud Central"
      },
      "consultationPrice": 50,
      "yearsExperience": 10,
      "rating": 4.5,
      "avatar": "url"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### Get Doctor Details
```http
GET /doctors/:doctorId
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Carlos",
    "lastName": "Martínez",
    "email": "carlos@example.com",
    "specialties": ["Cardiología"],
    "bio": "Cardiólogo con 10 años de experiencia",
    "yearsExperience": 10,
    "consultationPrice": 50,
    "rating": 4.5,
    "reviews": [
      {
        "patientName": "Juan",
        "rating": 5,
        "comment": "Excelente médico"
      }
    ],
    "availability": [
      {
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ]
  }
}
```

#### Get Doctor Calendar
```http
GET /doctors/:doctorId/calendar?month=1&year=2026
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "patientName": "Juan Pérez",
        "date": "2026-01-15",
        "time": "10:00",
        "duration": 30,
        "status": "scheduled",
        "reason": "Revisión general"
      }
    ]
  }
}
```

#### Update Doctor Profile
```http
PUT /doctors/:doctorId
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Cardiólogo especializado en arritmias",
  "consultationPrice": 60,
  "availability": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "12:00",
      "isBreak": false
    }
  ]
}

Response: 200
{
  "success": true,
  "message": "Doctor profile updated successfully"
}
```

### 📅 Citas

#### Create Appointment
```http
POST /appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctorId": "uuid",
  "appointmentDate": "2026-01-20",
  "appointmentTime": "14:30",
  "reasonForVisit": "Revisión general"
}

Response: 201
{
  "success": true,
  "message": "Appointment scheduled successfully",
  "data": {
    "id": "uuid",
    "status": "scheduled"
  }
}
```

#### Get User Appointments
```http
GET /appointments?status=scheduled&month=1&year=2026&page=1&limit=20
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "doctorName": "Carlos Martínez",
      "specialty": "Cardiología",
      "healthCenter": "Centro de Salud Central",
      "date": "2026-01-20",
      "time": "14:30",
      "duration": 30,
      "status": "scheduled",
      "reason": "Revisión general"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

#### Update Appointment
```http
PUT /appointments/:appointmentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointmentDate": "2026-01-22",
  "appointmentTime": "15:00",
  "notes": "Cambio solicitado por el paciente"
}

Response: 200
{
  "success": true,
  "message": "Appointment updated successfully"
}
```

#### Cancel Appointment
```http
DELETE /appointments/:appointmentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Cambio de planes"
}

Response: 200
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

### 📋 Historial Médico

#### Create Medical Record
```http
POST /medical-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "diagnosis": "Hipertensión",
  "treatment": "Medicamento X diario",
  "symptoms": "Presión alta, dolores de cabeza",
  "appointmentId": "uuid",
  "notes": "Notas adicionales"
}

Response: 201
{
  "success": true,
  "message": "Medical record created successfully",
  "data": {
    "id": "uuid"
  }
}
```

#### Get Patient Medical History
```http
GET /medical-records/:patientId?page=1&limit=20
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "doctorName": "Carlos Martínez",
      "date": "2026-01-15",
      "diagnosis": "Hipertensión",
      "treatment": "Medicamento X",
      "summary": "Tratamiento para presión alta"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10
  }
}
```

### 💊 Recetas

#### Create Prescription
```http
POST /prescriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "uuid",
  "medicalRecordId": "uuid",
  "medications": [
    {
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Una vez al día",
      "duration": "30 días",
      "instructions": "Tomar por la mañana"
    }
  ],
  "notes": "Tomar con comida",
  "expiryDate": "2026-04-20"
}

Response: 201
{
  "success": true,
  "message": "Prescription created successfully",
  "data": {
    "id": "uuid",
    "status": "active"
  }
}
```

#### Get Patient Prescriptions
```http
GET /prescriptions/patient/:patientId?status=active&page=1&limit=20
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "doctorName": "Carlos Martínez",
      "date": "2026-01-15",
      "expiryDate": "2026-04-15",
      "status": "active",
      "medications": [
        {
          "name": "Lisinopril",
          "dosage": "10mg",
          "frequency": "Una vez al día"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3
  }
}
```

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Autenticación requerida |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Server Error - Error del servidor |

## Roles y Permisos

| Rol | Permiso |
|-----|---------|
| **patient** | Ver médicos, agendar citas, ver historial médico, ver recetas |
| **doctor** | Ver citas, crear historial médico, crear recetas, ver pacientes |
| **secretary** | Gestionar citas del doctor |
| **admin** | Acceso total |

## Ejemplo de Uso con cURL

```bash
# Registro
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "password": "password123",
    "role": "patient"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'

# Listar médicos
curl -X GET "http://localhost:5000/api/doctors?specialty=Cardiología" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Ejemplo con JavaScript/Fetch

```javascript
// Registro
const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@example.com',
    password: 'password123',
    role: 'patient'
  })
});

const { data } = await registerResponse.json();
const token = data.token;

// Usar token en solicitudes posteriores
const doctorsResponse = await fetch('http://localhost:5000/api/doctors', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```
