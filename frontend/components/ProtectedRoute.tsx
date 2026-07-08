'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/utils/api';

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
        }));

        const role = userData.role;
        if (requiredRole) {
          const allowed = Array.isArray(requiredRole)
            ? requiredRole.includes(role)
            : role === requiredRole;
          if (!allowed) {
            router.push('/dashboard');
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
