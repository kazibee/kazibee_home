import { spawnSync } from "node:child_process";

if (process.env.KAZIBEE_SKIP_POSTINSTALL === "1") {
  process.exit(0);
}

const result = spawnSync("npm", ["run", "build:css"], { stdio: "inherit" });
process.exit(result.status ?? 1);
