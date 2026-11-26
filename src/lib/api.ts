import { AuthUser, CarSpec, PlayerProfile } from '../types/game';

// Session token held purely in JS memory so cross-origin preview iframes work even if cookies are blocked
let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Chyba servera (${res.status})`);
  }
  return data as T;
}

export interface GlobalCatalogPayload {
  customCars: CarSpec[];
  carOverrides: Record<string, CarSpec>;
}

export interface AuthSessionResponse {
  token?: string;
  user: AuthUser;
  profile: PlayerProfile;
}

export async function fetchGlobalCatalog(): Promise<GlobalCatalogPayload> {
  return apiFetch<GlobalCatalogPayload>('/api/catalog');
}

export async function fetchCurrentSession(): Promise<AuthSessionResponse | null> {
  try {
    return await apiFetch<AuthSessionResponse>('/api/auth/me');
  } catch {
    return null;
  }
}

export async function registerAccount(
  username: string,
  password: string
): Promise<AuthSessionResponse> {
  const res = await apiFetch<AuthSessionResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function loginAccount(
  username: string,
  password: string
): Promise<AuthSessionResponse> {
  const res = await apiFetch<AuthSessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function logoutAccount(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
}

export async function saveProfileToServer(profile: PlayerProfile): Promise<void> {
  await apiFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });
}

export async function resetProfileOnServer(): Promise<PlayerProfile> {
  const res = await apiFetch<{ ok: boolean; profile: PlayerProfile }>('/api/profile/reset', {
    method: 'POST',
  });
  return res.profile;
}

export async function fetchAdminStatus(): Promise<{ configured: boolean; isAdmin: boolean }> {
  return apiFetch<{ configured: boolean; isAdmin: boolean }>('/api/admin/status');
}

export async function claimAdminPasscode(passcode: string): Promise<{ isAdmin: boolean }> {
  return apiFetch<{ isAdmin: boolean }>('/api/admin/claim', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function loginAdminPasscode(passcode: string): Promise<{ isAdmin: boolean }> {
  return apiFetch<{ isAdmin: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function saveGlobalCatalog(payload: GlobalCatalogPayload): Promise<void> {
  await apiFetch('/api/admin/catalog', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
