-- NOTE: this down migration fails if duplicate emails already exist;
-- dedupe connect_accounts by email manually before rolling back.
DROP INDEX IF EXISTS idx_connect_accounts_email;
ALTER TABLE connect_accounts ADD CONSTRAINT connect_accounts_email_key UNIQUE (email);
