/**
 * Guards the pre-generated standalone validator that both relay request
 * parsers consume (src/server/services/generated/connect_protocol_validator.js).
 *
 * 1. Drift: the committed artifact must equal a fresh generation from the
 *    release branch canonical schema, so a
 *    package schema bump can never silently run against a stale validator.
 * 2. No runtime codegen: the generated source has no require/new Function/eval
 *    and the validator runs with the string-to-code entry points disabled.
 * 3. Parity: accept/reject decisions match a request-time Ajv2020 compile of
 *    the same schema with the same options, on well-formed and malformed
 *    payloads for both the inbound command and outbound frame shapes.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import protocolSchema from "../../../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json" with { type: "json" };
import validate, { SCHEMA_SHA256 } from "../../../src/server/services/generated/connect_protocol_validator.js";

const ROOT = path.resolve(__dirname, "../../..");
const GENERATOR = path.join(ROOT, "scripts/generate-connect-validator.mjs");
const GENERATED = path.join(ROOT, "src/server/services/generated/connect_protocol_validator.js");
const require = createRequire(import.meta.url);
const SCHEMA_PATH = require.resolve("../../../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json");
const CODEGEN_MESSAGE = "Code generation from strings disallowed for this context";

const command = {
  kind: "command.post", protocolVersion: "1.0", commandId: "cmd_parser0001",
  correlationId: "cor_parser0001", idempotencyKey: "idem_parser_command_0001",
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef", executorId: "exe_parser0001",
  deviceId: "dev_parser0001", actorRole: "desktop_device", operation: "executor.status.read", payload: {},
};
const hello = {
  kind: "channel.hello", protocolVersion: "1.0", executorId: "exe_12345678",
  deviceId: "dev_12345678", actorRole: "executor_device", correlationId: "cor_12345678",
};
const samples: Array<[string, unknown]> = [
  ["command", command],
  ["command extra field", { ...command, websiteDeploymentID: command.websiteDeploymentId }],
  ["command missing field", (() => { const v: Record<string, unknown> = { ...command }; delete v.commandId; return v; })()],
  ["command wrong id shape", { ...command, executorId: "spy_parser0001" }],
  ["command payload wrong type", { ...command, payload: "nope" }],
  ["command wrong protocol", { ...command, protocolVersion: "2.0" }],
  ["hello", hello],
  ["hello spoofed role", { ...hello, actorRole: "desktop_device" }],
  ["error frame", { kind: "error", protocolVersion: "1.0", code: "invalid-envelope", message: "x", retryable: false, correlationId: "cor_12345678" }],
  ["unknown kind", { kind: "command.nope", protocolVersion: "1.0", correlationId: "cor_12345678" }],
  ["null", null],
  ["array", [1, 2]],
  ["string", "command.post"],
  ["empty object", {}],
  ["astral string length", { ...hello, correlationId: "cor_" + "\u{1F41D}".repeat(4) }],
];

describe("generated connect protocol validator", () => {
  it("is current with the installed canonical schema (drift check)", () => {
    const schemaSha256 = createHash("sha256").update(readFileSync(SCHEMA_PATH)).digest("hex");
    expect(SCHEMA_SHA256).toBe(schemaSha256);
    const result = spawnSync(process.execPath, [GENERATOR, "--check"], { cwd: ROOT, encoding: "utf8" });
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
  });

  it("contains no runtime code generation", () => {
    const source = readFileSync(GENERATED, "utf8");
    expect(source).not.toMatch(/\brequire\(|new Function\b|\beval\(/);
    expect(source).toMatch(/^export default validate\d*;?$/m);
  });

  it("validates with the string-to-code entry points disabled", () => {
    const originalFunction = globalThis.Function;
    const originalEval = globalThis.eval;
    // A regular function so `new Function(...)` reaches the thrower instead of "not a constructor".
    const deny = function () { throw new EvalError(CODEGEN_MESSAGE); };
    Object.defineProperty(globalThis, "Function", { value: deny, configurable: true, writable: true });
    Object.defineProperty(globalThis, "eval", { value: deny, configurable: true, writable: true });
    try {
      expect(() => new Ajv2020({ allErrors: false, strict: true }).compile(protocolSchema)).toThrow(CODEGEN_MESSAGE);
      expect(validate(command)).toBe(true);
      expect(validate({ ...command, extra: 1 })).toBe(false);
      expect(validate(hello)).toBe(true);
      expect(validate(null)).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "Function", { value: originalFunction, configurable: true, writable: true });
      Object.defineProperty(globalThis, "eval", { value: originalEval, configurable: true, writable: true });
    }
  });

  it("matches a request-time Ajv2020 compile of the same schema on every sample", () => {
    const reference = new Ajv2020({ allErrors: false, strict: true }).compile(protocolSchema);
    const decisions = samples.map(([name, value]) => ({ name, generated: validate(value), reference: reference(value) }));
    expect(decisions.filter((d) => d.generated !== d.reference)).toEqual([]);
    // The sample set must exercise both outcomes.
    expect(decisions.some((d) => d.generated)).toBe(true);
    expect(decisions.some((d) => !d.generated)).toBe(true);
  });
});
