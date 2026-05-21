# 📐 Patrones de Código y Convenciones - SaludClick

## Nombres y Convenciones

### Archivos y Carpetas

```
✅ CORRECTO:
- components/DoctorCard.tsx
- pages/doctor-detail.tsx
- utils/api.ts
- store/index.ts
- types/index.ts

❌ INCORRECTO:
- components/doctor-card.tsx  (usa PascalCase para componentes)
- pages/doctorDetail.tsx       (usa kebab-case para páginas)
- Utils/api.ts                 (usa minúsculas para carpetas)
```

### Variables y Funciones

```typescript
// ✅ CORRECTO
const appointmentId = '123';
const getDoctorById = (id: string) => { };
const useAuthStore = () => { };
const API_URL = 'http://localhost:5000/api';

// ❌ INCORRECTO
const appointment_id = '123';
const get_doctor_by_id = (id: string) => { };
const getAuthStore = () => { };
const apiUrl = 'http://localhost:5000/api';
```

## Componentes React (Frontend)

### Estructura Base

```typescript
'use client'; // Si usa hooks

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DoctorCard } from '@/types';

interface ComponentProps {
  title: string;
  onSubmit: (data: any) => void;
}

/**
 * Descripción corta del componente
 * @param props - Props del componente
 */
export default function MyComponent({ title, onSubmit }: ComponentProps) {
  const [state, setState] = useState('');

  const handleClick = () => {
    // lógica
  };

  return (
    <div className="space-y-4">
      {/* JSX aquí */}
    </div>
  );
}
```

### Convenciones de Componentes

```typescript
// ✅ CORRECTO
export default function DoctorCard() { }
export function DoctorForm() { }

// Usar TypeScript
interface Props {
  doctor: Doctor;
  onBook: (id: string) => void;
}

// Props requeridas con |
export default function DoctorCard({ 
  doctor, 
  onBook 
}: Props) {
  return <div>{doctor.name}</div>;
}

// ❌ INCORRECTO - Props en línea
export default function DoctorCard(props) { }
```

## Funciones (Backend)

### Estructura de Controlador

```typescript
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * POST /api/appointments
 * Crear una nueva cita
 */
export const createAppointment = async (req: Request, res: Response) => {
  // 1. Validar entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    // 2. Extraer datos
    const { doctorId, appointmentDate } = req.body;

    // 3. Lógica de negocio
    const appointment = await query(
      'INSERT INTO appointments (...) VALUES (...) RETURNING *',
      [doctorId, appointmentDate]
    );

    // 4. Respuesta
    res.status(201).json({
      success: true,
      message: 'Appointment created',
      data: appointment,
    });
  } catch (error: any) {
    // 5. Manejo de errores
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

## Manejo de Estados (Zustand)

```typescript
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));

