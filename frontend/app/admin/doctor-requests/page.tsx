'use client';

import { useEffect, useState } from 'react';

type RequestItem = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  clinic?: string;
  license_number?: string;
  message?: string;
  status?: string;
  created_at?: string;
};

export default function AdminDoctorRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/doctor-requests');
    if (res.ok) {
      const data = await res.json();
      setItems(data.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approve = async (id: string) => {
    const res = await fetch(`/api/admin/doctor-requests/${id}/approve`, { method: 'POST' });
    if (res.ok) fetchRequests();
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container-main">
        <h1 className="text-3xl font-bold mb-6">Solicitudes de médicos</h1>
        {loading ? (
          <div>Cargando...</div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 && <div className="text-muted">No hay solicitudes</div>}
            {items.map((it) => (
              <div key={it.id} className="card flex justify-between items-center">
                <div>
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-sm muted">{it.email} • {it.phone}</div>
                  <div className="text-sm muted">{it.clinic} • {it.license_number}</div>
                  <div className="text-sm mt-2">{it.message}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm muted">{it.status || 'pending'}</div>
                  <button
                    onClick={() => approve(it.id)}
                    className="btn-primary"
                    disabled={it.status === 'approved'}
                  >
                    {it.status === 'approved' ? 'Aprobado' : 'Aprobar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
