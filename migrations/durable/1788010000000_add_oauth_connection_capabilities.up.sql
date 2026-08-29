ALTER TABLE oauth_connections
  ADD COLUMN allow_shell boolean NOT NULL DEFAULT false,
  ADD COLUMN allow_web boolean NOT NULL DEFAULT false;
