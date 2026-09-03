import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLICATIONS_DIR,
  XcodeNotInstalledError,
  activate,
  bundlePathFor,
  isInstalled,
  selectVersion,
} from "../src/xcode.js";

vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

const existsSyncMock = vi.mocked(existsSync);
const execFileSyncMock = vi.mocked(execFileSync);

afterEach(() => {
  vi.resetAllMocks();
});

describe("bundlePathFor", () => {
  it("names the bundle after the version, as the runner images do", () => {
    expect(bundlePathFor("16.4")).toBe("/Applications/Xcode_16.4.app");
    expect(bundlePathFor("26.0.1")).toBe("/Applications/Xcode_26.0.1.app");
  });

  it("always resolves under the Applications directory", () => {
    expect(bundlePathFor("16.4").startsWith(`${APPLICATIONS_DIR}/`)).toBe(true);
  });

  it("does not normalise the version it is given", () => {
    // `16.4.0` and `16.4` name different bundles; only one of them exists on
    // any given image. Guessing between them would be wrong more often than
    // right, so the version is used exactly as supplied.
    expect(bundlePathFor("16.4.0")).toBe("/Applications/Xcode_16.4.0.app");
  });

  it("builds a path even for an empty version", () => {
    // Matches the behaviour of the action this replaces: a blank input is not
    // rejected up front, it simply fails to resolve to an installed bundle.
    expect(bundlePathFor("")).toBe("/Applications/Xcode_.app");
  });
});

describe("isInstalled", () => {
  it("reports presence from the filesystem", () => {
    existsSyncMock.mockReturnValue(true);
    expect(isInstalled("/Applications/Xcode_16.4.app")).toBe(true);
    expect(existsSyncMock).toHaveBeenCalledWith("/Applications/Xcode_16.4.app");
  });

  it("reports absence", () => {
    existsSyncMock.mockReturnValue(false);
    expect(isInstalled("/Applications/Xcode_99.app")).toBe(false);
  });
});

describe("activate", () => {
  it("switches the developer directory with sudo", () => {
    activate("/Applications/Xcode_16.4.app");

    expect(execFileSyncMock).toHaveBeenCalledWith(
      "sudo",
      ["xcode-select", "-s", "/Applications/Xcode_16.4.app"],
      expect.anything(),
    );
  });

  it("passes the path as an argument rather than through a shell", () => {
    // A version carrying shell metacharacters must not be able to run
    // anything; as an argument vector there is no shell to escape into.
    activate("/Applications/Xcode_1.app; touch /tmp/pwned .app");

    const [command, args, options] = execFileSyncMock.mock.calls[0]!;
    expect(command).toBe("sudo");
    expect(args).toEqual([
      "xcode-select",
      "-s",
      "/Applications/Xcode_1.app; touch /tmp/pwned .app",
    ]);
    expect(options).not.toHaveProperty("shell", true);
  });

  it("lets stderr through so xcode-select can explain a refusal", () => {
    activate("/Applications/Xcode_16.4.app");

    const options = execFileSyncMock.mock.calls[0]![2] as {
      stdio: Array<string>;
    };
    expect(options.stdio[2]).toBe("inherit");
  });

  it("propagates a failure from xcode-select", () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error("Command failed: sudo xcode-select -s ...");
    });

    expect(() => activate("/Applications/Xcode_16.4.app")).toThrow(
      /Command failed/,
    );
  });
});

describe("selectVersion", () => {
  it("activates the bundle and returns its path", () => {
    existsSyncMock.mockReturnValue(true);

    expect(selectVersion("16.4")).toBe("/Applications/Xcode_16.4.app");
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "sudo",
      ["xcode-select", "-s", "/Applications/Xcode_16.4.app"],
      expect.anything(),
    );
  });

  it("throws with the documented message when the version is absent", () => {
    existsSyncMock.mockReturnValue(false);

    expect(() => selectVersion("99.9")).toThrow(XcodeNotInstalledError);
    // This exact wording is part of the contract users see in their logs.
    expect(() => selectVersion("99.9")).toThrow("Xcode 99.9 not installed");
  });

  it("does not invoke xcode-select when the version is absent", () => {
    existsSyncMock.mockReturnValue(false);

    expect(() => selectVersion("99.9")).toThrow();
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it("checks for the bundle before trying to activate it", () => {
    existsSyncMock.mockReturnValue(true);
    selectVersion("16.4");

    expect(existsSyncMock).toHaveBeenCalledWith("/Applications/Xcode_16.4.app");
  });
});