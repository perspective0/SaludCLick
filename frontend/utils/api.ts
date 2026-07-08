const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions extends RequestInit {
  retries?: number;
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function isMutatingMethod(method?: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase());
}

export function withCsrfHeaders(headers: HeadersInit = {}) {
  const nextHeaders = new Headers(headers);
  const csrfToken = getCookie('saludclick_csrf');
  if (csrfToken) {
    nextHeaders.set('X-CSRF-Token', csrfToken);
  }
  return nextHeaders;
}

/**
 * Make API request with error handling
 */
export async function apiRequest(
  endpoint: string,
  options: RequestOptions = {}
) {
  const { retries = 0, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers as HeadersInit);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (isMutatingMethod(fetchOptions.method)) {
    const csrfToken = getCookie('saludclick_csrf');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  const url = `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: fetchOptions.credentials || 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      const requestError = new Error(error.message || `HTTP error! status: ${response.status}`) as Error & { status?: number; code?: string; data?: any };
      requestError.status = response.status;
      requestError.code = error.code;
      requestError.data = error.data;
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
      throw requestError;
    }

    return await response.json();
  } catch (error) {
    const status = (error as Error & { status?: number })?.status;
    if (retries > 0 && (!status || status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return apiRequest(endpoint, { ...options, retries: retries - 1 });
    }
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Save auth token to localStorage
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

/**
 * Remove auth token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

function toQueryString(params: Record<string, any> = {}) {
  const cleanParams = Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') return acc;
    acc[key] = String(value);
    return acc;
  }, {});

  return new URLSearchParams(cleanParams).toString();
}

/**
 * Auth API calls
 */
export const authAPI = {
  register: (data: any) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    apiRequest('/auth/me'),
};

/**
 * Doctor API calls
 */
export const doctorAPI = {
  list: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/doctors?${queryString}`);
  },

  getById: (id: string) =>
    apiRequest(`/doctors/${id}`, {
    }),

  getCalendar: (id: string, month: number, year: number) =>
    apiRequest(`/doctors/${id}/calendar?month=${month}&year=${year}`, {
    }),

  listHealthCenters: () =>
    apiRequest('/doctors/health-centers/list'),

  listLaboratories: () =>
    apiRequest('/doctors/laboratories/list', {
    }),

  getPatients: (id: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/doctors/${id}/patients?${queryString}`, {
      method: 'GET',
    });
  },

  createManualPatient: (id: string, data: any) =>
    apiRequest(`/doctors/${id}/patients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadAvatar: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await fetch(`${API_URL}/doctors/${id}/avatar`, {
      method: 'POST',
      headers: withCsrfHeaders(),
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  uploadPrescriptionLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await fetch(`${API_URL}/doctors/${id}/prescription-logo`, {
      method: 'POST',
      headers: withCsrfHeaders(),
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  uploadPrescriptionSeal: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('seal', file);
    const response = await fetch(`${API_URL}/doctors/${id}/prescription-seal`, {
      method: 'POST',
      headers: withCsrfHeaders(),
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

/**
 * Appointment API calls
 */
export const appointmentAPI = {
  create: (data: any) =>
    apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params: Record<string, any> = {}) => {
    const queryString = toQueryString(params);
    return apiRequest(`/appointments${queryString ? `?${queryString}` : ''}`, {
    });
  },

  getById: (id: string) =>
    apiRequest(`/appointments/${id}`, {
    }),

  getTeleconsultationRoom: (roomId: string) =>
    apiRequest(`/appointments/teleconsulta/${roomId}`, {
    }),

  getTeleconsultationSignals: (roomId: string, after = 0) =>
    apiRequest(`/appointments/teleconsulta/${roomId}/signals?after=${after}`, {
    }),

  postTeleconsultationSignal: (roomId: string, data: any) =>
    apiRequest(`/appointments/teleconsulta/${roomId}/signals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAvailableSlots: (doctorId: string, date: string, healthCenterId?: string) => {
    const params = new URLSearchParams({ date });
    if (healthCenterId) params.set('healthCenterId', healthCenterId);
    return apiRequest(`/appointments/${doctorId}/available-slots?${params.toString()}`);
  },

  update: (id: string, data: any) =>
    apiRequest(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cancel: (id: string, reason: string) =>
    apiRequest(`/appointments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
};

/**
 * Medical records API calls
 */
export const medicalAPI = {
  createRecord: (data: any) =>
    apiRequest('/medical-records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPatientHistory: (patientId: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/medical-records/${patientId}?${queryString}`, {
    });
  },

  getRecord: (patientId: string, recordId: string) =>
    apiRequest(`/medical-records/${patientId}/${recordId}`, {
    }),

  createPrescription: (data: any) =>
    apiRequest('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPatientPrescriptions: (patientId: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/prescriptions/patient/${patientId}?${queryString}`, {
    });
  },

  getPrescription: (id: string) =>
    apiRequest(`/prescriptions/${id}`, {
    }),

  cancelPrescription: (id: string, reason?: string) =>
    apiRequest(`/prescriptions/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  getPrescriptionPrintUrl: (id: string) => `${API_URL}/prescriptions/${id}/print`,

  getPrescriptionPrintHtml: async (id: string) => {
    const response = await fetch(`${API_URL}/prescriptions/${id}/print`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.text();
  },

  downloadPrescriptionPdf: async (id: string) => {
    const response = await fetch(`${API_URL}/prescriptions/${id}/pdf`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  },

  verifyPrescription: (code: string) =>
    apiRequest(`/prescriptions/verify/${code}`),

  createLabOrder: (data: any) =>
    apiRequest('/lab-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPatientLabOrders: (patientId: string) =>
    apiRequest(`/lab-orders/patient/${patientId}`, {
    }),

  getStudyCatalog: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/lab-orders/catalog${queryString ? `?${queryString}` : ''}`, {
    });
  },

  getDocumentTemplates: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/lab-orders/document-templates${queryString ? `?${queryString}` : ''}`, {
    });
  },

  saveDocumentTemplate: (data: any) =>
    apiRequest('/lab-orders/document-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelLabOrder: (id: string, reason?: string) =>
    apiRequest(`/lab-orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  getLabOrderPrintHtml: async (id: string) => {
    const response = await fetch(`${API_URL}/lab-orders/${id}/print`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.text();
  },
};

export const patientAPI = {
  dashboard: () =>
    apiRequest('/patient/dashboard', {
    }),

  appointments: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/patient/appointments${queryString ? `?${queryString}` : ''}`, {
    });
  },

  confirmAppointment: (id: string) =>
    apiRequest(`/patient/appointments/${id}/confirm`, {
      method: 'PUT',
    }),

  prescriptions: () =>
    apiRequest('/patient/prescriptions', {
    }),

  documents: () =>
    apiRequest('/patient/documents', {
    }),

  prescription: (id: string) =>
    apiRequest(`/patient/prescriptions/${id}`, {
    }),

  profile: () =>
    apiRequest('/patient/profile', {
    }),

  updateProfile: (data: any) =>
    apiRequest('/patient/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getPrescriptionPrintUrl: (id: string) => `${API_URL}/prescriptions/${id}/print`,
  getDocumentPrintUrl: (id: string) => `${API_URL}/lab-orders/${id}/print`,
  getDocumentPrintHtml: async (id: string) => {
    const response = await fetch(`${API_URL}/lab-orders/${id}/print`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.text();
  },
};

/**
 * Secretary API
 */
export const secretaryAPI = {
  create: (data: any) =>
    apiRequest('/secretaries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/secretaries?${queryString}`, {
      method: 'GET',
    });
  },
  assignedDoctors: () =>
    apiRequest('/secretaries/doctors', {
      method: 'GET',
    }),
  search: (email: string) =>
    apiRequest(`/secretaries/search?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    }),
  update: (id: string, data: any) =>
    apiRequest(`/secretaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/secretaries/${id}${queryString ? `?${queryString}` : ''}`, {
      method: 'DELETE',
    });
  },
};

export const adminAPI = {
  stats: () =>
    apiRequest('/admin/stats', {
    }),

  activity: () =>
    apiRequest('/admin/activity', {
    }),

  getSettings: () =>
    apiRequest('/admin/settings', {
    }),

  updateSettings: (section: string, data: any) =>
    apiRequest(`/admin/settings/${section}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getWhatsAppStatus: () =>
    apiRequest('/admin/whatsapp/status', {
    }),

  sendWhatsAppTest: (data: { to?: string; templateName?: string; languageCode?: string }) =>
    apiRequest('/admin/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listUsers: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/users${queryString ? `?${queryString}` : ''}`, {
    });
  },

  createUser: (data: any) =>
    apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: any) =>
    apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateUserPassword: (id: string, password: string) =>
    apiRequest(`/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }),

  deleteUser: (id: string) =>
    apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  listHealthCenters: () =>
    apiRequest('/admin/health-centers', {
    }),

  createHealthCenter: (data: any) =>
    apiRequest('/admin/health-centers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateHealthCenter: (id: string, data: any) =>
    apiRequest(`/admin/health-centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteHealthCenter: (id: string) =>
    apiRequest(`/admin/health-centers/${id}`, {
      method: 'DELETE',
    }),

  listLaboratories: () =>
    apiRequest('/admin/laboratories', {
    }),

  createLaboratory: (data: any) =>
    apiRequest('/admin/laboratories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLaboratory: (id: string, data: any) =>
    apiRequest(`/admin/laboratories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLaboratory: (id: string) =>
    apiRequest(`/admin/laboratories/${id}`, {
      method: 'DELETE',
    }),

  listAppointments: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/appointments${queryString ? `?${queryString}` : ''}`, {
    });
  },

  cancelAppointment: (id: string) =>
    apiRequest(`/admin/appointments/${id}`, {
      method: 'DELETE',
    }),

  getReports: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/reports${queryString ? `?${queryString}` : ''}`, {
    });
  },

  listDoctorPayments: (period?: string) =>
    apiRequest(`/admin/doctor-payments${period ? `?period=${encodeURIComponent(period)}` : ''}`, {
    }),

  updateDoctorPayment: (doctorId: string, data: any) =>
    apiRequest(`/admin/doctor-payments/${doctorId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  rejectDoctorRequest: (id: string, reason: string) =>
    apiRequest(`/admin/doctor-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  listDoctorRequests: () =>
    apiRequest('/admin/doctor-requests', {
    }),

  approveDoctorRequest: (id: string) =>
    apiRequest(`/admin/doctor-requests/${id}/approve`, {
      method: 'POST',
    }),

  verifyDoctorRequest: (id: string) =>
    apiRequest(`/admin/doctor-requests/${id}/verify`, {
      method: 'POST',
    }),

  reviewDoctorVerification: (id: string, data: { status: 'approved' | 'rejected'; notes?: string }) =>
    apiRequest(`/admin/doctor-requests/${id}/verification-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const clinicalAPI = {
  searchIcd10: (search: string, limit = 8) =>
    apiRequest(`/icd10/search?search=${encodeURIComponent(search)}&limit=${limit}`, {
    }),

  getSummary: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/clinical-summary`, {
    }),

  getTimeline: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/timeline`, {
    }),

  getVitalSigns: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/vital-signs`, {
    }),

  createVitalSigns: (patientId: string, data: any) =>
    apiRequest(`/doctor/patients/${patientId}/vital-signs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAllergies: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/allergies`, {
    }),

  createAllergy: (patientId: string, data: any) =>
    apiRequest(`/doctor/patients/${patientId}/allergies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMedications: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/medications`, {
    }),

  createMedication: (patientId: string, data: any) =>
    apiRequest(`/doctor/patients/${patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDiagnoses: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/diagnoses`, {
    }),

  createDiagnosis: (patientId: string, data: any) =>
    apiRequest(`/doctor/patients/${patientId}/diagnoses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAntecedents: (patientId: string) =>
    apiRequest(`/doctor/patients/${patientId}/antecedents`, {
    }),

  saveAntecedents: (patientId: string, data: any) =>
    apiRequest(`/doctor/patients/${patientId}/antecedents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConsultationDraft: (patientId: string) =>
    apiRequest(`/doctor/consultation-drafts/${patientId}`, {
    }),

  saveConsultationDraft: (data: any) =>
    apiRequest('/doctor/consultation-drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  finalizeConsultationDraft: (id: string) =>
    apiRequest(`/doctor/consultation-drafts/${id}/finalize`, {
      method: 'POST',
    }),

  deleteConsultationDraft: (id: string) =>
    apiRequest(`/doctor/consultation-drafts/${id}`, {
      method: 'DELETE',
    }),
};

export const vademecumAPI = {
  search: (search: string, limit = 12) =>
    apiRequest(`/vademecum/search?search=${encodeURIComponent(search)}&limit=${limit}`, {
    }),

  detail: (id: string) =>
    apiRequest(`/vademecum/${id}`, {
    }),

  favorites: () =>
    apiRequest('/vademecum/favorites', {
    }),

  addFavorite: (medicamentoId: string) =>
    apiRequest('/vademecum/favorites', {
      method: 'POST',
      body: JSON.stringify({ medicamentoId }),
    }),

  removeFavorite: (id: string) =>
    apiRequest(`/vademecum/favorites/${id}`, {
      method: 'DELETE',
    }),

  recent: () =>
    apiRequest('/vademecum/recent', {
    }),

  validate: (data: any) =>
    apiRequest('/vademecum/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  create: (data: any) =>
    apiRequest('/vademecum', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest(`/vademecum/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const feedbackAPI = {
  create: (data: any) =>
    apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/feedback${queryString ? `?${queryString}` : ''}`, {
    });
  },

  update: (id: string, data: any) =>
    apiRequest(`/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const notificationAPI = {
  getVapidPublicKey: () =>
    apiRequest('/notifications/vapid-public-key'),

  subscribe: (subscription: PushSubscription) =>
    apiRequest('/notifications/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    }),

  list: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/notifications${queryString ? `?${queryString}` : ''}`, {
    });
  },

  markRead: () =>
    apiRequest('/notifications/read-all', {
      method: 'PUT',
    }),

  markOneRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  archive: (id: string) =>
    apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    }),
};

