import { Component } from "@noego/ioc";
import { QueryBinder, Query, Single, SqlStackError } from "sqlstack";

export interface Message {
  message_id: number;
  from_user_id: string | null;
  from_device_id: string | null;
  target_kind: string;
  target_user_id: string | null;
  target_device_id: string | null;
  type: string;
  request_id: string | null;
  correlation_id: string | null;
  payload: string | null;
  created_at: string;
}

@QueryBinder()
@Component()
export default class MessageRepo {
  @Query()
  createMessage(_params: {
    from_user_id: string | null;
    from_device_id: string | null;
    target_kind: string;
    target_user_id: string | null;
    target_device_id: string | null;
    type: string;
    request_id: string | null;
    correlation_id: string | null;
    payload: string | null;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  getLastInsertedId(): Promise<{ message_id: number }> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  findVisibleSince(_params: {
    device_id: string;
    user_id: string;
    since_message_id: number;
  }): Promise<Message[]> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  getHighWaterMark(): Promise<{ hwm: number }> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByRequestId(_params: {
    from_device_id: string;
    request_id: string;
  }): Promise<Message | null> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByMessageId(_params: { message_id: number }): Promise<Message | null> {
    throw new SqlStackError("Not implemented");
  }
}
