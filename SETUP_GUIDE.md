# 🚀 Guía de Instalación y Uso - SaludClick

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn

## ⚙️ Instalación Rápida

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd SaludClick
```

### 2. Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend (en otra terminal)
cd ../frontend
npm install
```

### 3. Configurar Variables de Entorno

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/saludclick
JWT_SECRET=tu_super_secreto_jwt_aqui_cambiar_en_produccion
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=SaludClick
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-in-production
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 4. Crear Base de Datos

```bash
# Crear base de datos
createdb saludclick

# Ejecutar script de inicialización
psql -U postgres -d saludclick -f database/init.sql
```

### 5. Iniciar Servidores

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
# Escucha en http://localhost:5000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Disponible en http://localhost:3000
```

## 🎯 Características Implementadas

### ✅ Autenticación
- [x] Registro de usuarios (Paciente/Médico)
- [x] Login seguro con JWT
- [x] Protección de rutas por rol
- [x] Logout

### ✅ Gestión de Médicos
- [x] Listado de médicos
- [x] Filtrado por especialidad
- [x] Perfil detallado del médico
- [x] Calificaciones y reseñas

### ✅ Sistema de Citas
- [x] Agendamiento de citas
- [x] Validación de disponibilidad
- [x] Listado de citas por usuario
- [x] Cancelación de citas

### ✅ Dashboard de Pacientes
- [x] Ver próximas citas
- [x] Historial de citas
- [x] Perfil personal

### ✅ Dashboard de Médicos
- [x] Gestionar citas
- [x] Marcar citas completadas
- [x] Ver pacientes
- [x] Crear registros médicos
- [x] Crear recetas

### ✅ Historial Médico
- [x] Registros médicos del paciente
- [x] Recetas digitales
- [x] Descargar documentos (en desarrollo)

### ✅ Diseño y UX
- [x] Responsive design
- [x] SEO optimizado
- [x] Interfaz intuitiva
- [x] Temas de color coherentes

## 🔑 Usuarios de Prueba

### Paciente
- Email: `patient@test.com`
- Contraseña: `password123`

### Médico
- Email: `doctor@test.com`
- Contraseña: `password123`

### Admin
- Email: `admin@test.com`
- Contraseña: `password123`

## 📱 Rutas Principales

### Públicas
- `/` - Página principal
- `/login` - Iniciar sesión
- `/register` - Registro
- `/doctors` - Listado de médicos
- `/doctors/:id` - Perfil del médico

### Protegidas (Pacientes)
- `/dashboard` - Panel principal
- `/booking` - Agendar cita
- `/medical-records` - Historial médico
- `/prescriptions` - Mis recetas
- `/profile` - Mi perfil

### Protegidas (Médicos)
- `/doctor/dashboard` - Panel del médico
- `/doctor/patients` - Mis pacientes
- `/doctor/medical-records` - Crear registros
- `/doctor/prescriptions` - Crear recetas

### Protegidas (Admin)
- `/admin` - Panel administrativo

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos modernos
- **Zustand** - State management
- **Axios** - Client HTTP

### Backend
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **express-validator** - Validación

## 📚 Documentación Adicional

Ver carpeta `docs/` para:
- `ARCHITECTURE.md` - Diagramas de arquitectura
- `API.md` - Documentación completa de endpoints
- `DEVELOPMENT.md` - Guía de desarrollo
- `CODE_PATTERNS.md` - Patrones de código

## 🚢 Deployment

### Con Docker

```bash
docker-compose up -d
```

### A Producción

```bash
# Frontend (Vercel)
npm run build
vercel deploy

# Backend (AWS/Heroku)
npm run build
# Configurar variables de entorno
# Deploy según servicio
```

## 🐛 Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verificar que PostgreSQL está corriendo
psql -U postgres

# Recrear base de datos
dropdb saludclick
createdb saludclick
psql -U postgres -d saludclick -f database/init.sql
```

### Error: "Port 3000 already in use"
```bash
# Cambiar puerto en frontend
PORT=3001 npm run dev
```

### Error: "CORS issues"
Verificar que `FRONTEND_URL` en backend coincide con tu dominio

## 📞 Soporte

Para reportar bugs o sugerencias, abre un issue en el repositorio.

## 📄 Licencia

Todos los derechos reservados - SaludClick 2026

---

**¡Proyecto listo para despegar! 🚀**
