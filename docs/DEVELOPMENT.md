# Guía de Desarrollo - SaludClick

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL 15+
- npm o yarn
- Docker (opcional, para desarrollo con contenedores)

## 🚀 Configuración Inicial

### 1. Clonar y Navegar al Proyecto

```bash
cd SaludClick
```

### 2. Configurar Base de Datos

#### Opción A: Sin Docker

```bash
# Crear base de datos
createdb saludclick

# Ejecutar scripts de migración
psql -U postgres -d saludclick -f database/init.sql
```

#### Opción B: Con Docker

```bash
# Iniciar servicios
docker-compose up -d

# Esperara que la base de datos esté lista (ver logs)
docker-compose logs postgres
```

### 3. Configurar Backend

```bash
cd backend

# Copiar archivo de variables de entorno
cp .env.example .env

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Backend estará disponible en: `http://localhost:5000`

### 4. Configurar Frontend

```bash
cd frontend

# Copiar archivo de variables de entorno
cp .env.example .env.local

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Frontend estará disponible en: `http://localhost:3000`

## 📚 Estructura de Carpetas

```
SaludClick/
├── frontend/
│   ├── app/                 # Next.js App Router
│   ├── components/          # Componentes React reutilizables
│   ├── public/              # Archivos estáticos
│   ├── styles/              # Estilos CSS
│   ├── types/               # Tipos TypeScript
│   └── utils/               # Utilidades y helpers
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de rutas
│   │   ├── middleware/      # Middleware Express
│   │   ├── models/          # Modelos de datos
│   │   ├── routes/          # Definición de rutas
│   │   ├── types/           # Tipos e interfaces
│   │   ├── utils/           # Utilidades
│   │   └── server.ts        # Entrada principal
│   ├── dist/                # Código compilado
│   └── package.json
├── database/
│   ├── init.sql             # Scripts iniciales
│   └── migrations/          # Migraciones adicionales
├── Assets/
│   ├── img/
│   │   ├── SaludClick.png   # Logo principal
│   │   └── Icono.png        # Icono de la app
├── docker-compose.yml       # Configuración Docker
└── README.md
```

## 🔑 Variables de Entorno

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/saludclick
JWT_SECRET=tu_super_secreto_jwt_aqui_cambiar_en_produccion
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=SaludClick
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-super-secreto-auth
```

## 🔌 API Endpoints Principales

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Médicos

- `GET /api/doctors` - Listar médicos (con filtros)
- `GET /api/doctors/:id` - Obtener detalles del médico
- `GET /api/doctors/:id/calendar` - Calendario de citas
- `GET /api/doctors/:id/patients` - Pacientes del médico

### Citas

- `POST /api/appointments` - Crear cita
- `GET /api/appointments` - Listar citas del usuario
- `GET /api/appointments/:id` - Detalles de cita
- `PUT /api/appointments/:id` - Actualizar cita
- `DELETE /api/appointments/:id` - Cancelar cita

### Historial Médico

- `POST /api/medical-records` - Crear registro médico
- `GET /api/medical-records/:patientId` - Historial del paciente
- `POST /api/prescriptions` - Crear receta
- `GET /api/prescriptions/patient/:patientId` - Recetas del paciente

## 🎯 Características por Implementar

### Alto Prioridad
- [ ] Autenticación completa (registrogin)
- [ ] Listado de médicos con filtros
- [ ] Sistema de agendamiento
- [ ] Panel de paciente
- [ ] Panel de médico

### Mediano Prioridad
- [ ] Historial médico
- [ ] Sistema de recetas
- [ ] Notificaciones (email/SMS)
- [ ] Calificaciones de médicos

### Bajo Prioridad
- [ ] Chat en tiempo real
- [ ] Telemedicina (videollamadas)
- [ ] Integración de pagos
- [ ] Reportes analíticos

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📦 Deploying

### Producción

```bash
# Backend
npm run build
npm start

# Frontend
npm run build
npm start
```

### Con Docker

```bash
docker-compose -f docker-compose.yml up -d
```

## 🐛 Troubleshooting

### Error de conexión a base de datos

```bash
# Verificar conexión PostgreSQL
psql -U postgres -h localhost

# Ver logs de Docker
docker-compose logs postgres
```

### Puerto ya en uso

```bash
# Frontend
PORT=3001 npm run dev

# Backend
PORT=5001 npm run dev
```

## 📝 Notas de Desarrollo

1. **SEO**: El frontend está optimizado con Next.js para mejor SEO
2. **Seguridad**: Las contraseñas se hashean con bcryptjs
3. **Autenticación**: Usa JWT con expiración configurable
4. **Validación**: Usa express-validator en backend
5. **Estilos**: Tailwind CSS para estilos rápidos y consistentes

## 🤝 Contribuir

1. Crea una rama para tu feature
2. Haz commits claros y descriptivos
3. Envía pull request con descripción

## 📞 Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.
