#!/bin/sh

# Set default port if not provided
: "${APP_PORT:=80}"
export APP_PORT

# Generate ./assets/sync-config-default-override.json from environment variables
JSON="{}"
JSON_PATH=./assets/sync-config-default-override.json
if [ -n "${WEBDAV_BASE_URL}" ]; then
  JSON=$(echo "$JSON" | jq ".webDav.baseUrl |= \"$WEBDAV_BASE_URL\"")
fi
if [ -n "${WEBDAV_USERNAME}" ]; then
  JSON=$(echo "$JSON" | jq ".webDav.userName |= \"$WEBDAV_USERNAME\"")
fi
if [ -n "${WEBDAV_SYNC_FOLDER_PATH}" ]; then
  JSON=$(echo "$JSON" | jq ".webDav.syncFolderPath |= \"$WEBDAV_SYNC_FOLDER_PATH\"")
fi
if [ "$JSON" != "{}" ]; then
  # Change syncProvider if previous variables are set
  JSON=$(echo "$JSON" | jq '.syncProvider |= "WebDAV"')
fi
if [ -n "${SYNC_INTERVAL}" ]; then
  JSON=$(echo "$JSON" | jq ".syncInterval |= $(expr $SYNC_INTERVAL \* 60000)")
fi
if [ -n "${IS_COMPRESSION_ENABLED}" ]; then
  JSON=$(echo "$JSON" | jq ".isCompressionEnabled |= $IS_COMPRESSION_ENABLED")
fi
if [ -n "${IS_ENCRYPTION_ENABLED}" ]; then
  JSON=$(echo "$JSON" | jq ".isEncryptionEnabled |= $IS_ENCRYPTION_ENABLED")
fi
# Default Plainspace host for self-hosted instances. Lives in the same override
# file because it is the same kind of thing: a deployment-time default the user
# can still override in the provider settings. Issue-provider defaults are NOT
# read from this file today (see plainspace-default-host.util.ts), so this key is
# only read at the point that builds a new provider config — a user who already
# saved a host keeps it.
if [ -n "${PLAINSPACE_HOST}" ]; then
  JSON=$(echo "$JSON" | jq ".plainspaceHost |= \"$PLAINSPACE_HOST\"")
fi
if [ "$JSON" != "{}" ]; then
  # Write the resultant json
  echo "$JSON" >$JSON_PATH
fi

# go back to nginx's built-in entrypoint script
exec /docker-entrypoint.sh nginx -g "daemon off;"
