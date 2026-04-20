INSERT INTO messages (from_user_id, from_device_id, target_kind, target_user_id, target_device_id, type, request_id, correlation_id, payload)
VALUES (:from_user_id, :from_device_id, :target_kind, :target_user_id, :target_device_id, :type, :request_id, :correlation_id, :payload);
