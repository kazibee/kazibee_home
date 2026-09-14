/**
 * Explicit native Serve lifecycle probe — deliberately NOT a testApp case.
 *
 * The claim is about the framework's real Node host: twelve genuine
 * `serve()` boots and closes must not accumulate process SIGTERM/SIGINT
 * listeners. An in-process testApp root never installs those listeners, so
 * only the actual served product can carry this assertion.
 *
 * Migration from the legacy getTestApp helper: every boot owns a FRESH
 * SQLStack fixture built from independently authored schema (no migrated template,
 * no process-global SqlStackDB registry, no DATABASE_URL mutation, no
 * resetContainer). The fixture URL reaches the product only through serve's
 * authoritative `env`; `server.close()` retires that generation's own root.
 */
import type { Server } from "node:http";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serve } from "@noego/app";
import { resourceCase } from "@noego/testing";
import { testPostgres } from "sqlstack/testing";
import { PRODUCT_ROOT, productFullSchema } from "../../schemas/product-full";
import { nativeArtifactDirectory } from "../../helpers/native-artifacts";

const CONFIG = path.join(PRODUCT_ROOT, "noego.config.yml");

/** Serve options for one native boot over one fixture URL (plain data). */
const serveOptions = (databaseUrl: string, artifactDirectory: string) => ({
  artifactDirectory,
  cwd: PRODUCT_ROOT,
  configPath: CONFIG,
  port: 0,
  env: { NODE_ENV: "test", DATABASE_URL: databaseUrl },
});

function closeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe("test server lifecycle", () => {
  // 12 full app boots — the heaviest single test in the repo. Under the
  // parallel integration tier it shares the machine with every other file,
  // so it gets a proportionate timeout instead of the default 30s.
  it("does not accumulate process signal listeners across repeated app boots", { timeout: 180_000 }, resourceCase(async (scope) => {
    const initialSigtermListeners = process.listenerCount("SIGTERM");
    const initialSigintListeners = process.listenerCount("SIGINT");
    const warnings: Error[] = [];
    const captureWarning = (warning: Error) => warnings.push(warning);

    process.on("warning", captureWarning);
    try {
      for (let bootNumber = 0; bootNumber < 12; bootNumber += 1) {
        const fixture = scope.own(
          await testPostgres(productFullSchema(), { sourceDir: PRODUCT_ROOT }).build(),
          `fixture-${bootNumber}`,
        );
        const artifactDirectory = await nativeArtifactDirectory(scope);
        let server: Server | undefined;
        try {
          server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
          server.unref();
          scope.own({ dispose: () => closeServer(server!) }, `served-product-${bootNumber}`);
          // Registration is lazy: enter the native request path so this boot
          // actually runs the product's start/logging lifecycle hooks.
          const address = server.address();
          if (!address || typeof address === "string") throw new Error("Expected a native TCP listener");
          const response = await fetch(`http://127.0.0.1:${address.port}/api/status`);
          expect(response.status).toBe(200);
          await response.text();
        } finally {
          if (server) await closeServer(server);
          await fixture.dispose();
        }
      }

      // Node emits MaxListenersExceededWarning asynchronously.
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(process.listenerCount("SIGTERM")).toBe(initialSigtermListeners);
      expect(process.listenerCount("SIGINT")).toBe(initialSigintListeners);
      expect(
        warnings.filter(
          (warning) =>
            warning.name === "MaxListenersExceededWarning" &&
            /SIG(?:TERM|INT)/.test(warning.message),
        ),
      ).toEqual([]);
    } finally {
      process.off("warning", captureWarning);
    }
  }));
});
