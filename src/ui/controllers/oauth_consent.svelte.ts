import type { PageController } from '@noego/forge';
import {
  defaultConnectDependencies,
  loginTarget,
  type ConnectControllerDependencies,
} from './connect_shared';

const OAUTH_PARAM_NAMES = [
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
  'scope',
  'resource',
] as const;

type OAuthParamName = (typeof OAUTH_PARAM_NAMES)[number];

export interface ConsentExecutor {
  executor_id: string;
  display_name: string;
  presence: 'online' | 'stale' | 'offline';
  workspaces: Array<{ workspace_id: string; display_name: string; state: string }>;
}

export interface ConsentClient {
  id: string;
  name: string;
}

export interface OAuthConsentData {
  status: 'loading' | 'signed_out' | 'ready' | 'submitting' | 'error';
  error: string | null;
  client: ConsentClient | null;
  requestedAccess: 'read' | 'read_write';
  requestedScope: string;
  /** Families the client asked for beyond workspace access. */
  requestedShell: boolean;
  requestedWeb: boolean;
  /** User's toggles; the owner may grant families the app did not request. */
  allowShell: boolean;
  allowWeb: boolean;
  /** Owner's write choice; capped by the requested access. */
  allowWrite: boolean;
  /**
   * Informational: the machines the app will reach today. A connection acts
   * as the user, so it also reaches machines linked later — nothing is picked.
   */
  executors: ConsentExecutor[];
  loginHref: string;
}

export interface OAuthConsentInput {
  setAccess(access: 'read' | 'read_write'): void;
  setFamily(family: 'shell' | 'web', enabled: boolean): void;
  approve(): Promise<void>;
  deny(): Promise<void>;
}

export default class OAuthConsentController
implements PageController<OAuthConsentData, OAuthConsentInput> {
  data: OAuthConsentData = $state({
    status: 'loading',
    error: null,
    client: null,
    requestedAccess: 'read',
    requestedScope: '',
    requestedShell: false,
    requestedWeb: false,
    allowShell: false,
    allowWeb: false,
    allowWrite: false,
    executors: [],
    loginHref: '/connect/login',
  });

  private readonly deps: ConnectControllerDependencies;
  private params: Record<OAuthParamName, string> = emptyParams();

  constructor(dependencies?: Partial<ConnectControllerDependencies>) {
    this.deps = { ...defaultConnectDependencies(), ...dependencies };
  }

  input: OAuthConsentInput = {
    setAccess: (access) => {
      // Write access is capped by the request: an app that asked to read
      // must not silently gain writes.
      if (access === 'read_write' && this.data.requestedAccess !== 'read_write') return;
      this.data.allowWrite = access === 'read_write';
    },

    setFamily: (family, enabled) => {
      // The owner outranks the client's request: families can be granted even
      // when the app did not ask for them (its next call simply gets more).
      if (family === 'shell') {
        this.data.allowShell = enabled;
      } else {
        this.data.allowWeb = enabled;
      }
    },

    approve: async () => {
      const parts = ['kazibee:read'];
      if (this.data.allowWrite && this.data.requestedAccess === 'read_write') parts.push('kazibee:write');
      if (this.data.allowShell) parts.push('kazibee:shell');
      if (this.data.allowWeb) parts.push('kazibee:web');
      await this.submit('/oauth/consent/approve', {
        approved_scope: parts.join(' '),
      });
    },

    deny: async () => {
      await this.submit('/oauth/consent/deny');
    },
  };

  initialize(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    this.params = Object.fromEntries(
      OAUTH_PARAM_NAMES.map((name) => [name, url.searchParams.get(name) ?? '']),
    ) as Record<OAuthParamName, string>;
    this.data.loginHref = loginTarget(`${url.pathname}${url.search}`);
    void this.loadContext();
  }

  private async loadContext(): Promise<void> {
    this.data.status = 'loading';
    this.data.error = null;
    const sessionId = this.deps.getSessionId();
    if (!sessionId) {
      this.data.status = 'signed_out';
      return;
    }
    try {
      const query = new URLSearchParams({ ...this.params, sessionId });
      const response = await this.deps.fetch(
        `/oauth/consent/context?${query.toString()}`,
        {
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
        },
      );
      const body = await jsonBody(response);
      if (!response.ok) {
        if (response.status === 401) {
          this.data.status = 'signed_out';
          return;
        }
        throw new Error(body.message ?? 'Could not load authorization details.');
      }

      const context = body as unknown as {
        client: ConsentClient;
        requested_scope: string;
        requested_access: 'read' | 'read_write';
        requested_shell?: boolean;
        requested_web?: boolean;
        executors: ConsentExecutor[];
      };
      this.data.client = context.client;
      this.data.requestedScope = context.requested_scope;
      this.data.requestedAccess = context.requested_access;
      this.data.requestedShell = context.requested_shell === true;
      this.data.requestedWeb = context.requested_web === true;
      this.data.allowShell = this.data.requestedShell;
      this.data.allowWeb = this.data.requestedWeb;
      this.data.allowWrite = context.requested_access === 'read_write';
      this.data.executors = context.executors;
      this.data.status = 'ready';
    } catch (error) {
      this.data.status = 'error';
      this.data.error = errorMessage(
        error,
        'Could not load authorization details.',
      );
    }
  }

  private async submit(
    endpoint: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    if (this.data.status === 'submitting') return;
    const sessionId = this.deps.getSessionId();
    const csrf = this.deps.getCsrfToken();
    if (!sessionId || !csrf) {
      this.data.status = 'signed_out';
      return;
    }
    this.data.status = 'submitting';
    this.data.error = null;
    try {
      const response = await this.deps.fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrf,
        },
        body: JSON.stringify({ ...this.params, sessionId, ...extra }),
      });
      const body = await jsonBody(response);
      if (!response.ok) {
        if (response.status === 401) {
          this.data.status = 'signed_out';
          return;
        }
        throw new Error(body.message ?? 'Could not complete authorization.');
      }
      if (typeof body.redirect_to !== 'string' || !body.redirect_to) {
        throw new Error('The authorization response was incomplete.');
      }
      this.deps.navigate(body.redirect_to);
    } catch (error) {
      this.data.status = this.data.client ? 'ready' : 'error';
      this.data.error = errorMessage(
        error,
        'Could not complete authorization.',
      );
    }
  }
}

function emptyParams(): Record<OAuthParamName, string> {
  return Object.fromEntries(
    OAUTH_PARAM_NAMES.map((name) => [name, '']),
  ) as Record<OAuthParamName, string>;
}

async function jsonBody(
  response: Response,
): Promise<Record<string, unknown> & { message?: string; redirect_to?: string }> {
  return await response.json().catch(() => ({})) as Record<string, unknown> & {
    message?: string;
    redirect_to?: string;
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
