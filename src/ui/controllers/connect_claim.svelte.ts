import { Component } from '@noego/ioc/framework/decorators/Component';
import { LoadAs } from '@noego/ioc/framework/implementation/LoadAs';
import type { PageController } from '@noego/forge';
import {
  CONNECT_PROTOCOL_VERSION,
  createEnvelopeId,
  defaultConnectDependencies,
  loginTarget,
  requestInit,
  responseMessage,
  validateReturnTarget,
  type ConnectControllerDependencies,
} from './connect_shared';

type ClaimStatus = 'pending' | 'accepted' | 'denied' | 'expired';
interface ClaimReview {
  claimKind: 'executor' | 'desktop';
  claimId: string;
  status: ClaimStatus;
  displayName: string;
  platform: 'macos' | 'linux' | 'windows';
  architecture: 'x64' | 'arm64';
  clientVersion: string;
  keyFingerprint: string;
  expiresAt: string;
}

interface ClaimData {
  status: 'loading' | 'ready' | 'error' | 'signed-out';
  claim: ClaimReview | null;
  error: string | null;
  decisionStatus: 'idle' | 'submitting' | 'accepted' | 'denied';
  returnTarget: string;
  fingerprintLabel: string;
  expiryLabel: string;
}

interface ClaimInput {
  refresh(): Promise<void>;
  decide(decision: 'accept' | 'deny'): Promise<void>;
}

@Component({ scope: LoadAs.Scoped })
export default class ConnectClaimController implements PageController<ClaimData, ClaimInput> {
  data: ClaimData = $state({
    status: 'loading',
    claim: null,
    error: null,
    decisionStatus: 'idle',
    returnTarget: '/connect',
    fingerprintLabel: '',
    expiryLabel: '',
  });

  private readonly deps: ConnectControllerDependencies;
  private claimLookup = '';
  private sessionId: string | null = null;

  constructor(dependencies?: Partial<ConnectControllerDependencies>) {
    this.deps = { ...defaultConnectDependencies(), ...dependencies };
  }

  input: ClaimInput = {
    refresh: async () => {
      this.sessionId = this.deps.getSessionId();
      if (!this.sessionId) {
        this.signedOut();
        return;
      }
      this.data.status = 'loading';
      this.data.error = null;
      const query = new URLSearchParams({
        sessionId: this.sessionId,
        correlationId: createEnvelopeId('cor'),
      });
      try {
        const response = await this.review('executor', query);
        if (response.status === 401) {
          this.signedOut();
          return;
        }
        let selected = response;
        let claim = await this.decodeReview('executor', selected);
        if (this.mayFallback(selected, claim)) {
          selected = await this.review('desktop', query);
          if (selected.status === 401) {
            this.signedOut();
            return;
          }
          claim = await this.decodeReview('desktop', selected);
        }
        if (!selected.ok || !this.isClaimReview(claim)) {
          throw new Error(this.reviewError(claim, 'Unable to load this connection request.'));
        }
        this.applyClaim(claim);
        this.data.status = 'ready';
      } catch (error) {
        this.data.status = 'error';
        this.data.error = error instanceof Error ? error.message : 'Unable to load this connection request.';
      }
    },
    decide: async (decision) => {
      const claim = this.data.claim;
      const sessionId = this.sessionId ?? this.deps.getSessionId();
      const csrf = this.deps.getCsrfToken();
      if (!claim || claim.status !== 'pending' || this.data.decisionStatus === 'submitting') return;
      if (!sessionId) {
        this.signedOut();
        return;
      }
      if (!csrf) {
        this.data.error = 'Your security token is unavailable. Sign in again.';
        return;
      }
      this.data.decisionStatus = 'submitting';
      this.data.error = null;
      try {
        const response = await this.deps.fetch(
          `/v1/connect/${claim.claimKind === 'desktop' ? 'desktops' : 'executors'}/claims/${encodeURIComponent(claim.claimId)}/decision`,
          requestInit({
            kind: `${claim.claimKind}.claim.decision.request`,
            protocolVersion: CONNECT_PROTOCOL_VERSION,
            claimId: claim.claimId,
            sessionId,
            actorRole: 'browser_session',
            decision,
            idempotencyKey: createEnvelopeId('idem'),
            correlationId: createEnvelopeId('cor'),
          }, csrf),
        );
        if (response.status === 401) {
          this.signedOut();
          return;
        }
        if (!response.ok) throw new Error(await responseMessage(response, `Unable to ${decision} this request.`));
        const body = await response.json() as { status: 'accepted' | 'denied' };
        claim.status = body.status;
        this.data.decisionStatus = body.status;
      } catch (error) {
        this.data.decisionStatus = 'idle';
        this.data.error = error instanceof Error ? error.message : `Unable to ${decision} this request.`;
      }
    },
  };

