import type { PageController } from '@noego/forge';
import {
  CONNECT_PROTOCOL_VERSION,
  createEnvelopeId,
  defaultConnectDependencies,
  requestInit,
  responseMessage,
  validateReturnTarget,
  type ConnectControllerDependencies,
} from './connect_shared';

type AuthMode = 'login' | 'signup';
type AuthStatus = 'idle' | 'submitting' | 'success' | 'error';

interface ConnectAuthData {
  mode: AuthMode;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  status: AuthStatus;
  error: string | null;
  returnTo: string;
  loginHref: string;
  signupHref: string;
  googleClientId: string;
}

interface ConnectAuthInput {
  setUsername(value: string): void;
  setEmail(value: string): void;
  setPassword(value: string): void;
  setConfirmPassword(value: string): void;
  submit(): Promise<void>;
  google(credential: string): Promise<void>;
}

export default class ConnectAuthController implements PageController<ConnectAuthData, ConnectAuthInput> {
  data: ConnectAuthData = $state({
    mode: 'login',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    status: 'idle',
    error: null,
    returnTo: '/connect',
    loginHref: '/connect/login',
    signupHref: '/connect/signup',
    googleClientId: '',
  });

  private readonly deps: ConnectControllerDependencies;

  constructor(dependencies?: Partial<ConnectControllerDependencies>) {
    this.deps = { ...defaultConnectDependencies(), ...dependencies };
  }

  input: ConnectAuthInput = {
    setUsername: (value) => {
      this.data.username = value;
      this.clearError();
    },
    setEmail: (value) => {
      this.data.email = value;
      this.clearError();
    },
    setPassword: (value) => {
      this.data.password = value;
      this.clearError();
    },
    setConfirmPassword: (value) => {
      this.data.confirmPassword = value;
      this.clearError();
    },
    submit: async () => {
      if (this.data.status === 'submitting' || !this.validate()) return;
      this.data.status = 'submitting';
      this.data.error = null;

      const correlationId = createEnvelopeId('cor');
      const idempotencyKey = createEnvelopeId('idem');
      const mode = this.data.mode;
      try {
        const response = await this.deps.fetch(`/v1/connect/auth/${mode}`, requestInit({
          kind: `auth.${mode}.request`,
          protocolVersion: CONNECT_PROTOCOL_VERSION,
          ...(mode === 'signup'
            ? { username: this.data.username, email: this.data.email }
            : { username: this.data.username }),
          password: this.data.password,
          idempotencyKey,
          correlationId,
        }));
        if (!response.ok) {
          throw new Error(await responseMessage(
            response,
            mode === 'login' ? 'Unable to sign in.' : 'Unable to create your account.',
          ));
        }

        const body = await response.json() as { sessionId?: string };
        this.data.password = '';
        this.data.confirmPassword = '';
        this.data.status = 'success';
        if (mode === 'login') {
          if (typeof body.sessionId !== 'string') throw new Error('The sign-in response was incomplete.');
          this.deps.setSessionId(body.sessionId);
          this.deps.navigate(this.data.returnTo);
        }
      } catch (error) {
        this.data.password = '';
        this.data.confirmPassword = '';
        this.data.status = 'error';
        this.data.error = error instanceof Error ? error.message : 'Something went wrong.';
      }
    },
    google: async (credential) => {
      if (this.data.status === 'submitting') return;
      this.data.status = 'submitting';
      this.data.error = null;
      try {
        const correlationId = createEnvelopeId('cor');
        const response = await this.deps.fetch('/v1/connect/auth/google', requestInit({
          kind: 'auth.google.request',
          protocolVersion: CONNECT_PROTOCOL_VERSION,
          credential,
          idempotencyKey: createEnvelopeId('idem'),
          correlationId,
        }));
        if (!response.ok) throw new Error(await responseMessage(response, 'Unable to sign in with Google.'));
        const body = await response.json() as { sessionId?: string };
        if (typeof body.sessionId !== 'string') throw new Error('The sign-in response was incomplete.');
        this.deps.setSessionId(body.sessionId);
        this.data.status = 'success';
        this.deps.navigate(this.data.returnTo);
      } catch (error) {
        this.data.status = 'error';
        this.data.error = error instanceof Error ? error.message : 'Something went wrong.';
      }
    },
  };

  initialize(loadData: { mode?: AuthMode; returnTo?: string; googleClientId?: string } = {}) {
    this.data.mode = loadData.mode === 'signup' ? 'signup' : 'login';
    this.data.returnTo = validateReturnTarget(loadData.returnTo, this.deps.origin());
    this.data.loginHref = `/connect/login?returnTo=${encodeURIComponent(this.data.returnTo)}`;
    this.data.signupHref = `/connect/signup?returnTo=${encodeURIComponent(this.data.returnTo)}`;
    this.data.googleClientId = loadData.googleClientId ?? '';
    if (typeof window !== 'undefined') {
      (window as Window & { handleKazibeeGoogleCredential?: (value: { credential?: string }) => void })
        .handleKazibeeGoogleCredential = (value) => {
          if (typeof value.credential === 'string') void this.input.google(value.credential);
        };
    }
  }

  destroy() {
    this.data.password = '';
    this.data.confirmPassword = '';
    if (typeof window !== 'undefined') {
      delete (window as Window & { handleKazibeeGoogleCredential?: unknown }).handleKazibeeGoogleCredential;
    }
  }

  private clearError() {
    if (this.data.status === 'error') {
      this.data.status = 'idle';
      this.data.error = null;
    }
  }

  private validate(): boolean {
    const username = this.data.username.trim();
    const usernameOrEmail = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(username)
      || username.toLowerCase() === 'shavyg2@gmail.com';
    if (!usernameOrEmail) {
      this.data.status = 'error';
      this.data.error = 'Enter a username with 3–64 letters, numbers, dots, underscores, or hyphens.';
      return false;
    }
    if (this.data.mode === 'signup' && this.data.email.trim().toLowerCase() !== 'shavyg2@gmail.com') {
      this.data.status = 'error';
      this.data.error = 'This Kazibee deployment is restricted to its configured account.';
      return false;
    }
    if (this.data.password.length < 12 || this.data.password.length > 128) {
      this.data.status = 'error';
      this.data.error = 'Password must be between 12 and 128 characters.';
      return false;
    }
    if (this.data.mode === 'signup' && this.data.password !== this.data.confirmPassword) {
      this.data.status = 'error';
      this.data.error = 'Passwords do not match.';
      return false;
    }
    return true;
  }
}
