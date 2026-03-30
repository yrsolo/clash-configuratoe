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

### `GET /api/published/project?id=<id>&token=<token>`

Loads one published project by secret-token link.

### `GET /api/published/yaml?id=<id>&token=<token>`

Returns raw YAML with `Content-Type: application/x-yaml; charset=utf-8`.

## Formatter API

### `GET /api/formatter?url=<subscription-url>[&debug=1]`

Fetches the upstream subscription through the cloud-function proxy and returns Clash-compatible YAML.

Behavior:

- if upstream already returns a valid YAML proxy list, it is passed through unchanged
- if upstream returns tunnel JSON, it is converted to Clash YAML
- if upstream returns base64 or raw `vless://` links, they are converted to Clash YAML
- if `debug=1` is present, the raw upstream body is returned as plain text

### `POST /api/source/inspect`

Request body:

- `url`

Returns JSON with parsed proxies from the source plus best-effort TCP latency to each `server:port`.
