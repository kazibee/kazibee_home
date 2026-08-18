import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

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
@Component()
export default class ConnectDesktopDeviceRepo {
  @Query()
  createDevice(_params: Omit<ConnectDesktopDevice, "owner_user_id" | "claimed_at" | "credential_generation" | "state">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByDeviceId(_params: { device_id: string }): Promise<ConnectDesktopDevice | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  listByOwner(_params: { owner_user_id: string; limit: number }): Promise<ConnectDesktopDevice[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  acceptOwner(_params: { device_id: string; owner_user_id: string; claimed_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  renameOwned(_params: { device_id: string; owner_user_id: string; display_name: string; updated_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeOwned(_params: { device_id: string; owner_user_id: string; updated_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

}
