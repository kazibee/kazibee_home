SELECT COALESCE(MAX(message_id), 0) as hwm FROM messages;
