INSERT INTO connect_identities (id, user_id, provider, provider_subject, email, created_at)
VALUES (:id, :user_id, 'google', :provider_subject, :email, :created_at)
ON CONFLICT (provider, provider_subject) DO UPDATE
SET email = EXCLUDED.email;
