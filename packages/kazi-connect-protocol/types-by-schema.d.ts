/** Types correspond one-for-one with the closed JSON Schema definitions. */
export type WebsiteDeploymentId = `wdp_${string}`;
export type ExecutorId = `exe_${string}`;
export type ConversationId = `thr_${string}`;
export type RemoteWorkspaceId = `wrk_${string}`;
export type ClientCreationId = `ccr_${string}`;
export type ClientOperationId = `cop_${string}`;

export interface RemoteExecutionBindingReceipt {
  conversationId: ConversationId;
  kind: "remote";
  websiteDeploymentId: WebsiteDeploymentId;
  executorId: ExecutorId;
  remoteWorkspaceId: RemoteWorkspaceId;
}

export interface ConversationCreatePayload {
  clientCreationId: ClientCreationId;
  title: string;
  websiteDeploymentId: WebsiteDeploymentId;
  executorId: ExecutorId;
  remoteWorkspaceId: RemoteWorkspaceId;
}

export interface CanonicalThreadSendPayload {
  conversationId: ConversationId;
  clientOperationId: ClientOperationId;
  text: string;
  mode: "normal" | "readonly" | "plan" | "edit";
  model: string;
  expectedExecutionBinding: RemoteExecutionBindingReceipt;
}

/** Phase A/B migration-only first-send shape. */
export interface LegacyThreadSendStartPayload {
  workspaceId: RemoteWorkspaceId;
  title: string;
  text: string;
  mode: "normal" | "readonly" | "plan" | "edit";
  model: string;
  phase: "start";
}

export interface CanonicalThreadRetryPayload {
  conversationId: ConversationId;
  clientOperationId: ClientOperationId;
  expectedExecutionBinding: RemoteExecutionBindingReceipt;
  streamId?: `str_${string}`;
}

export type CanonicalThreadCancelPayload = CanonicalThreadRetryPayload;

export interface ConversationCreateResult {
  conversationId: ConversationId;
  title: string;
  createdAt: string;
  executionBinding: RemoteExecutionBindingReceipt;
}

export type CanonicalMutationPayload =
  | CanonicalThreadSendPayload
  | CanonicalThreadRetryPayload
  | CanonicalThreadCancelPayload;
