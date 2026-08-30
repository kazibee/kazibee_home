import { Component, Inject, LoadAs } from "@noego/ioc";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { CompatResponse as Response } from "@noego/dinner";
import { getLogger } from "@noego/logger";
import ConnectAuthPolicy from "./connect_auth_policy";

export interface WebsiteLoggerPort {
  info(event: string, context?: Record<string, unknown>): void;
  warn(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
}

@Component({ scope: LoadAs.Singleton })
export class WebsiteLoggerAdapter {
  forSource(source: string): WebsiteLoggerPort {
    const logger = getLogger(`kazibee:${source}`);
    return {
      info: (event, context) => logger.info(event, context),
      warn: (event, context) => logger.warn(event, context),
      error: (event, context) => logger.error(event, context),
    };
  }
}

@Component({ scope: LoadAs.Singleton })
export class ConnectClock {
  now(): Date {
    return new Date();
  }
}

export interface ConnectScheduledTask {
  cancel(): void;
}

/**
 * The only timer adapter used by Connect domain services. Tests can replace it
 * with a deterministic scheduler; domain state machines never call setTimeout.
 */
@Component({ scope: LoadAs.Singleton })
export class ConnectScheduler {
  schedule(delayMs: number, task: () => void): ConnectScheduledTask {
    const timer = setTimeout(task, delayMs);
    timer.unref?.();
    return { cancel: () => clearTimeout(timer) };
  }
}

@Component({ scope: LoadAs.Singleton })
export class ConnectIdGenerator {
  userId(): string {
    return `usr_${randomBytes(16).toString("hex")}`;
  }

  sessionId(): string {
    return `ses_${randomBytes(16).toString("hex")}`;
  }

  identityId(): string {
    return `idn_${randomBytes(16).toString("hex")}`;
  }

  credentialId(): string {
    return `cred_${randomBytes(16).toString("hex")}`;
  }

  auditEventId(): string {
    return `aud_${randomBytes(16).toString("hex")}`;
  }

  channelFenceId(): string {
    return `fen_${randomBytes(16).toString("hex")}`;
  }
}

@Component({ scope: LoadAs.Singleton })
export class ConnectCredentials {
  randomToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  matchesHash(token: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashToken(token), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}

const PASSWORD_CANARY_HASH =
  "$2a$12$mNZq4pezRTG8xgASJtIRPuauRl3fxLPmzHx7Abc3DOgQsGtGj17jy";

@Component({ scope: LoadAs.Singleton })
export class ConnectPasswordHasher {
  constructor(@Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.policy.bcryptCost);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  verifyCanary(password: string): Promise<boolean> {
    return bcrypt.compare(password, PASSWORD_CANARY_HASH);
  }
}

@Component({ scope: LoadAs.Singleton })
export class ConnectAuthCookies {
  constructor(@Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy) {}

  set(res: Response, sessionToken: string, csrfToken: string): void {
    const secure = process.env.NODE_ENV === "production";
    res.cookie(this.policy.sessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
    });
    res.cookie(this.policy.csrfCookieName, csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure,
      path: "/",
    });
  }

  clear(res: Response): void {
    const options = {
      sameSite: "strict" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };
    res.clearCookie(this.policy.sessionCookieName, { ...options, httpOnly: true });
    res.clearCookie(this.policy.csrfCookieName, { ...options, httpOnly: false });
  }
}
