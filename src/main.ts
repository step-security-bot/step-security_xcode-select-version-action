import * as core from "@actions/core";
import { readRequestedVersion } from "./inputs.js";
import { validateSubscription } from "./subscription.js";
import { selectVersion } from "./xcode.js";

/**
 * Switches the runner's active Xcode to the requested version.
 *
 * Every failure mode, whether the version is absent from the image or
 * `xcode-select` itself refuses, surfaces the same way: the step fails with
 * the underlying message and no output is produced.
 */
export async function run(): Promise<void> {
  try {
    await validateSubscription();

    const version = readRequestedVersion();
    const bundlePath = selectVersion(version);

    core.info(`Selected Xcode ${version} at ${bundlePath}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
