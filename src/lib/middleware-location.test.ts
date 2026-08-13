import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

// Next.js only resolves middleware from src/middleware.ts when the app lives
// under src/app. A middleware.ts at the repo root is silently ignored, leaving
// the production middleware-manifest.json empty and host-policy never enforced.
describe("middleware file location (deployment contract)", () => {
  it("src/middleware.ts must exist so Next.js picks it up in the build", () => {
    assert.ok(
      existsSync(resolve(root, "src/middleware.ts")),
      "src/middleware.ts not found — Next.js will not include host-policy in the build"
    );
  });

  it("root middleware.ts must be absent to avoid developer confusion", () => {
    assert.ok(
      !existsSync(resolve(root, "middleware.ts")),
      "middleware.ts found at repo root — it is silently ignored by Next.js and should not exist"
    );
  });
});