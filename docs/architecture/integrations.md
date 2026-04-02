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

- future Yandex authentication for private ownership and revocation

## Workspace Bridge

The editor uses a thin Yandex Cloud Function bridge for private user workspaces, published YAML, and proxied formatter requests:

- same-origin routes under `/api/workspace/*`
- same-origin routes under `/api/published/*`
- same-origin route `/api/formatter`
- same-origin route `/api/source/inspect`
- private Object Storage bucket for `index.json`, project JSON, YAML, and `secrets.json`
- weak hash-based client identity (`user name + short code`) for early-stage personal workspaces
- stable published YAML identity for each workspace project
- upstream formatter fetches go through a proxy defined in function environment, so provider formatting no longer depends on the client already having working proxies
- tunnel-style upstream subscriptions are normalized into one logical proxy per tunnel entry, with internal deterministic detour helpers kept behind `dialer-proxy`
- source inspection runs in the cloud-function boundary and probes parsed logical proxies against the configured health-check URL while collapsing detour helpers into the parent card
- opening source inspection loads logical proxies without probing by default; cloud probing starts only when the user explicitly requests it from the modal
- published YAML can now be lazily refreshed on request; workspace-backed links reuse a 10-minute cache and materialize tunnel providers into static proxies before returning the config
- the editor's explicit publish refresh now eagerly warms that same materialized YAML so the preview pane can mirror the exact text served by the stable client URL
