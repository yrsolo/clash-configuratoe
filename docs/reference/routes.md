# Routes Reference

## Current App Routes

- `/` - main editor
- `/?published=<id>&token=<token>` - loads a published project by secret-token link

## Current Same-Origin API Routes

- `POST /api/workspace/session/restore`
- `POST /api/workspace/projects/load`
- `POST /api/workspace/projects/save`
- `POST /api/workspace/projects/delete`
- `POST /api/source/inspect`
- `GET /api/formatter?url=<subscription-url>[&debug=1]`
- `POST /api/published/save`
- `POST /api/published/refresh`
- `GET /api/published/project?id=<id>&token=<token>`
- `GET /api/published/yaml?id=<id>&token=<token>`

## Publish Behavior

- workspace projects get one stable published YAML URL per project
- guest publishes create standalone snapshot links
- raw YAML is returned from `/api/published/yaml`, not from an HTML app route
- `Refresh stable publish link` now saves the current source YAML, eagerly warms the served materialized YAML, and updates the preview pane to that same server-rendered result
- workspace-backed `/api/published/yaml` responses may refresh provider sources on demand and reuse a 10-minute server-side cache
- provider formatter traffic is now routed through `/api/formatter`, which fetches upstream URLs through the serverless proxy, bypasses already-valid YAML proxy lists, and normalizes tunnel subscriptions into logical proxies with internal `dialer-proxy` helpers
