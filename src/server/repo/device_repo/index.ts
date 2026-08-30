import { Component, LoadAs } from "@noego/ioc";
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
@Component({ scope: LoadAs.Singleton })
export default class DeviceRepo {
  @Query()
  createDevice(_params: { device_id: string; user_id: string; device_name: string | null; device_type: string | null; auth_token_hash: string | null; pairing_code: string | null; pairing_expires_at: string | null }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByDeviceId(_params: { device_id: string }): Promise<Device | null> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByPairingCode(_params: { pairing_code: string }): Promise<Device | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  updateLastSeen(_params: { device_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  clearPairingCode(_params: { device_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  findByUserId(_params: { user_id: string }): Promise<Device[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  deleteByDeviceId(_params: { device_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
