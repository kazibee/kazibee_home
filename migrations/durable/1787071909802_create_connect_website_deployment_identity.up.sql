CREATE TABLE connect_website_deployment_identity (
  singleton_key INTEGER PRIMARY KEY DEFAULT 1 CHECK (singleton_key = 1),
  website_deployment_id TEXT NOT NULL UNIQUE CHECK (website_deployment_id ~ '^wdp_[A-Za-z0-9]{32}$'),
  created_at TIMESTAMPTZ NOT NULL
);
