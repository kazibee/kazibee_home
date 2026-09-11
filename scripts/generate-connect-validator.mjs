#!/usr/bin/env node
/**
 * Pre-generates the standalone Ajv validator for the canonical Kazi Connect
 * protocol schema checked into this release branch.
 *
 * Why: the relay request parsers used to call `new Ajv2020(...).compile(schema)`
 * per instance. Ajv materialises validators with `new Function(...)`, which the
 * Cloudflare Workers runtime forbids ("Code generation from strings disallowed
 * for this context"), so every relay request answered HTTP 500. The website owns
 * the compilation choice; the checked-in protocol package supplies the schema. This script moves
 * the compilation to authoring time and commits the result as plain source, so
 * `npx noego build` (Cloudflare) has the artifact with no extra build step.
 *
 * Usage:
 *   node scripts/generate-connect-validator.mjs          # (re)write the module
 *   node scripts/generate-connect-validator.mjs --check  # exit 1 on drift
 *
 * Determinism: same schema bytes + same ajv version => byte-identical output.
 * The `--check` mode regenerates in memory and compares with the committed file,
 * so a package schema bump can never silently run against a stale validator.
 * A vitest case (test/unit/services/connect-protocol-validator.generated.test.ts)
 * runs the same check.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020.js").default;
const standaloneCode = require("ajv/dist/standalone/index.js").default;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SCHEMA_SPECIFIER = "../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json";
export const OUTPUT_JS = path.join(ROOT, "src/server/services/generated/connect_protocol_validator.js");
export const OUTPUT_DTS = path.join(ROOT, "src/server/services/generated/connect_protocol_validator.d.ts");

/** Exactly the options the parsers used at request time; keep in lockstep. */
const AJV_OPTIONS = { allErrors: false, strict: true };

export function generate() {
  const schemaPath = require.resolve(SCHEMA_SPECIFIER);
  const schemaBytes = readFileSync(schemaPath);
  const schema = JSON.parse(schemaBytes.toString("utf8"));
  const schemaSha256 = createHash("sha256").update(schemaBytes).digest("hex");
  const ajvVersion = require("ajv/package.json").version;

  const ajv = new Ajv2020({ ...AJV_OPTIONS, code: { source: true, esm: true, lines: true } });
  const validate = ajv.compile(schema);
  const body = esmRuntimeImports(standaloneCode(ajv, validate));

  const header = [
    "// GENERATED FILE — DO NOT EDIT.",
    `// Source: ${SCHEMA_SPECIFIER}`,
    `// schemaSha256: ${schemaSha256}`,
    `// ajv: ${ajvVersion} (Ajv2020, ${JSON.stringify(AJV_OPTIONS)})`,
    "// Regenerate: node scripts/generate-connect-validator.mjs",
    "// Drift check: node scripts/generate-connect-validator.mjs --check",
    "/* eslint-disable */",
    `export const SCHEMA_SHA256 = "${schemaSha256}";`,
    "",
  ].join("\n");
  const js = `${header}${body}\n`;
  const dts = [
    "// GENERATED FILE — DO NOT EDIT. See scripts/generate-connect-validator.mjs.",
    'import type { ValidateFunction } from "ajv/dist/2020.js";',
    "",
    `export declare const SCHEMA_SHA256: "${schemaSha256}";`,
    "export declare const validate: ValidateFunction<unknown>;",
    "export default validate;",
    "",
  ].join("\n");
  return { js, dts, schemaSha256 };
}

const RUNTIME_REQUIRE = /^const (\w+) = require\("(ajv\/dist\/runtime\/[\w-]+)"\)\.default;$/gm;

/**
 * Ajv's `code.esm` only rewrites the export; runtime helpers (ucs2length,
 * equal, ...) are still emitted as `require(...)`, which neither the ESM app
 * nor the Cloudflare bundle can execute. Rewrite them as static imports.
 * The helper modules are CommonJS with `exports.default`; Node's native ESM
 * hands the default import the whole `module.exports` while bundlers unwrap
 * `__esModule` modules, so both shapes are accepted.
 */
function esmRuntimeImports(source) {
  const imports = [];
  const rewritten = source.replace(RUNTIME_REQUIRE, (_match, name, specifier) => {
    const binding = `${name}Module`;
    imports.push(`import ${binding} from "${specifier}.js";`);
    return `const ${name} = typeof ${binding} === "function" ? ${binding} : ${binding}.default;`;
  });
  if (/\brequire\(|new Function\b|\beval\(/.test(rewritten)) {
    throw new Error("generated validator still contains require/new Function/eval; refusing to write");
  }
  return imports.length > 0 ? `${imports.join("\n")}\n${rewritten}` : rewritten;
}

function readOrNull(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** Returns a list of drift descriptions; empty when the committed artifact is current. */
export function drift() {
  const { js, dts } = generate();
  const problems = [];
  if (readOrNull(OUTPUT_JS) !== js) problems.push(`${path.relative(ROOT, OUTPUT_JS)} is stale or missing`);
  if (readOrNull(OUTPUT_DTS) !== dts) problems.push(`${path.relative(ROOT, OUTPUT_DTS)} is stale or missing`);
  return problems;
}

function main(argv) {
  if (argv.includes("--check")) {
    const problems = drift();
    if (problems.length > 0) {
      console.error("connect protocol validator drift:\n  " + problems.join("\n  "));
      console.error("Run: node scripts/generate-connect-validator.mjs");
      process.exit(1);
    }
    console.log("connect protocol validator is current");
    return;
  }
  const { js, dts, schemaSha256 } = generate();
  mkdirSync(path.dirname(OUTPUT_JS), { recursive: true });
  writeFileSync(OUTPUT_JS, js);
  writeFileSync(OUTPUT_DTS, dts);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_JS)} (schema sha256 ${schemaSha256})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
