import * as core from "@actions/core";

/** Name of the sole input accepted by this action. */
export const VERSION_INPUT = "xcode-select-version";

/**
 * Reads the requested Xcode version from the action inputs.
 *
 * The input is declared `required` in `action.yml`, but that declaration is
 * advisory only: GitHub Actions does not enforce it, and neither did the
 * action this replaces. An omitted or blank value therefore flows through and
 * is reported later as a missing-Xcode failure, which keeps the observable
 * behaviour identical.
 */
export function readRequestedVersion(): string {
  return core.getInput(VERSION_INPUT);
}