/**
 * Runtime deployment configuration.
 *
 * `docker-entrypoint.sh` writes `./assets/sync-config-default-override.json` at
 * container start from environment variables, and the client fetches it here. A
 * deployment can therefore ship defaults for a self-hosted install without a
 * rebuild, which is the only channel that works for a published image:
 * `src/app/config/env.generated.ts` is compiled in by `npm run env` at build
 * time, so an environment variable set on `johannesjo/super-productivity:latest`
 * never reaches the running app.
 *
 * Generic on purpose: the file is a flat object of deployment values, and each
 * consumer reads its own key. Adding a setting means adding a key to the
 * entrypoint and calling `getDeploymentString` — not a new fetch, cache and
 * test-seam module.
 *
 * Every value is a PREFILL for the UI, never a lock: what a user has already
 * saved in their own settings wins, because each consumer only supplies a
 * default for a config that does not have one yet.
 *
 * The asset is absent in web builds and in Electron, where the served file is the
 * committed placeholder (or nothing at all), so every read must tolerate its
 * absence and fall back to the shipped default.
 */

const OVERRIDE_URL = 'assets/sync-config-default-override.json';

/** Shape written by docker-entrypoint.sh. Untyped on purpose: keys are added there. */
type DeploymentOverrides = Record<string, unknown>;

let cached: Promise<DeploymentOverrides> | null = null;

const fetchOverrides = async (): Promise<DeploymentOverrides> => {
  try {
    const res = await fetch(OVERRIDE_URL);
    if (!res.ok) {
      return {};
    }
    const parsed = (await res.json()) as unknown;
    // The committed placeholder is a valid JSON object with only a `_comment`.
    // Guard anyway so a non-object body (a stray HTML page from a SPA fallback,
    // say) cannot make every lookup silently undefined-or-throw.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as DeploymentOverrides)
      : {};
  } catch {
    // Missing asset, offline, or malformed JSON. Callers fall back to defaults.
    return {};
  }
};

/**
 * The deployment overrides, fetched once per session.
 *
 * Cached including a failed fetch: for web and Electron builds the asset is
 * routinely absent, and re-requesting per caller would mean one 404 every time a
 * dialog opens.
 */
export const getDeploymentOverrides = (): Promise<DeploymentOverrides> => {
  cached ??= fetchOverrides();
  return cached;
};

/**
 * A trimmed, non-empty string override, or undefined.
 *
 * Returns undefined for an absent key, a non-string (a malformed env var
 * reaching the client as a number, say), or a blank value — so a caller can use
 * `??` to fall back to its own default in one expression.
 */
export const getDeploymentString = async (key: string): Promise<string | undefined> => {
  const value = (await getDeploymentOverrides())[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/**
 * A string override with trailing slashes removed, for base URLs that get paths
 * appended to them. Normalizing here means a consumer cannot produce `//api/...`
 * by forgetting to strip a slash itself.
 */
export const getDeploymentBaseUrl = async (key: string): Promise<string | undefined> => {
  const value = await getDeploymentString(key);
  return value ? value.replace(/\/+$/, '') : undefined;
};

/** Test seam: drops the cache so a suite can change the mocked response. */
export const resetDeploymentOverridesCache = (): void => {
  cached = null;
};
