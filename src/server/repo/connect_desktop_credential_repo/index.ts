import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface ConnectDesktopCredential {
  credential_id: string;
  device_id: string;
  generation: number;
  token_hash: string;
  audience: "desktop-relay";
  status: "active" | "revoked";
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopCredentialRepo {
  @Query()
  async createCredential(_params: Omit<ConnectDesktopCredential, "status" | "revoked_at" | "audience">) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByTokenHash(_params: { token_hash: string }) {
    return Trust.tryAsync(
      () => run<ConnectDesktopCredential | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async revokeForDevice(_params: { device_id: string; revoked_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
