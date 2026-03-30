# Integrations

## Current Boundary

The repository still does not include a standalone backend application, but it does include a live Yandex Cloud Function bridge behind the public gateway.

## Current External Integrations

- Yandex Object Storage for static frontend hosting
- private Yandex Object Storage bucket for workspaces and published artifacts
- Yandex API Gateway for same-origin routing
- Yandex Cloud Function `workspace-bridge` for workspace and publish persistence
- same Yandex Cloud Function route `/api/formatter` for proxied subscription formatting

## Planned External Integrations

- secret-backed subscription resolver for VLESS-to-YAML transformation
- future Yandex authentication for private ownership and revocation

## Workspace Bridge

The editor uses a thin Yandex Cloud Function bridge for private user workspaces, published YAML, and proxied formatter requests:

- same-origin routes under `/api/workspace/*`
- same-origin routes under `/api/published/*`
- same-origin route `/api/formatter`
- private Object Storage bucket for `index.json`, project JSON, YAML, and `secrets.json`
- weak hash-based client identity (`user name + short code`) for early-stage personal workspaces
- stable published YAML identity for each workspace project
- upstream formatter fetches go through a proxy defined in function environment, so provider formatting no longer depends on the client already having working proxies
