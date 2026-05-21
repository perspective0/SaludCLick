'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (requiredRole && userData.role !== requiredRole) {
        router.push('/dashboard');
        return;
      }
      setIsAuthorized(true);
    } catch (error) {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [requiredRole, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
