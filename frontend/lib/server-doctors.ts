type DoctorResponse<T> = {
  success?: boolean;
  data?: T;
};

function getApiUrl(path: string): string | null {
  const configuredApiUrl =
    process.env.SEO_API_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  if (!configuredApiUrl || !/^https?:\/\//i.test(configuredApiUrl)) {
    return null;
  }

  return `${configuredApiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function getPublicData<T>(path: string): Promise<T | null> {
  const url = getApiUrl(path);
  if (!url) return null;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as DoctorResponse<T>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export function getDoctorsForSeo(limit = 100) {
  return getPublicData<any[]>(`doctors?limit=${limit}`);
}

export function getDoctorForSeo(id: string) {
  return getPublicData<any>(`doctors/${encodeURIComponent(id)}`);
}

