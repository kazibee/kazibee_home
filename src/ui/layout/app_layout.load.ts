import { getLogger } from '@noego/logger';
import { currentContainer } from '../../server/container';
import { CONNECT_SESSION_COOKIE } from '../../server/services/connect_auth_policy';
import ConnectSessionAuthService from '../../server/services/connect_session_auth_service';

const logger = getLogger('kazibee:ui:app-layout');

interface FrontendExecutionInputLike {
  request: { headers: { get(name: string): string | null } };
}

function cookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** Layout for signed-in pages: resolves the account server-side via the container. */
export default async function load(input: FrontendExecutionInputLike) {
  const token = cookieFromHeader(input.request.headers.get('cookie'), CONNECT_SESSION_COOKIE);
  if (!token) return { user: null };
  try {
    const sessions = await currentContainer().get<ConnectSessionAuthService>(ConnectSessionAuthService);
    const result = await sessions.authenticate(token);
    if (!result.ok) {
      switch (result.error.kind) {
        case 'unauthorized':
          return { user: null };
        // The layout renders signed-out when the session cannot be read.
        case 'query_failed':
        case 'write_failed':
          logger.warn('Session lookup failed; rendering signed-out', { kind: result.error.kind, error: result.error.cause });
          return { user: null };
        default: {
          const unhandled: never = result.error;
          return unhandled;
        }
      }
    }
    return {
      user: {
        email: result.value.account.email,
        username: result.value.account.username,
      },
    };
  } catch {
    return { user: null };
  }
}
