export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return `http://${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}

const TOKEN_STORAGE_KEY = 'engida_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'engida_refresh_token';

let inMemoryToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

// Initialize tokens from localStorage if in browser environment
if (typeof window !== 'undefined') {
  try {
    inMemoryToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    inMemoryRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    inMemoryToken = null;
    inMemoryRefreshToken = null;
  }
}

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage write failures
    }
  }
}

export function setRefreshToken(token: string | null) {
  inMemoryRefreshToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage write failures
    }
  }
}

export function getAccessToken(): string | null {
  if (!inMemoryToken && typeof window !== 'undefined') {
    try {
      inMemoryToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      inMemoryToken = null;
    }
  }
  return inMemoryToken;
}

export function getRefreshToken(): string | null {
  if (!inMemoryRefreshToken && typeof window !== 'undefined') {
    try {
      inMemoryRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      inMemoryRefreshToken = null;
    }
  }
  return inMemoryRefreshToken;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

// Deduplication singleton promise for concurrent token refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function executeTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const baseUrl = getApiBaseUrl();
  const currentRefreshToken = getRefreshToken();

  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentRefreshToken) {
        headers['x-refresh-token'] = currentRefreshToken;
      }

      const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken: currentRefreshToken || undefined }),
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newToken = (refreshData.accessToken as string) || null;
        const newRefreshToken = (refreshData.refreshToken as string) || null;

        setAccessToken(newToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }
        return newToken;
      } else if (refreshResponse.status === 401 || refreshResponse.status === 403) {
        // Only clear credentials when server explicitly rejects the session
        setAccessToken(null);
        setRefreshToken(null);
        return null;
      } else {
        // Ephemeral server error (500, 502, 503) -> DO NOT wipe tokens!
        return inMemoryToken;
      }
    } catch (networkErr) {
      console.warn('Network issue during session refresh; retaining local session:', networkErr);
      // DO NOT clear tokens on offline/network glitches!
      return inMemoryToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const isFormData = typeof FormData !== 'undefined' && restOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders as Record<string, string>),
  };

  const token = getAccessToken();
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include', // Include HttpOnly cookies (for refreshToken)
  });

  // Handle 401 Unauthorized -> attempt silent refresh token call with deduplication
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    const newToken = await executeTokenRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restOptions,
        headers,
        credentials: 'include',
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'An error occurred during API request';
    throw new Error(errorMsg);
  }

  return data as T;
}

function extractFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match?.[1]?.trim() || fallback;
}

/**
 * Download an authenticated CSV/file response. A plain anchor cannot carry the
 * bearer token, so this keeps the same refresh flow as apiFetch and hands the
 * browser a temporary object URL.
 */
export async function downloadAuthedFile(
  endpoint: string,
  fallbackFilename = 'engida-export.csv',
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {};

  const dlToken = getAccessToken();
  if (dlToken) headers['Authorization'] = `Bearer ${dlToken}`;

  let response = await fetch(url, { headers, credentials: 'include' });
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    const newToken = await executeTokenRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { headers, credentials: 'include' });
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'The export could not be prepared';
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = extractFilename(
    response.headers.get('content-disposition'),
    fallbackFilename,
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Build the URL that starts the Google Sign-In flow on the backend.
 * The backend owns the OAuth client, verifies the identity and then hands the
 * session back to the app through an HttpOnly refresh cookie.
 */
export function getGoogleAuthUrl(nextPath?: string): string {
  const baseUrl = getApiBaseUrl();
  const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
  return `${baseUrl}/auth/google${query}`;
}

export function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
