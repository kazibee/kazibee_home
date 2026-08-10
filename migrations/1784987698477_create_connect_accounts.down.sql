-- Write your down migration here
DROP INDEX IF EXISTS idx_connect_accounts_username;
DROP TABLE IF EXISTS connect_accounts;
