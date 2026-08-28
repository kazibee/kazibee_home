import { Component, LoadAs } from "@noego/ioc";

export const CONNECT_PROTOCOL_VERSION = "1.0";
export const CONNECT_USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
export const CONNECT_RAW_USERNAME_MAX_LENGTH = 128;
export const CONNECT_PASSWORD_MIN_LENGTH = 12;
export const CONNECT_PASSWORD_MAX_LENGTH = 128;
export const CONNECT_BCRYPT_COST = 12;
export const CONNECT_ALLOWED_EMAIL = "shavyg2@gmail.com";
export const CONNECT_SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const CONNECT_SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
export const CONNECT_SESSION_COOKIE = "kazi_connect_session";
export const CONNECT_CSRF_COOKIE = "kazi_connect_csrf";

@Component({ scope: LoadAs.Singleton })
export default class ConnectAuthPolicy {
  readonly allowedEmail = CONNECT_ALLOWED_EMAIL;
  readonly protocolVersion = CONNECT_PROTOCOL_VERSION;
  readonly usernamePattern = CONNECT_USERNAME_PATTERN;
  readonly rawUsernameMaxLength = CONNECT_RAW_USERNAME_MAX_LENGTH;
  readonly passwordMinLength = CONNECT_PASSWORD_MIN_LENGTH;
  readonly passwordMaxLength = CONNECT_PASSWORD_MAX_LENGTH;
  readonly bcryptCost = CONNECT_BCRYPT_COST;
  readonly absoluteSessionMs = CONNECT_SESSION_ABSOLUTE_MS;
  readonly idleSessionMs = CONNECT_SESSION_IDLE_MS;
  readonly sessionCookieName = CONNECT_SESSION_COOKIE;
  readonly csrfCookieName = CONNECT_CSRF_COOKIE;

  normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  isAllowedEmail(email: string): boolean {
    return this.normalizeEmail(email) === this.allowedEmail;
  }

  isAllowedIdentifier(identifier: string): boolean {
    return identifier === this.allowedEmail || this.usernamePattern.test(identifier);
  }
}
