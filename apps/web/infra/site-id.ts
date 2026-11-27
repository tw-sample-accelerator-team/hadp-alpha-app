/**
 * Firebase Hosting site ids are global across all of Firebase, use lowercase
 * letters, digits and hyphens, and may not start with `demo` (Firebase keeps
 * that prefix for emulator demo projects).
 */
const MAX_LENGTH = 30;
const RESERVED_PREFIX = /^demo/;
const SAFE_PREFIX = "web-";

/** Why `id` is not a valid site id, or undefined when it is. */
export const siteIdProblem = (id: string): string | undefined => {
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(id)) {
    return "use lowercase letters, digits and hyphens, starting with a letter and not ending with a hyphen";
  }
  if (id.length > MAX_LENGTH) return `use at most ${String(MAX_LENGTH)} characters`;
  if (RESERVED_PREFIX.test(id)) return "it may not start with `demo`, which Firebase reserves";
  return undefined;
};

/**
 * `<app>-<stack>-<suffix>`, where the suffix is random per stack (index.ts keeps it in the
 * stack's state): readable, stable across deploys, and new after a destroy, so a recreated
 * stack never collides with the id Firebase keeps reserved for a deleted site. Prefixed with
 * `web-` when the app name starts with the reserved `demo`.
 */
export const defaultSiteId = (appName: string, stack: string, suffix: string): string => {
  const name = `${appName}-${stack}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const prefixed = RESERVED_PREFIX.test(name) || !/^[a-z]/.test(name) ? `${SAFE_PREFIX}${name}` : name;
  const base = prefixed.slice(0, MAX_LENGTH - suffix.length - 1).replace(/-+$/, "");
  return `${base}-${suffix}`;
};
