import { Component, LoadAs } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { getTrace } from "@noego/trace";
import type { Message } from "../repo/message_repo";

const logger = getLogger("kazibee:message-bus");

type BusHandler = (message: Message) => void;

/**
 * LocalBus implementation for single-VM mode.
 * Publishes messages to all subscribed handlers synchronously.
 */
@Component({ scope: LoadAs.Singleton })
export default class MessageBus {
  private handlers: BusHandler[] = [];
  private trace = getTrace('MessageBus');

  publish(message: Message): void {
    logger.info("bus.publish", {
      messageId: message.message_id,
      type: message.type,
      targetKind: message.target_kind,
      targetDeviceId: message.target_device_id,
      targetUserId: message.target_user_id,
      subscriberCount: this.handlers.length,
    });
    this.trace.info('bus.publish', {
      messageId: message.message_id, type: message.type, subscriberCount: this.handlers.length,
    });

    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch (err) {
        logger.error("bus.handler.error", { messageId: message.message_id, error: err });
      }
    }
  }

  subscribe(handler: BusHandler): () => void {
    this.handlers.push(handler);
    logger.info("bus.subscribe", { totalSubscribers: this.handlers.length });

    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) {
        this.handlers.splice(idx, 1);
        logger.info("bus.unsubscribe", { totalSubscribers: this.handlers.length });
      }
    };
  }
}
