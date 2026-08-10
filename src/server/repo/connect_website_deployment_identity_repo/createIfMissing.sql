INSERT OR IGNORE INTO connect_website_deployment_identity (
  singleton_key, website_deployment_id, created_at
) VALUES (1, :website_deployment_id, :created_at);
