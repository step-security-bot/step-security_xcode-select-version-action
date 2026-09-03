import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const core = {
  getInput: vi.fn<(name: string) => string>(),
  info: vi.fn(),
  error: vi.fn(),
  setFailed: vi.fn(),
};
const selectVersion = vi.fn<(version: string) => string>();
const validateSubscription = vi.fn<() => Promise<void>>();

vi.mock("@actions/core", () => core);
vi.mock("../src/xcode.js", async () => {
  const actual =
    await vi.importActual<typeof import("../src/xcode.js")>("../src/xcode.js");
  return { ...actual, selectVersion };
});
vi.mock("../src/subscription.js", () => ({ validateSubscription }));

async function runAction(): Promise<void> {
  const { run } = await import("../src/main.js");
  await run();
}

beforeEach(() => {
  validateSubscription.mockResolvedValue(undefined);
  core.getInput.mockReturnValue("16.4");
  selectVersion.mockReturnValue("/Applications/Xcode_16.4.app");
});

afterEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
});

describe("run", () => {
  it("selects the version named by the input", async () => {
    await runAction();

    expect(core.getInput).toHaveBeenCalledWith("xcode-select-version");
    expect(selectVersion).toHaveBeenCalledWith("16.4");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("checks entitlement before touching the runner", async () => {
    const order: string[] = [];
    validateSubscription.mockImplementation(async () => {
      order.push("subscription");
    });
    selectVersion.mockImplementation(() => {
      order.push("select");
      return "/Applications/Xcode_16.4.app";
    });

    await runAction();

    expect(order).toEqual(["subscription", "select"]);
  });

  it("fails with the message from an absent version", async () => {
    const { XcodeNotInstalledError } = await import("../src/xcode.js");
    selectVersion.mockImplementation(() => {
      throw new XcodeNotInstalledError("99.9");
    });

    await runAction();

    expect(core.setFailed).toHaveBeenCalledWith("Xcode 99.9 not installed");
  });

  it("fails with the message from a refused switch", async () => {
    selectVersion.mockImplementation(() => {
      throw new Error("Command failed: sudo xcode-select -s");
    });

    await runAction();

    expect(core.setFailed).toHaveBeenCalledWith(
      "Command failed: sudo xcode-select -s",
    );
  });

  it("does not select anything when entitlement fails", async () => {
    validateSubscription.mockRejectedValue(new Error("denied"));

    await runAction();

    expect(selectVersion).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith("denied");
  });

  it("reports a non-Error throw rather than swallowing it", async () => {
    selectVersion.mockImplementation(() => {
      throw "unexpected";
    });

    await runAction();

    expect(core.setFailed).toHaveBeenCalledWith("unexpected");
  });

  it("passes a blank input straight through, as the original did", async () => {
    core.getInput.mockReturnValue("");
    const { XcodeNotInstalledError } = await import("../src/xcode.js");
    selectVersion.mockImplementation(() => {
      throw new XcodeNotInstalledError("");
    });

    await runAction();

    expect(selectVersion).toHaveBeenCalledWith("");
    expect(core.setFailed).toHaveBeenCalledWith("Xcode  not installed");
  });
});