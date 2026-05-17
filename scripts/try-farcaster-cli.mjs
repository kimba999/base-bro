#!/usr/bin/env node
/**
 * Tries the official @farcaster/mini-app-cli if published; otherwise runs local signer.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const local = join(__dirname, "generate-manifest.mjs");

const probe = spawnSync(
  "npm",
  ["view", "@farcaster/mini-app-cli", "version", "--json"],
  { encoding: "utf8", cwd: ROOT },
);

if (probe.status === 0 && probe.stdout.trim()) {
  const result = spawnSync(
    "npx",
    ["@farcaster/mini-app-cli@latest", "manifest", "create"],
    { cwd: ROOT, stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}

console.log(
  "Note: @farcaster/mini-app-cli is not published on npm (404). Using local manifest wizard…\n",
);
const result = spawnSync("node", [local, "--interactive"], {
  cwd: ROOT,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
