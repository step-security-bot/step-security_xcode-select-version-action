import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the parts of `action.yml` that callers depend on.
 *
 * This action is a drop-in replacement, so its interface is fixed by the
 * action it replaces rather than by our own preference. A rename, an added
 * required input, or a stray output would silently break callers that pin us
 * as a substitute, and no unit test of the implementation would notice.
 */
const manifestPath = fileURLToPath(new URL("../action.yml", import.meta.url));
const manifest = readFileSync(manifestPath, "utf8");

describe("action.yml", () => {
  it("declares exactly one input, named xcode-select-version", () => {
    const inputs = manifest
      .split(/^inputs:$/m)[1]!
      .split(/^runs:$/m)[0]!
      .split("\n")
      .filter((line) => /^ {2}\S+:/.test(line))
      .map((line) => line.trim().replace(/:$/, ""));

    expect(inputs).toEqual(["xcode-select-version"]);
  });

  it("keeps that input required", () => {
    expect(manifest).toMatch(/xcode-select-version:[\s\S]*?required: true/);
  });

  it("declares no outputs", () => {
    expect(manifest).not.toMatch(/^outputs:$/m);
  });

  it("runs on the node24 runtime", () => {
    expect(manifest).toMatch(/using: ['"]node24['"]/);
  });

  it("points at the committed bundle", () => {
    // The runtime performs no install, so the entrypoint has to be the
    // self-contained bundle rather than a source file with bare imports.
    expect(manifest).toMatch(/main: ['"]dist\/index\.js['"]/);
  });
});