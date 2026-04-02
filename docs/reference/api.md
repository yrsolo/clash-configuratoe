# API Reference

This project uses same-origin serverless routes behind the public gateway.

## Workspace API

All workspace routes are `POST` and expect `userName` + `userKey`.

### `POST /api/workspace/session/restore`

Restores the lightweight workspace session and returns:

- `session`
- `index`
- `activeProject`
- `secrets`

### `POST /api/workspace/projects/load`

Loads one project and its secret envelope for the current workspace.

Request fields:

- `userName`
- `userKey`
- `projectId`

### `POST /api/workspace/projects/save`

Saves:

- sanitized project JSON
- derived YAML
- secret envelope
- workspace index metadata

Request fields:

- `userName`
- `userKey`
- `project`
- `secrets`
- `yaml`
- `setActive`

### `POST /api/workspace/projects/delete`

Deletes:

- project JSON
- project YAML
- project secret entries
- stable published artifact for that project

## Published Config API

### `POST /api/published/save`

Stores a published project snapshot and raw YAML.

The app uses this directly for guest snapshot publish. Workspace projects are also kept in sync automatically when `/api/workspace/projects/save` runs.

### `POST /api/published/refresh`

Force-refreshes one published artifact and returns the exact YAML that will be served to clients.

Behavior:

- immediately materializes provider-backed sources instead of waiting for the next YAML request
- refreshes the 10-minute server-side cache window
- is used by the editor's explicit refresh action so the preview can match the live published output

### `GET /api/published/project?id=<id>&token=<token>`

Loads one published project by secret-token link.

### `GET /api/published/yaml?id=<id>&token=<token>`

Returns raw YAML with `Content-Type: application/x-yaml; charset=utf-8`.

For workspace-backed published configs:

- the route can lazily refresh provider-backed sources on request
- the refreshed result is cached server-side for 10 minutes
- tunnel subscriptions are materialized into static `proxies:` before response, so helper proxies stay available for `dialer-proxy` while proxy groups only receive the visible main proxies
- if `/api/published/refresh` has already warmed the record, this route returns that warmed materialized YAML directly

## Formatter API

### `GET /api/formatter?url=<subscription-url>[&debug=1]`

Fetches the upstream subscription through the cloud-function proxy and returns Clash-compatible YAML.

Behavior:

- if upstream already returns a valid YAML proxy list, it is passed through unchanged
- if upstream returns tunnel JSON, it is converted to Clash YAML with one visible proxy per logical tunnel entry
- detour/upstream helpers are emitted as deterministic internal `dialer-proxy` targets instead of public `Upstream_*` names
- if upstream returns base64 or raw `vless://` links, they are converted to Clash YAML
- if `debug=1` is present, the raw upstream body is returned as plain text

### `POST /api/source/inspect`

Request body:

- `url`
- `runProbe`
- `probeUrl` (optional, used only when `runProbe` is true)

Returns JSON with parsed proxies from the source. When `runProbe` is true, the response also includes cloud-side probe results through the parsed proxies. This is a server-side health probe, not a client-device Clash latency measurement.

Inspect semantics:

- tunnel helper proxies referenced through `dialer-proxy` are collapsed into the main logical proxy card
- each returned item may include `detourServer`, `detourPort`, and `detourType`
- `total` counts logical proxies, not helper proxies
