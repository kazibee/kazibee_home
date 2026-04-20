SELECT * FROM messages
WHERE from_device_id = :from_device_id AND request_id = :request_id;
