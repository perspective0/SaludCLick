const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Make API request with error handling
 */
export async function apiRequest(
  endpoint: string,
  options: RequestOptions = {}
) {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
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
      token: getToken() || undefined,
    }),
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
    apiRequest(`/doctors/${id}`),

  getCalendar: (id: string, month: number, year: number) =>
    apiRequest(`/doctors/${id}/calendar?month=${month}&year=${year}`, {
      token: getToken() || undefined,
    }),

  getPatients: (id: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/doctors/${id}/patients?${queryString}`, {
      method: 'GET',
      token: getToken() || undefined,
    });
  },

  update: (id: string, data: any) =>
    apiRequest(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token: getToken() || undefined,
    }),
};

/**
 * Appointment API calls
 */
export const appointmentAPI = {
  create: (data: any) =>
    apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
      token: getToken() || undefined,
    }),

  list: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/appointments?${queryString}`, {
      token: getToken() || undefined,
    });
  },

  getById: (id: string) =>
    apiRequest(`/appointments/${id}`, {
      token: getToken() || undefined,
    }),

  getAvailableSlots: (doctorId: string, date: string) =>
    apiRequest(`/appointments/${doctorId}/available-slots?date=${date}`),

  update: (id: string, data: any) =>
    apiRequest(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token: getToken() || undefined,
    }),

  cancel: (id: string, reason: string) =>
    apiRequest(`/appointments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
      token: getToken() || undefined,
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
      token: getToken() || undefined,
    }),

  getPatientHistory: (patientId: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/medical-records/${patientId}?${queryString}`, {
      token: getToken() || undefined,
    });
  },

  getRecord: (patientId: string, recordId: string) =>
    apiRequest(`/medical-records/${patientId}/${recordId}`, {
      token: getToken() || undefined,
    }),

  createPrescription: (data: any) =>
    apiRequest('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
      token: getToken() || undefined,
    }),

  getPatientPrescriptions: (patientId: string, params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/prescriptions/patient/${patientId}?${queryString}`, {
      token: getToken() || undefined,
    });
  },
};
