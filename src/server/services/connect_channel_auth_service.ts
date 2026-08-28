import { Component, Inject, LoadAs } from "@noego/ioc";
import ConnectExecutorCredentialRepo from "../repo/connect_executor_credential_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import { ConnectCredentials } from "./connect_auth_primitives";

export type ChannelAuthResult =
  | { ok: true; executorId: string; deviceId: string; generation: number; ownerUserId: string }
  | { ok: false };

/**
 * Authenticates an executor's WebSocket channel upgrade.
 *
 * The bearer is the bootstrap token the executor generated at claim time —
 * promoted to the executor credential when the owner accepted the claim
 * (acceptClaim stores its hash in connect_executor_credentials). Verification
 * therefore reuses the existing credential rows: hash the bearer, load the
 * credential, and require every identity axis to agree.
 *
 * Fails closed on any mismatch and never distinguishes "unknown token" from
 * "revoked" or "wrong executor" to the caller.
 */
@Component({ scope: LoadAs.Singleton })
export default class ConnectChannelAuthService {
  constructor(
    @Inject(ConnectExecutorCredentialRepo) private readonly credentials: ConnectExecutorCredentialRepo,
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
    @Inject(ConnectCredentials) private readonly tokens: ConnectCredentials,
  ) {}

  async authenticate(input: {
    token: string;
    executorId: string;
    deviceId: string;
    generation: number;
  }): Promise<ChannelAuthResult> {
    const credential = await this.credentials.findByTokenHash({
      token_hash: this.tokens.hashToken(input.token),
    });
    if (!credential
      || credential.status !== "active"
      || credential.executor_id !== input.executorId
      || credential.generation !== input.generation) {
      return { ok: false };
    }

    const executor = await this.executors.findByExecutorId({ executor_id: input.executorId });
    if (!executor
      || executor.state !== "active"
      || executor.device_id !== input.deviceId
      || executor.credential_generation !== input.generation
      || !executor.owner_user_id) {
      return { ok: false };
    }

    return {
      ok: true,
      executorId: executor.executor_id,
      deviceId: executor.device_id,
      generation: executor.credential_generation,
      ownerUserId: executor.owner_user_id,
    };
  }
}
