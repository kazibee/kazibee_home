export const CONNECT_PROTOCOL_VERSION = '1.0';
export const CONNECT_SESSION_STORAGE_KEY = 'kazi_connect_session_id';

export interface ConnectSession {
  userId: string;
  sessionId: string;
  actorRole: 'browser_session';
  expiresAt: string;
}

export interface ConnectErrorBody {
  message?: string;
}

export interface ConnectControllerDependencies {
  fetch: typeof fetch;
  navigate(target: string): void;
  getSessionId(): string | null;
  setSessionId(value: string): void;
  clearSessionId(): void;
  getCsrfToken(): string | null;
  origin(): string;
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length));
  }
  return null;
}

export function defaultConnectDependencies(): ConnectControllerDependencies {
  return {
    fetch: (...args) => fetch(...args),
    navigate: (target) => {
      if (typeof window !== 'undefined') window.location.assign(target);
    },
    getSessionId: () => browserStorage()?.getItem(CONNECT_SESSION_STORAGE_KEY) ?? null,
    setSessionId: (value) => browserStorage()?.setItem(CONNECT_SESSION_STORAGE_KEY, value),
    clearSessionId: () => browserStorage()?.removeItem(CONNECT_SESSION_STORAGE_KEY),
    getCsrfToken: () => readCookie('kazi_connect_csrf'),
    origin: () => typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  };
}

export function createEnvelopeId(prefix: 'cor' | 'idem'): string {
  const cryptoApi = globalThis.crypto;
  const entropy = cryptoApi?.randomUUID
    ? cryptoApi.randomUUID().replaceAll('-', '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${entropy.slice(0, prefix === 'idem' ? 32 : 24).padEnd(24, '0')}`;
}

export function validateReturnTarget(value: unknown, origin = 'http://localhost'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) return '/connect';
  if (value.includes('\\') || [...value].some((character) => character.charCodeAt(0) < 32)) return '/connect';

  try {
    const target = new URL(value, origin);
    if (target.origin !== new URL(origin).origin) return '/connect';
    if (!target.pathname.startsWith('/') || target.pathname.startsWith('//')) return '/connect';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/connect';
  }
}

export function loginTarget(returnTo: string): string {
  return `/connect/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as ConnectErrorBody;
    return typeof body.message === 'string' && body.message.length > 0 ? body.message : fallback;
  } catch {
    return fallback;
  }
}

export function requestInit(body: object, csrfToken?: string): RequestInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  return {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(body),
  };
}