// Uso en componentes
function MyComponent() {
  const { user, logout } = useAuthStore();
  // ...
}
```

## API Calls

```typescript
// ✅ CORRECTO
export const doctorAPI = {
  list: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/doctors?${queryString}`);
  },

  getById: (id: string) =>
    apiRequest(`/doctors/${id}`),

  create: (data: Doctor) =>
    apiRequest('/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
      token: getToken(),
    }),
};

// Uso
const doctors = await doctorAPI.list({ specialty: 'Cardiology' });
const doctor = await doctorAPI.getById('uuid');
```

## Validación

### Frontend

```typescript
// ✅ CORRECTO
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = (data: any) => {
  const newErrors: Record<string, string> = {};

  if (!data.email) {
    newErrors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    newErrors.email = 'Invalid email format';
  }

  if (!data.password) {
    newErrors.password = 'Password is required';
  } else if (data.password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (validate(formData)) {
    // Submit form
  }
};
```

### Backend

```typescript
// ✅ CORRECTO
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors });
    }
    // Process request
  }
);
```

## Manejo de Errores

```typescript
// ✅ CORRECTO - Frontend
try {
  const response = await apiRequest('/endpoint');
  // handle success
} catch (error: any) {
  console.error('Error:', error);
  setError(error.message || 'An error occurred');
}

// ✅ CORRECTO - Backend
try {
  const result = await query('SELECT ...');
  res.json({ success: true, data: result });
} catch (error: any) {
  console.error('Database error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
```

## TypeScript - Tipos

```typescript
// ✅ CORRECTO
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Enums para constantes
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  SECRETARY = 'secretary',
}

// Optional fields
export interface Doctor {
  id: string;
  name: string;
  bio?: string;  // Optional
  specialties: string[];
}

// ❌ INCORRECTO - Usar any
const doctor: any = {};
```

## Estilos Tailwind

```typescript
// ✅ CORRECTO
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
  Button
</button>

// Usar componentes personalizados
<button className="btn-primary">Button</button>

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Contenido */}
</div>

// ❌ INCORRECTO
<button style={{ 
  padding: '8px 16px', 
  backgroundColor: '#0066cc' 
}}>
  Button
</button>
```

## Comentarios

```typescript
// ✅ CORRECTO
/**
 * Get doctor by ID
 * @param id - Doctor ID
 * @returns Doctor data or null
 */
function getDoctorById(id: string): Promise<Doctor | null> {
  // Implementation
}

// Comentarios línea
const user = getUser(); // Get current user from store

// ❌ INCORRECTO - Comentarios obvios
const x = 5; // Set x to 5
```

## Imports

```typescript
// ✅ CORRECTO - Ordenado
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Doctor } from '@/types';
import { formatDate } from '@/utils/helpers';

// ❌ INCORRECTO - Sin orden
import { formatDate } from '@/utils/helpers';
import Link from 'next/link';
import { Doctor } from '@/types';
import { useState } from 'react';
```

## Commits y Git

```bash
# Nombres de rama
git checkout -b feature/add-doctor-list
git checkout -b fix/authentication-bug
git checkout -b docs/update-api-docs

# Mensajes de commit
git commit -m "feat: add doctor listing with filters"
git commit -m "fix: authentication token not persisting"
git commit -m "docs: update API documentation"
git commit -m "refactor: improve error handling"
```

## Performance

```typescript
// ✅ CORRECTO
// Memoizar componentes si es necesario
import { memo } from 'react';

const DoctorCard = memo(function DoctorCard({ doctor }) {
  return <div>{doctor.name}</div>;
});

// Lazy loading
const AppointmentForm = lazy(() => import('./AppointmentForm'));

// Usar Next.js Image optimization
<Image src="/doctor.jpg" alt="Doctor" width={200} height={200} />

// Evitar renders innecesarios
const handleClick = useCallback(() => {
  // action
}, [dependency]);
```

## Testes

```typescript
// ✅ CORRECTO - Backend
describe('Auth Controller', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});

// ✅ CORRECTO - Frontend
describe('DoctorCard', () => {
  it('should render doctor name', () => {
    const { getByText } = render(
      <DoctorCard doctor={{ id: '1', name: 'Dr. Smith' }} />
    );
    expect(getByText('Dr. Smith')).toBeInTheDocument();
  });
});
```

## Environment Variables

```env
# ✅ CORRECTO - Nombrado bien
NEXT_PUBLIC_API_URL=http://localhost:5000/api
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-super-secret-key
NODE_ENV=development

# ❌ INCORRECTO - Sin formato claro
apiUrl=http://localhost:5000/api
db=postgresql://user:pass@localhost:5432/db
secret=key
```

## Resumen de Mejores Prácticas

1. **Tipado**: Siempre usa TypeScript para type safety
2. **Componentes**: Componentes pequeños y reutilizables
3. **Errores**: Manejar errores adecuadamente
4. **Validación**: Validar entrada en cliente y servidor
5. **Rendimiento**: Usar lazy loading, memoización
6. **Seguridad**: No guardar secretos, usar JWT, hash passwords
7. **Documentación**: Documentar funciones complejas
8. **Testing**: Escribir tests significativos
9. **Commits**: Mensajes de commit claros y descriptivos
10. **Code Review**: Revisar código antes de merging

---

Sigue estos patrones para mantener el código limpio, mantenible y escalable.
