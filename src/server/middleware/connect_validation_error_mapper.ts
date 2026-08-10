import { Component, LoadAs } from "@noego/ioc";
import type { NextFunction, Request, Response } from "express";

const CONNECT_PATH_PREFIX = "/v1/connect/";
const CORRELATION_PATTERN = /^cor_[A-Za-z0-9]{8,64}$/;
const FALLBACK_CORRELATION_ID = "cor_invalid000";
const PROTOCOL_VERSION = "1.0";
const RELAY_MAX_FRAME_BYTES = 256 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Adapts Dinner's pre-controller body-validation response at the Website edge.
 *
 * Dinner calls `res.status(...).json(...)` and then `next()`. The replacement
 * must therefore write the canonical response synchronously: merely capturing
 * the body for a later middleware leaves a request open if the framework's
 * continuation is not observed by the containing Express stack.
 */
@Component({ scope: LoadAs.Singleton })
export default class ConnectValidationErrorMapper {
  capture(req: Request, res: Response, next: NextFunction): void {
    if (!req.path.startsWith(CONNECT_PATH_PREFIX)) {
      next();
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (!res.headersSent && this.isDinnerValidationFailure(body)) {
        res.json = originalJson;
        return this.emit(req, res);
      }
      return originalJson(body);
    }) as Response["json"];
    next();
  }

  private emit(req: Request, res: Response): Response {
    const protocolMismatch = this.hasUnsupportedProtocolVersion(req);
    const oversizedRelayFrame = this.isOversizedRelayFrame(req);
    res.setHeader("x-kazi-protocol-version", PROTOCOL_VERSION);
    return res.status(oversizedRelayFrame ? 413 : protocolMismatch ? 409 : 400).json({
      kind: "error",
      protocolVersion: PROTOCOL_VERSION,
      code: !oversizedRelayFrame && protocolMismatch
        ? "protocol-version-mismatch" : "invalid-envelope",
      message: !oversizedRelayFrame && protocolMismatch
        ? "Protocol version mismatch" : "Invalid request envelope",
      retryable: false,
      correlationId: this.correlationId(req),
    });
  }

  private isDinnerValidationFailure(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return value.error === true
      && value.statusCode === 400
      && value.message === "Invalid request body"
      && ("validation_schema" in value || "requirements" in value);
  }

  private hasUnsupportedProtocolVersion(req: Request): boolean {
    const supplied = this.requestValues(req)
      .map((value) => value.protocolVersion)
      .find((value) => value !== undefined);
    return typeof supplied === "string"
      && supplied.length > 0
      && supplied !== PROTOCOL_VERSION;
  }

  private isOversizedRelayFrame(req: Request): boolean {
    if (req.method !== "POST" || req.path !== "/v1/connect/relay") return false;
    try {
      return Buffer.byteLength(JSON.stringify(req.body), "utf8") > RELAY_MAX_FRAME_BYTES;
    } catch {
      return false;
    }
  }

  private correlationId(req: Request): string {
    for (const value of this.requestValues(req)) {
      const correlationId = value.correlationId;
      if (typeof correlationId === "string" && CORRELATION_PATTERN.test(correlationId)) {
        return correlationId;
      }
    }
    return FALLBACK_CORRELATION_ID;
  }

  private requestValues(req: Request): Record<string, unknown>[] {
    return [req.body, req.query].filter(isRecord);
  }
}
