'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Redirigiendo al panel administrativo...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
