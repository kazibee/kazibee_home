import type { PageController } from '@noego/forge';
import {
  CONNECT_PROTOCOL_VERSION,
  createEnvelopeId,
  defaultConnectDependencies,
  loginTarget,
  requestInit,
  responseMessage,
  type ConnectControllerDependencies,
} from './connect_shared';

export type ExecutorPresence = 'online' | 'offline' | 'stale';
export type ExecutorState = 'active' | 'revoked' | 'archived';

export interface ExecutorSummary {
  executorId: string;
  displayName: string;
  state: ExecutorState;
  online: boolean;
  presence: ExecutorPresence;
  protocolVersion: '1.0';
}

export interface ExecutorCard extends ExecutorSummary {
  statusLabel: 'Online' | 'Offline' | 'Stale' | 'Revoked' | 'Archived';
  statusTone: 'green' | 'neutral' | 'amber' | 'red';
  canManage: boolean;
}

export interface ConnectionMember {
  executorId: string;
  displayName: string;
  workspaceId: string;
  scope: 'read' | 'read_write';
}

export interface ConnectionCard {
  connectionId: string;
  clientName: string;
  approvedScope: 'read' | 'read_write';
  allowShell: boolean;
  allowWeb: boolean;
  status: string;
  members: ConnectionMember[];
}

interface ConnectionEdit {
  access: 'read' | 'read_write';
  allowShell: boolean;
  allowWeb: boolean;
}

interface DashboardData {
  status: 'loading' | 'ready' | 'error' | 'signed-out';
  executors: ExecutorCard[];
  error: string | null;
  actionError: string | null;
  renameId: string | null;
  renameValue: string;
  revokeId: string | null;
  busyId: string | null;
  connections: ConnectionCard[];
  connectionsError: string | null;
  editConnectionId: string | null;
  connectionEdit: ConnectionEdit;
  revokeConnectionId: string | null;
  connectionBusyId: string | null;
}

interface DashboardInput {
  refresh(): Promise<void>;
  openConnectionEdit(connectionId: string): void;
  setConnectionEdit(patch: Partial<ConnectionEdit>): void;
  cancelConnectionEdit(): void;
  saveConnection(): Promise<void>;
  openConnectionRevoke(connectionId: string): void;
  cancelConnectionRevoke(): void;
  revokeConnection(): Promise<void>;
  openRename(executorId: string): void;
  setRenameValue(value: string): void;
  cancelRename(): void;
  rename(): Promise<void>;
  openRevoke(executorId: string): void;
  cancelRevoke(): void;
  revoke(): Promise<void>;
  logout(): Promise<void>;
}

export function presentExecutor(executor: ExecutorSummary): ExecutorCard {
  if (executor.state === 'revoked') {
    return { ...executor, statusLabel: 'Revoked', statusTone: 'red', canManage: false };
  }
  if (executor.state === 'archived') {
    return { ...executor, statusLabel: 'Archived', statusTone: 'neutral', canManage: false };
  }
  if (executor.presence === 'online') {
    return { ...executor, statusLabel: 'Online', statusTone: 'green', canManage: true };
  }
  if (executor.presence === 'stale') {
    return { ...executor, statusLabel: 'Stale', statusTone: 'amber', canManage: true };
  }
  return { ...executor, statusLabel: 'Offline', statusTone: 'neutral', canManage: true };
}

export default class ConnectDashboardController implements PageController<DashboardData, DashboardInput> {
  data: DashboardData = $state({
    status: 'loading',
    executors: [],
    error: null,
    actionError: null,
    renameId: null,
    renameValue: '',
    revokeId: null,
    busyId: null,
    connections: [],
    connectionsError: null,
    editConnectionId: null,
    connectionEdit: { access: 'read', allowShell: false, allowWeb: false },
    revokeConnectionId: null,
    connectionBusyId: null,
  });

  private readonly deps: ConnectControllerDependencies;
  private sessionId: string | null = null;

  constructor(dependencies?: Partial<ConnectControllerDependencies>) {
    this.deps = { ...defaultConnectDependencies(), ...dependencies };
  }

