-- Connect auth allows only the single allowed email (CONNECT_ALLOWED_EMAIL),
-- so multiple accounts (distinct usernames) legitimately share it.
-- Identity/duplicate detection is keyed on username, which stays UNIQUE.
ALTER TABLE connect_accounts DROP CONSTRAINT IF EXISTS connect_accounts_email_key;
CREATE INDEX idx_connect_accounts_email ON connect_accounts(email);
