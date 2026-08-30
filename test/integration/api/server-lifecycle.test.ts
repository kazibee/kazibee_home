import { describe, expect, it } from "vitest";
import type { TestAppResult } from "../../helpers/test-app";
import { cleanupTestApp, getTestApp } from "../../helpers/test-app";

describe("test server lifecycle", () => {
  // 12 full app boots — the heaviest single test in the repo. Under the
  // parallel integration tier it shares the machine with every other file,
  // so it gets a proportionate timeout instead of the default 30s.
  it("does not accumulate process signal listeners across repeated app boots", { timeout: 180_000 }, async () => {
    const initialSigtermListeners = process.listenerCount("SIGTERM");
    const initialSigintListeners = process.listenerCount("SIGINT");
    const warnings: Error[] = [];
    const captureWarning = (warning: Error) => warnings.push(warning);

    process.on("warning", captureWarning);
    try {
      for (let bootNumber = 0; bootNumber < 12; bootNumber += 1) {
        let testApp: TestAppResult | undefined;
        try {
          testApp = await getTestApp();
        } finally {
          await cleanupTestApp(testApp);
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
  });
});