  input: DashboardInput = {
    refresh: async () => {
      this.sessionId = this.deps.getSessionId();
      if (!this.sessionId) {
        this.signedOut();
        return;
      }
      this.data.status = 'loading';
      this.data.error = null;
      const correlationId = createEnvelopeId('cor');
      try {
        const query = new URLSearchParams({ sessionId: this.sessionId, correlationId });
        const response = await this.deps.fetch(`/v1/connect/executors?${query}`, {
          credentials: 'same-origin',
        });
        if (response.status === 401) {
          this.signedOut();
          return;
        }
        if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load your executors.'));
        const body = await response.json() as { executors?: ExecutorSummary[] };
        this.data.executors = Array.isArray(body.executors) ? body.executors.map(presentExecutor) : [];
        this.data.status = 'ready';
      } catch (error) {
        this.data.status = 'error';
        this.data.error = error instanceof Error ? error.message : 'Unable to load your executors.';
      }
      await this.loadConnections();
    },
    openConnectionEdit: (connectionId) => {
      const connection = this.data.connections.find((item) => item.connectionId === connectionId);
      if (!connection || connection.status !== 'active') return;
      this.data.editConnectionId = connectionId;
      this.data.connectionEdit = {
        access: connection.approvedScope,
        allowShell: connection.allowShell,
        allowWeb: connection.allowWeb,
      };
      this.data.revokeConnectionId = null;
      this.data.connectionsError = null;
    },
    setConnectionEdit: (patch) => {
      this.data.connectionEdit = { ...this.data.connectionEdit, ...patch };
      this.data.connectionsError = null;
    },
    cancelConnectionEdit: () => {
      this.data.editConnectionId = null;
    },
    saveConnection: async () => {
      const connectionId = this.data.editConnectionId;
      if (!connectionId || this.data.connectionBusyId) return;
      const edit = this.data.connectionEdit;
      await this.mutateConnection(connectionId, 'update', {
        access: edit.access,
        allowShell: edit.allowShell,
        allowWeb: edit.allowWeb,
      }, async () => {
        this.data.connections = this.data.connections.map((item) =>
          item.connectionId === connectionId
            ? {
                ...item,
                approvedScope: edit.access,
                allowShell: edit.allowShell,
                allowWeb: edit.allowWeb,
                members: edit.access === 'read'
                  ? item.members.map((member) => ({ ...member, scope: 'read' as const }))
                  : item.members,
              }
            : item);
        this.input.cancelConnectionEdit();
      });
    },
    openConnectionRevoke: (connectionId) => {
      const connection = this.data.connections.find((item) => item.connectionId === connectionId);
      if (!connection || connection.status !== 'active') return;
      this.data.revokeConnectionId = connectionId;
      this.data.editConnectionId = null;
      this.data.connectionsError = null;
    },
    cancelConnectionRevoke: () => {
      this.data.revokeConnectionId = null;
    },
    revokeConnection: async () => {
      const connectionId = this.data.revokeConnectionId;
      if (!connectionId || this.data.connectionBusyId) return;
      await this.mutateConnection(connectionId, 'revoke', {}, async () => {
        // Revoked connections disappear (the listing is active-only).
        this.data.connections = this.data.connections.filter((item) =>
          item.connectionId !== connectionId);
        this.input.cancelConnectionRevoke();
      });
    },
    openRename: (executorId) => {
      const executor = this.data.executors.find((item) => item.executorId === executorId);
      if (!executor?.canManage) return;
      this.data.renameId = executorId;
      this.data.renameValue = executor.displayName;
      this.data.revokeId = null;
      this.data.actionError = null;
    },
    setRenameValue: (value) => {
      this.data.renameValue = value;
      this.data.actionError = null;
    },
    cancelRename: () => {
      this.data.renameId = null;
      this.data.renameValue = '';
    },
    rename: async () => {
      const executorId = this.data.renameId;
      const displayName = this.data.renameValue.trim();
      if (!executorId || this.data.busyId) return;
      if (!/^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$/.test(displayName)) {
        this.data.actionError = 'Name must be 1–80 characters and start with a letter or number.';
        return;
      }
      await this.mutate(executorId, 'rename', {
        kind: 'executor.rename.request',
        protocolVersion: CONNECT_PROTOCOL_VERSION,
        executorId,
        displayName,
        idempotencyKey: createEnvelopeId('idem'),
        correlationId: createEnvelopeId('cor'),
      }, async (response) => {
        const body = await response.json() as { executor: ExecutorSummary };
        this.data.executors = this.data.executors.map((item) =>
          item.executorId === executorId ? presentExecutor(body.executor) : item);
        this.input.cancelRename();
      });
    },
    openRevoke: (executorId) => {
      const executor = this.data.executors.find((item) => item.executorId === executorId);
      if (!executor?.canManage) return;
      this.data.revokeId = executorId;
      this.data.renameId = null;
      this.data.actionError = null;
    },
    cancelRevoke: () => {
      this.data.revokeId = null;
    },
    revoke: async () => {
      const executorId = this.data.revokeId;
      if (!executorId || this.data.busyId) return;
      await this.mutate(executorId, 'revoke', {
        kind: 'executor.action.request',
        protocolVersion: CONNECT_PROTOCOL_VERSION,
        executorId,
        action: 'revoke',
        idempotencyKey: createEnvelopeId('idem'),
        correlationId: createEnvelopeId('cor'),
      }, async () => {
        this.data.executors = this.data.executors.map((item) =>
          item.executorId === executorId
            ? presentExecutor({ ...item, state: 'revoked', online: false, presence: 'offline' })
            : item);
        this.input.cancelRevoke();
      });
    },
    logout: async () => {
      const sessionId = this.sessionId ?? this.deps.getSessionId();
      const csrf = this.deps.getCsrfToken();
      if (!sessionId || !csrf) {
        this.signedOut();
        return;
      }
      try {
        await this.deps.fetch('/v1/connect/auth/logout', requestInit({
          kind: 'auth.logout.request',
          protocolVersion: CONNECT_PROTOCOL_VERSION,
          sessionId,
          actorRole: 'browser_session',
          idempotencyKey: createEnvelopeId('idem'),
          correlationId: createEnvelopeId('cor'),
        }, csrf));
      } catch {
        // Local sign-out still completes when the network is unavailable.
      } finally {
        this.signedOut();
      }
    },
  };

