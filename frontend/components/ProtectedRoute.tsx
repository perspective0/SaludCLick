'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, saveToken } from '@/utils/api';

function dashboardForRole(role: string) {
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'secretary') return '/secretary/dashboard';
  return '/patient/dashboard';
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string | string[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      try {
        const token = new URLSearchParams(window.location.search).get('token');
        if (token) {
          saveToken(token);
          const cleanUrl = `${window.location.pathname}${window.location.hash}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        const response = await authAPI.me();
        const userData = response?.data;

        if (!userData) {
          router.push('/login');
          return;
        }

        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name || userData.firstName,
          lastName: userData.last_name || userData.lastName,
          role: userData.role,
          avatar: userData.avatar,
          isVerified: userData.doctor_verified !== false,
        }));

        const role = userData.role;
        const canCompletePendingProfile = window.location.pathname.startsWith('/doctor/profile');
        if (role === 'doctor' && userData.doctor_verified === false && !canCompletePendingProfile && !window.location.pathname.startsWith('/doctor/pending-approval')) {
          router.replace('/doctor/pending-approval');
          return;
        }
        if (requiredRole) {
          const allowed = Array.isArray(requiredRole)
            ? requiredRole.includes(role)
            : role === requiredRole;
          if (!allowed) {
            router.replace(dashboardForRole(role));
            return;
          }
        }

        if (active) setIsAuthorized(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    verifySession();
    return () => {
      active = false;
    };
  }, [requiredRole, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
