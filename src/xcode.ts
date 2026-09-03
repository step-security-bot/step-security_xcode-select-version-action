import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/** Directory the runner images install every Xcode release into. */
export const APPLICATIONS_DIR = "/Applications";

/** Raised when the requested version has no matching app bundle on the runner. */
export class XcodeNotInstalledError extends Error {
  constructor(public readonly version: string) {
    super(`Xcode ${version} not installed`);
    this.name = "XcodeNotInstalledError";
  }
}

/**
 * Maps a version string to the app bundle the runner images use for it.
 *
 * The images name each bundle after the version it contains, so `16.4` lives
 * at `/Applications/Xcode_16.4.app`. There is no lookup table to consult and
 * no normalisation to apply: a version the caller spells differently from the
 * image (`16.4.0` for `16.4`) simply will not resolve.
 */
export function bundlePathFor(version: string): string {
  return `${APPLICATIONS_DIR}/Xcode_${version}.app`;
}

/** Reports whether an app bundle is present at the given path. */
export function isInstalled(bundlePath: string): boolean {
  return existsSync(bundlePath);
}

/**
 * Points the active developer directory at an installed Xcode.
 *
 * `xcode-select` writes to `/var/db/xcode_select_link`, which is root-owned,
 * so the change needs `sudo`. Runner images grant the build user passwordless
 * sudo, which is what makes this work unattended.
 *
 * Arguments are passed as a vector rather than interpolated into a command
 * line, so a version containing shell metacharacters cannot escape into the
 * shell. Any legitimate version string behaves exactly as before.
 */
export function activate(bundlePath: string): void {
  execFileSync("sudo", ["xcode-select", "-s", bundlePath], {
    stdio: ["ignore", "pipe", "inherit"],
  });
}

/**
 * Selects the requested Xcode version, or throws if it is not installed.
 *
 * @throws {XcodeNotInstalledError} when no bundle matches `version`.
 */
export function selectVersion(version: string): string {
  const bundlePath = bundlePathFor(version);

  if (!isInstalled(bundlePath)) {
    throw new XcodeNotInstalledError(version);
  }

  activate(bundlePath);
  return bundlePath;
}
