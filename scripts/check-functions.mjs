import { zipFunctions } from "@netlify/zip-it-and-ship-it";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const output = await mkdtemp(join(tmpdir(), "healthycash-functions-"));
try {
  const functions = await zipFunctions("netlify/functions", output, {
    config: { "*": { nodeBundler: "esbuild", nodeVersion: "24" } },
  });
  assert.deepEqual(
    functions.map((fn) => fn.name).sort(),
    [
      "auth-config",
      "auth-exchange",
      "auth-logout",
      "auth-start",
      "kakao-callback",
      "member-profile",
      "naver-callback",
    ].sort(),
  );
  console.log(
    "Netlify function bundles verified:",
    functions.map((fn) => fn.name).join(", "),
  );
} finally {
  await rm(output, { recursive: true, force: true });
}