  initialize(loadData: { executors?: ExecutorSummary[]; skipInitialLoad?: boolean } = {}) {
    if (loadData.executors) {
      this.data.executors = loadData.executors.map(presentExecutor);
      this.data.status = 'ready';
    }
    if (!loadData.skipInitialLoad && !loadData.executors) void this.input.refresh();
  }

  destroy() {}

  private async mutate(
    executorId: string,
    action: 'rename' | 'revoke',
    body: object,
    onSuccess: (response: Response) => Promise<void>,
  ) {
    const sessionId = this.sessionId ?? this.deps.getSessionId();
    const csrf = this.deps.getCsrfToken();
    if (!sessionId) {
      this.signedOut();
      return;
    }
    if (!csrf) {
      this.data.actionError = 'Your security token is unavailable. Sign in again.';
      return;
    }
    this.data.busyId = executorId;
    this.data.actionError = null;
    try {
      const correlationId = (body as { correlationId?: string }).correlationId ?? createEnvelopeId('cor');
      const query = new URLSearchParams({ sessionId, correlationId });
      const response = await this.deps.fetch(
        `/v1/connect/executors/${encodeURIComponent(executorId)}/${action}?${query}`,
        requestInit(body, csrf),
      );
      if (response.status === 401) {
        this.signedOut();
        return;
      }
      if (!response.ok) throw new Error(await responseMessage(response, `Unable to ${action} this executor.`));
      await onSuccess(response);
    } catch (error) {
      this.data.actionError = error instanceof Error ? error.message : `Unable to ${action} this executor.`;
    } finally {
      this.data.busyId = null;
    }
  }

  private async loadConnections() {
    const sessionId = this.sessionId ?? this.deps.getSessionId();
    if (!sessionId) return;
    try {
      const query = new URLSearchParams({ sessionId });
      const response = await this.deps.fetch(`/v1/remote-tools/connections?${query}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(await responseMessage(response, 'Unable to load your MCP connections.'));
      const body = await response.json() as { connections?: ConnectionCard[] };
      this.data.connections = Array.isArray(body.connections) ? body.connections : [];
      this.data.connectionsError = null;
    } catch (error) {
      this.data.connectionsError = error instanceof Error ? error.message : 'Unable to load your MCP connections.';
    }
  }

  private async mutateConnection(
    connectionId: string,
    action: 'update' | 'revoke',
    body: object,
    onSuccess: () => Promise<void>,
  ) {
    const sessionId = this.sessionId ?? this.deps.getSessionId();
    const csrf = this.deps.getCsrfToken();
    if (!sessionId) {
      this.signedOut();
      return;
    }
    if (!csrf) {
      this.data.connectionsError = 'Your security token is unavailable. Sign in again.';
      return;
    }
    this.data.connectionBusyId = connectionId;
    this.data.connectionsError = null;
    try {
      const query = new URLSearchParams({ sessionId });
      const response = await this.deps.fetch(
        `/v1/remote-tools/connections/${encodeURIComponent(connectionId)}/${action}?${query}`,
        requestInit(body, csrf),
      );
      if (response.status === 401) {
        this.signedOut();
        return;
      }
      if (!response.ok) throw new Error(await responseMessage(response, `Unable to ${action} this connection.`));
      await onSuccess();
    } catch (error) {
      this.data.connectionsError = error instanceof Error ? error.message : `Unable to ${action} this connection.`;
    } finally {
      this.data.connectionBusyId = null;
    }
  }

  private signedOut() {
    this.deps.clearSessionId();
    this.data.status = 'signed-out';
    this.deps.navigate(loginTarget('/connect'));
  }
}
