/**
 * Deployment-time default for the Plainspace host.
 *
 * Self-hosted instances serve the Plainspace API themselves, so `https://plainspace.org`
 * is the wrong default for them. `docker-entrypoint.sh` writes a
 * `plainspaceHost` key into `./assets/sync-config-default-override.json` from the
 * `PLAINSPACE_HOST` environment variable at container start, and this reads it.
 *
 * Runtime-fetched rather than build-time baked: `src/app/config/env.generated.ts`
 * is compiled into the image by `npm run env` at build time, so an environment
 * variable set on a published image cannot reach it. The served asset is the only
 * channel that works without rebuilding — the same reason the WebDAV prefill uses it.
 *
 * A PREFILL, never a lock: a Plainspace account and provider both store their own
 * `host` once connected or saved, and this only supplies the value for a config
 * that does not have one yet. Users can still point at any host in the provider
 * settings.
 */

const OVERRIDE_URL = 'assets/sync-config-default-override.json';

let cached: Promise<string | null> | null = null;

const fetchHost = async (): Promise<string | null> => {
  try {
    const res = await fetch(OVERRIDE_URL);
    if (!res.ok) {
      return null;
    }
    const override = (await res.json()) as { plainspaceHost?: unknown };
    // Only a non-empty string is a usable base URL; anything else (absent key,
    // null, a number from a malformed env var) falls back rather than being
    // passed to the API service as a host.
    if (typeof override?.plainspaceHost !== 'string') {
      return null;
    }
    const host = override.plainspaceHost.trim().replace(/\/+$/, '');
    // Trailing slashes are stripped here so the value this function returns is
    // already a clean base URL. The connect dialog strips them again for its link,
    // and the API service appends paths to whatever it is given, so normalizing
    // once at the source keeps the stored host free of `//` in built URLs.
    return host || null;
  } catch {
    // No asset, offline, or malformed JSON. The hosted default is correct here.
    return null;
  }
};

/**
 * The Plainspace host to prefill: `PLAINSPACE_HOST` when set, else plainspace.org.
 *
 * Cached after the first call so every provider built in a session costs one
 * fetch, not one per instance. A failed fetch caches as `null` — retrying per
 * caller would re-request on every dialog open when the asset is simply absent,
 * which is the normal case for web builds.
 */
export const resolveDefaultPlainspaceHost = (): Promise<string | null> => {
  cached ??= fetchHost();
  return cached;
};

/** Test seam: drops the cache so a suite can change the mocked response. */
export const resetDefaultPlainspaceHostCache = (): void => {
  cached = null;
};
