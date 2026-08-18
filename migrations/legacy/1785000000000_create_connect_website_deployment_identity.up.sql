CREATE TABLE IF NOT EXISTS connect_website_deployment_identity (
  singleton_key INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
  website_deployment_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  CHECK (singleton_key = 1),
  CHECK (
    website_deployment_id GLOB 'wdp_*'
    AND length(website_deployment_id) = 36
    AND substr(website_deployment_id, 5) NOT GLOB '*[^A-Za-z0-9]*'
  )
);
