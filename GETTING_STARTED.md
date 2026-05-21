# 🚀 Guía de Inicio Rápido - SaludClick

## 📦 Estructura Creada

```
SaludClick/
├── frontend/                    # Aplicación Next.js (Cliente)
│   ├── app/
│   │   ├── page.tsx            # Página principal
│   │   ├── login/page.tsx       # Login
│   │   ├── register/page.tsx    # Registro
│   │   ├── layout.tsx           # Layout raíz con meta tags
│   │   └── globals.css          # Estilos globales
│   ├── components/              # Componentes reutilizables
│   │   ├── Navbar.tsx           # Barra de navegación
│   │   └── DoctorCard.tsx       # Tarjeta de médico
│   ├── store/                   # Zustand stores
│   │   └── index.ts             # Auth, appointments, doctors
│   ├── types/                   # Tipos TypeScript
│   │   └── index.ts
│   ├── utils/                   # Utilidades
│   │   ├── api.ts               # Cliente API
│   │   └── helpers.ts           # Funciones helper
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── next.config.js
│   ├── .env.example
│   └── Dockerfile.dev
│
├── backend/                     # API Express (Servidor)
│   ├── src/
│   │   ├── server.ts            # Entrada principal
│   │   ├── types/
│   │   │   └── index.ts         # Tipos e interfaces
│   │   ├── middleware/
│   │   │   └── auth.ts          # Autenticación
│   │   ├── routes/
│   │   │   ├── auth.ts          # Rutas de autenticación
│   │   │   ├── doctors.ts       # Rutas de médicos
│   │   │   ├── appointments.ts  # Rutas de citas
│   │   │   └── medical.ts       # Rutas de historial/recetas
│   │   ├── utils/
│   │   │   └── auth.ts          # Funciones de JWT y hashing
│   │   └── db/
│   │       └── index.ts         # Configuración de BD
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   └── dist/                    # Código compilado
│
├── database/
│   ├── init.sql                 # Scripts de inicialización
│   └── migrations/              # Futuras migraciones
│
├── Assets/
│   └── img/
│       ├── SaludClick.png       # Logo
│       └── Icono.png            # Ícono
│
├── docs/
│   ├── DEVELOPMENT.md           # Guía de desarrollo
│   └── API.md                   # Documentación de API
│
├── .gitignore
├── docker-compose.yml           # Configuración Docker
├── README.md                    # Descripción general
└── IMPLEMENTATION_CHECKLIST.md  # Lista de tareas
```

## ⚡ Pasos para Comenzar

### 1. Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../frontend
cp .env.example .env.local
```

### 3. Base de Datos (Sin Docker)

```bash
# Crear base de datos
createdb saludclick

# Ejecutar scripts
psql -U postgres -d saludclick -f ../database/init.sql
```

### 4. Iniciar Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Escucha en http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Abierto en http://localhost:3000
```

## 🐳 Opción con Docker

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 📖 Próximos Pasos

1. **Revisar la lista de tareas**: `IMPLEMENTATION_CHECKLIST.md`
2. **Documentación de desarrollo**: `docs/DEVELOPMENT.md`
3. **Documentación de API**: `docs/API.md`
4. **Comenzar con autenticación**: Backend → Frontend

## 🎨 Personalización

### Logo e Icono
- Logo: `Assets/img/SaludClick.png`
- Ícono: `Assets/img/Icono.png`
- Actualizados en: `frontend/app/layout.tsx`, `frontend/components/Navbar.tsx`

### Colores (Tailwind)
Editar `frontend/tailwind.config.js`:
```javascript
colors: {
  primary: '#0066cc',      // Azul principal
  secondary: '#00cc99',    // Verde secundario
  accent: '#ff6b6b',       // Rojo acento
}
```

### Variables de Entorno

**Backend (.env):**
- `DATABASE_URL`: Conexión a PostgreSQL
- `JWT_SECRET`: Clave secreta para JWT
- `PORT`: Puerto del servidor (default: 5000)

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL`: URL del API
- `NEXTAUTH_URL`: URL de la app

## 🔍 Estructura de Roles

```
┌─────────────────────────────────────┐
│         SAUDCLICK PLATFORM          │
├─────────────────────────────────────┤
│ Paciente      → Ver médicos, agendar│
│ Médico        → Gestionar citas     │
│ Secretaria    → Gestionar citas     │
│ Admin         → Acceso total        │
└─────────────────────────────────────┘
```

## 📊 Stack Tecnológico

```
FRONTEND:
├── Next.js 14 (App Router)
├── React 18
├── TypeScript
├── Tailwind CSS
└── Zustand (State Management)

BACKEND:
├── Node.js + Express
├── TypeScript
├── PostgreSQL
├── JWT Authentication
└── Express Validator

DEPLOYMENT:
├── Docker
├── Docker Compose
└── (AWS/Vercel ready)
```

## 🆘 Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Port already in use"
```bash
# Cambiar puerto en .env
PORT=5001 npm run dev
```

### Error: "Database connection refused"
```bash
# Verificar que PostgreSQL esté corriendo
psql -U postgres -h localhost
```

## 📚 Recursos Útiles

- [Next.js Docs](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## ✨ Características Completadas

✅ Estructura full-stack completa
✅ Autenticación scaffolding
✅ Base de datos diseñada
✅ API endpoints definidos
✅ Componentes principales
✅ SEO optimizado
✅ Documentación completa
✅ Docker configurado

## 🎯 Siguiente Fase

1. Implementar autenticación en backend
2. Conectar frontend con API
3. Completar listado de médicos
4. Sistema de agendamiento
5. Panel de dashboard
6. Historial médico
7. Recetas digitales

---

**¡Listo para comenzar! 🚀**

Para más detalles, consulta la documentación en la carpeta `docs/`
