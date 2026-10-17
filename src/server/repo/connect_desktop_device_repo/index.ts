import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export type ConnectDesktopState = "pending" | "active" | "revoked";
export interface ConnectDesktopDevice {
  device_id: string;
  owner_user_id: string | null;
  display_name: string;
  platform: "macos" | "linux" | "windows";
  architecture: "x64" | "arm64";
  desktop_version: string;
  key_fingerprint: string;
  state: ConnectDesktopState;
  credential_generation: number;
  created_at: string;
  claimed_at: string | null;
  updated_at: string;
  last_seen_at: string;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopDeviceRepo {
  @Query()
  async createDevice(_params: Omit<ConnectDesktopDevice, "owner_user_id" | "claimed_at" | "credential_generation" | "state">) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByDeviceId(_params: { device_id: string }) {
    return Trust.tryAsync(
      () => run<ConnectDesktopDevice | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async listByOwner(_params: { owner_user_id: string; limit: number }) {
    return Trust.tryAsync(
      () => run<ConnectDesktopDevice[]>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async acceptOwner(_params: { device_id: string; owner_user_id: string; claimed_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Query()
  async renameOwned(_params: { device_id: string; owner_user_id: string; display_name: string; updated_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Query()
  async revokeOwned(_params: { device_id: string; owner_user_id: string; updated_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

}
