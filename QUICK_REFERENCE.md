# ⚡ Quick Reference - SaludClick

## 🚀 Inicio Rápido (5 minutos)

```bash
# 1. Instalar dependencias
cd frontend && npm install
cd ../backend && npm install

# 2. Copiar .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Base de datos
createdb saludclick
psql -U postgres -d saludclick -f database/init.sql

# 4. Iniciar servidores
# Terminal 1
cd backend && npm run dev    # http://localhost:5000

# Terminal 2
cd frontend && npm run dev   # http://localhost:3000
```

---

## 📁 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `frontend/app/page.tsx` | Página de inicio |
| `frontend/app/login/page.tsx` | Login |
| `frontend/app/register/page.tsx` | Registro |
| `frontend/utils/api.ts` | Cliente API |
| `backend/src/server.ts` | Servidor principal |
| `backend/src/routes/auth.ts` | Rutas de autenticación |
| `database/init.sql` | Esquema de BD |

---

## 🔌 Rutas de API

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
```

### Médicos
```
GET    /api/doctors
GET    /api/doctors/:id
GET    /api/doctors/:id/calendar
PUT    /api/doctors/:id
```

### Citas
```
POST   /api/appointments
GET    /api/appointments
GET    /api/appointments/:id
PUT    /api/appointments/:id
DELETE /api/appointments/:id
```

### Historial
```
POST   /api/medical-records
GET    /api/medical-records/:patientId
POST   /api/prescriptions
GET    /api/prescriptions/patient/:patientId
```

---

## 🎨 Colores Tailwind

```
primary:    #0066cc (Azul)
secondary:  #00cc99 (Verde)
accent:     #ff6b6b (Rojo)
```

---

## 📦 Dependencias Clave

### Frontend
```
next@14
react@18
zustand@4
tailwindcss@3
```

### Backend
```
express@4
pg@8 (PostgreSQL)
jsonwebtoken@9
bcryptjs@2
```

---

## 🔑 Variables de Entorno

### Backend (.env)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/saludclick
JWT_SECRET=tu-secreto-aqui
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXTAUTH_URL=http://localhost:3000
```

---

## 📖 Comandos Útiles

### Frontend
```bash
npm run dev      # Desarrollo
npm run build    # Compilar
npm start        # Producción
npm run lint     # Linting
```

### Backend
```bash
npm run dev      # Desarrollo con ts-node-dev
npm run build    # Compilar TypeScript
npm start        # Iniciar desde dist
```

### Base de Datos
```bash
psql -U postgres -d saludclick    # Conectar
\dt                               # Ver tablas
\d appointments                   # Ver estructura
```

---

## 🐳 Docker

```bash
# Iniciar todo
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Limpiar
docker-compose down -v
```

---

## 💾 Base de Datos - Tablas Principales

```sql
users          → id, email, password, role, ...
patients       → date_of_birth, gender, blood_type, ...
doctors        → license_number, specialties, yearsExperience, ...
health_centers → name, address, city, ...
appointments   → patient_id, doctor_id, date, time, status, ...
medical_records → patient_id, doctor_id, diagnosis, treatment, ...
prescriptions  → patient_id, medications[], status, ...
```

---

## 🔐 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **patient** | Ver médicos, agendar citas, ver historial |
| **doctor** | Gestionar citas, crear historial, recetas |
| **secretary** | Gestionar citas del médico |
| **admin** | Acceso total |

---

## 📱 Responsive Breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

Ejemplo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## 🧩 Componentes Creados

- `Navbar.tsx` - Barra de navegación
- `DoctorCard.tsx` - Tarjeta de médico

Ubicación: `frontend/components/`

---

## 📦 Stores Zustand

```typescript
// Auth
useAuthStore()
├── user
├── token
├── isAuthenticated
└── setUser(), logout()

// Appointments
useAppointmentsStore()
├── appointments
└── addAppointment(), removeAppointment()

// Doctors
useDoctorsStore()
├── doctors
├── selectedDoctor
└── setDoctors(), setSelectedDoctor()
```

---

## 🛠️ Herramientas Recomendadas

- **VSCode** - Editor
- **Thunder Client** o **Postman** - API testing
- **pgAdmin** - Gestión BD
- **Git** - Control de versiones

---

## 📚 Documentación

- 📖 `DEVELOPMENT.md` - Desarrollo
- 📋 `API.md` - Endpoints
- 🏗️ `ARCHITECTURE.md` - Arquitectura
- 📐 `CODE_PATTERNS.md` - Patrones
- ⚡ `GETTING_STARTED.md` - Inicio rápido

---

## ❓ Preguntas Frecuentes

**¿Cómo cambiar el puerto?**
```bash
PORT=5001 npm run dev    # Backend
PORT=3001 npm run dev    # Frontend
```

**¿Cómo resetear la BD?**
```bash
psql -U postgres -c "DROP DATABASE saludclick;"
psql -U postgres -c "CREATE DATABASE saludclick;"
psql -U postgres -d saludclick -f database/init.sql
```

**¿Cómo generar JWT token?**
```typescript
import { generateToken } from '@/utils/auth';
const token = generateToken({ id: '123', email: 'test@test.com', role: 'patient' });
```

**¿Dónde está el logo?**
`Assets/img/SaludClick.png` - Integrado en frontend

---

## 🎯 Checklist para Comenzar

- [ ] Instalar dependencias
- [ ] Copiar archivos .env
- [ ] Crear base de datos
- [ ] Iniciar backend
- [ ] Iniciar frontend
- [ ] Abrir http://localhost:3000
- [ ] Probar login/registro
- [ ] Revisar documentación

---

## 🚨 Troubleshooting

| Problema | Solución |
|----------|----------|
| Puerto en uso | Cambiar PORT en .env |
| BD no conecta | `psql` y verificar credentials |
| Módulos no encontrados | `npm install` en cada carpeta |
| Token inválido | Verificar JWT_SECRET |
| CORS error | Revisar FRONTEND_URL |

---

## 📞 Estructura de Carpetas Rápida

```
SaludClick/
├── frontend/           (Cliente web)
│   ├── app/           (Páginas)
│   ├── components/    (Componentes React)
│   ├── utils/         (API, helpers)
│   └── store/         (Zustand state)
├── backend/           (Servidor API)
│   └── src/
│       ├── routes/    (Endpoints)
│       ├── middleware/(Auth, validación)
│       └── db/        (Pool PostgreSQL)
├── database/          (SQL scripts)
└── docs/              (Documentación)
```

---

**¡Listo para empezar! Revisa GETTING_STARTED.md para más detalles.** 🚀