  initialize(loadData: { claimId?: string; claim?: ClaimReview; skipInitialLoad?: boolean } = {}) {
    this.claimLookup = typeof loadData.claimId === 'string' ? loadData.claimId : '';
    this.data.returnTarget = validateReturnTarget(`/connect/claim/${encodeURIComponent(this.claimLookup)}`, this.deps.origin());
    if (loadData.claim) {
      this.applyClaim(loadData.claim);
      this.data.status = 'ready';
    }
    if (!loadData.skipInitialLoad && !loadData.claim) void this.input.refresh();
  }

  destroy() {}

  private review(kind: 'executor' | 'desktop', query: URLSearchParams) {
    const collection = kind === 'desktop' ? 'desktops' : 'executors';
    return this.deps.fetch(
      `/v1/connect/${collection}/claims/review/${encodeURIComponent(this.claimLookup)}?${query}`,
      { credentials: 'same-origin' },
    );
  }

  private async decodeReview(kind: 'executor' | 'desktop', response: Response):
    Promise<ClaimReview | Record<string, unknown> | null> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return null;
    }
    if (!response.ok || typeof body !== 'object' || body === null || Array.isArray(body)) {
      return typeof body === 'object' && body !== null && !Array.isArray(body)
        ? body as Record<string, unknown> : null;
    }
    const value = body as Record<string, unknown>;
    const expected = `${kind}.claim.review.response`;
    const versionKey = kind === 'desktop' ? 'desktopVersion' : 'executorVersion';
    if (value.kind !== expected || value.protocolVersion !== CONNECT_PROTOCOL_VERSION
      || typeof value.claimId !== 'string' || typeof value[versionKey] !== 'string') return null;
    return {
      claimKind: kind,
      claimId: value.claimId,
      status: value.status as ClaimStatus,
      displayName: value.displayName as string,
      platform: value.platform as ClaimReview['platform'],
      architecture: value.architecture as ClaimReview['architecture'],
      clientVersion: value[versionKey] as string,
      keyFingerprint: value.keyFingerprint as string,
      expiresAt: value.expiresAt as string,
    };
  }

  private mayFallback(response: Response, value: ClaimReview | Record<string, unknown> | null) {
    if (response.ok) return value === null;
    return response.status === 404
      && value !== null
      && !('claimKind' in value)
      && value.code === 'invalid-envelope';
  }

  private isClaimReview(value: ClaimReview | Record<string, unknown> | null): value is ClaimReview {
    return value !== null && 'claimKind' in value;
  }

  private reviewError(value: ClaimReview | Record<string, unknown> | null, fallback: string) {
    return value && !('claimKind' in value) && typeof value.message === 'string'
      ? value.message : fallback;
  }

  private applyClaim(claim: ClaimReview) {
    this.data.claim = { ...claim };
    this.data.fingerprintLabel = claim.keyFingerprint.replace(/(.{8})/g, '$1 ').trim();
    this.data.expiryLabel = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(Date.parse(claim.expiresAt));
    if (claim.status === 'accepted' || claim.status === 'denied') this.data.decisionStatus = claim.status;
  }

  private signedOut() {
    this.deps.clearSessionId();
    this.data.status = 'signed-out';
    this.deps.navigate(loginTarget(this.data.returnTarget));
  }
}
