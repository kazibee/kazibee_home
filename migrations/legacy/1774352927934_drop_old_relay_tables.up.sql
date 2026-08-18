DROP INDEX IF EXISTS idx_relay_events_device_global;
DROP INDEX IF EXISTS idx_relay_conversations_device_convo;
DROP INDEX IF EXISTS idx_relay_conversations_device;
DROP TABLE IF EXISTS relay_conversations;

DROP INDEX IF EXISTS idx_relay_events_device_seq;
DROP TABLE IF EXISTS relay_events;

DROP INDEX IF EXISTS idx_relay_messages_undelivered;
DROP INDEX IF EXISTS idx_relay_messages_device;
DROP TABLE IF EXISTS relay_messages;

DROP INDEX IF EXISTS idx_mobile_sessions_device;
DROP INDEX IF EXISTS idx_mobile_sessions_token;
DROP TABLE IF EXISTS mobile_sessions;
