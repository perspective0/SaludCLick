# SaludClick - Plataforma de Gestión de Citas Médicas

Plataforma web para la gestión de citas médicas, conectando pacientes, médicos y secretarias.

## 🎯 Características

- ✅ Página principal optimizada para SEO
- ✅ Sistema de autenticación y registro
- ✅ Listado de médicos por centro de salud
- ✅ Filtrado por especialidad
- ✅ Sistema de agendamiento de citas
- ✅ Panel de médicos con calendario
- ✅ Historial médico de pacientes
- ✅ Sistema de recetas digitales
- ✅ Roles: Paciente, Médico, Secretaria

## 📁 Estructura del Proyecto

```
SaludClick/
├── frontend/          # Aplicación Next.js (SEO optimizada)
├── backend/           # API Express Node.js
├── database/          # Scripts SQL y migraciones
├── Assets/           # Imágenes y recursos
└── docs/             # Documentación
```

## 🚀 Instalación

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

### Base de Datos
```bash
psql -U postgres -f database/init.sql
```

## 🔐 Roles y Permisos

- **Paciente**: Ver médicos, agendar citas, historial médico
- **Médico**: Gestionar citas, ver historial, crear recetas
- **Secretaria**: Gestionar citas en nombre del médico

## 📝 Licencia

Todos los derechos reservados - SaludClick 2026
