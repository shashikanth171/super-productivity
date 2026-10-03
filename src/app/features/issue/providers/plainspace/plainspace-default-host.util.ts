import {
  getDeploymentBaseUrl,
  resetDeploymentOverridesCache,
} from '../../../../core/config/deployment-overrides';

/**
 * Default Plainspace host for a self-hosted deployment.
 *
 * A thin reader over the generic deployment overrides, kept so the key name
 * lives next to the provider that owns it. `docker-entrypoint.sh` writes
 * `PLAINSPACE_HOST` into the override asset at container start.
 *
 * A prefill, never a lock: a connected account and a saved provider each store
 * their own host, and this only supplies the value for a config without one.
 * Users can still point at any host in the provider settings.
 */
export const resolveDefaultPlainspaceHost = async (): Promise<string | null> =>
  (await getDeploymentBaseUrl('plainspaceHost')) ?? null;

export { resetDeploymentOverridesCache as resetDefaultPlainspaceHostCache };
