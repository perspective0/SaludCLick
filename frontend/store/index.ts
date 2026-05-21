'use client';

import { create } from 'zustand';
import { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  setToken: (token) =>
    set({
      token,
    }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    }),

  setLoading: (loading) =>
    set({ loading }),
}));

// Appointments store
interface AppointmentsStore {
  appointments: any[];
  loading: boolean;
  setAppointments: (appointments: any[]) => void;
  addAppointment: (appointment: any) => void;
  removeAppointment: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppointmentsStore = create<AppointmentsStore>((set) => ({
  appointments: [],
  loading: false,

  setAppointments: (appointments) => set({ appointments }),

  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [appointment, ...state.appointments],
    })),

  removeAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    })),

  setLoading: (loading) => set({ loading }),
}));

// Doctors store
interface DoctorsStore {
  doctors: any[];
  selectedDoctor: any | null;
  loading: boolean;
  setDoctors: (doctors: any[]) => void;
  setSelectedDoctor: (doctor: any | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useDoctorsStore = create<DoctorsStore>((set) => ({
  doctors: [],
  selectedDoctor: null,
  loading: false,

  setDoctors: (doctors) => set({ doctors }),
  setSelectedDoctor: (selectedDoctor) => set({ selectedDoctor }),
  setLoading: (loading) => set({ loading }),
}));

// UI store (notifications, modals, etc)
interface UIStore {
  notification: {
    type: 'success' | 'error' | 'info' | 'warning' | null;
    message: string;
  } | null;
  showNotification: (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning'
  ) => void;
  clearNotification: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  notification: null,

  showNotification: (message, type) =>
    set({
      notification: { message, type },
    }),

  clearNotification: () =>
    set({
      notification: null,
    }),
}));
