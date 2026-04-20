import { Component } from "@noego/ioc";
import { QueryBinder, Query, Single, SqlStackError } from "sqlstack";

export interface Device {
  device_id: string;
  user_id: string;
  device_name: string | null;
  device_type: string | null;
  auth_token_hash: string | null;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

@QueryBinder()
@Component()
export default class DeviceRepo {
  @Query()
  createDevice(params: { device_id: string; user_id: string; device_name: string | null; device_type: string | null; auth_token_hash: string | null; pairing_code: string | null; pairing_expires_at: string | null }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  @Single
  findByDeviceId(params: { device_id: string }): Promise<Device | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  @Single
  findByPairingCode(params: { pairing_code: string }): Promise<Device | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  updateLastSeen(params: { device_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  clearPairingCode(params: { device_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  findByUserId(params: { user_id: string }): Promise<Device[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  deleteByDeviceId(params: { device_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
