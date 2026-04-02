# Evidence

## Verified

- `scripts/deploy-workspace-bridge.ps1` now provides a repeatable Windows-first deploy path for `serverless/workspace-bridge`
- the scripted path packages the function, uploads it to Object Storage, creates a new Yandex Cloud Function version from the package bucket, and optionally updates the API gateway spec
- repo docs now explain why the script exists: direct local `yc serverless function version create --source-path ...` becomes unreliable once the package exceeds the direct upload size limit
- `serverless/workspace-bridge/index.js` parses Connliberty tunnel bundles as logical proxies instead of exposing public `Upstream_*` helpers
- tunnel helper proxies are emitted with deterministic internal names in the form `__dialer__<hash>` and are referenced from visible proxies through `dialer-proxy`
- formatter field mapping preserves main tunnel transport fields including `flow`, `network`, `servername`, `client-fingerprint`, reality opts, and currently supported `ws`/`grpc` transport data
- `/api/source/inspect` collapses helper proxies and returns one logical item per visible proxy, with optional `detourServer`, `detourPort`, and `detourType`
- the web inspect modal renders one card per logical server and shows detour details inside the same card instead of duplicating helper entries
- the web inspect modal no longer starts cloud probes automatically on open; probe execution is explicit through a manual button in the modal
- `proxyGroup` supports optional per-group health-check overrides through `customHealthCheckEnabled` and `customHealthCheckUrl`
- YAML export only emits a group-level custom `url` for `url-test` groups when that override is enabled
- Clash YAML import restores the override when a group's `url` differs from the first/global auto-select URL
- explicit publish refresh now eagerly warms the server-rendered YAML and the preview panel is intended to show that exact warmed output instead of a local best-effort render
- visual panel resize now persists from React Flow's final measured dimensions instead of a separate resize callback path, which avoids the panel collapsing back to the minimum size after mouse resize
- generic panel drag no longer writes intermediate panel-only positions into project state; child nodes now move in the same local flow layer and are committed together on drag stop
- dragging a generic panel keeps its contained nodes pinned more reliably during fast movement because the final project commit now uses the latest live flow-node positions
- visual panel resize now uses a custom bottom-right grip inside the React Flow node and computes width/height from mouse deltas divided by the current viewport zoom, avoiding the broken coordinate math from the previous resize-control path
- live child movement during generic panel drag now happens in `onNodesChange` from React Flow panel position deltas instead of relying on a separate drag callback that could miss fast movements
- root and architecture/reference docs now describe the current freeze baseline more precisely, including the two canvas-panel roles, the warmed published preview behavior, and the manual source-probe trigger
- the temporary local serverless package archive `serverless/workspace-bridge-package-py.zip` was removed and ignored so it does not pollute the freeze baseline

## Checks Run

- `npm run docs-check`
- `npm run test --workspace @clash-configuratoe/schema`
- `npm run test --workspace @clash-configuratoe/web`
- `npm run test` in `serverless/workspace-bridge`
- `npm run build`
- `yc storage s3 cp apps/web/dist/index.html s3://clash.solofarm.ru/index.html --content-type "text/html; charset=utf-8"`
- `yc storage s3 cp apps/web/dist/assets/index-CABfgdoP.js s3://clash.solofarm.ru/assets/index-CABfgdoP.js --content-type "application/javascript; charset=utf-8"`
- `yc storage s3 cp apps/web/dist/assets/index-ymyL48pH.css s3://clash.solofarm.ru/assets/index-ymyL48pH.css --content-type "text/css; charset=utf-8"`
- `yc storage s3 cp apps/web/dist/assets/index-CHWZmOJW.js s3://clash.solofarm.ru/assets/index-CHWZmOJW.js --content-type "application/javascript; charset=utf-8"`
- `npm run release-check`
- `yc storage s3 cp apps/web/dist/assets/index-BJgE6rdl.js s3://clash.solofarm.ru/assets/index-BJgE6rdl.js --content-type "application/javascript; charset=utf-8"`
- `yc storage s3 cp apps/web/dist/assets/index-BOlVZnjf.css s3://clash.solofarm.ru/assets/index-BOlVZnjf.css --content-type "text/css; charset=utf-8"`

## Production Smoke

- the current baseline keeps helper proxies in the same provider feed to preserve working Clash chain semantics, even though this still leaves UI noise on the Clash side
- `GET /api/published/yaml` supports lazy on-request refresh for workspace-backed published configs and keeps a 10-minute server-side cache window
- the lazy refresh path materializes provider-backed subscriptions into static `proxies:` before response, keeps helper proxies available for `dialer-proxy`, and removes provider `use:` membership from the returned proxy groups
- `POST /api/published/refresh` now forces that materialization immediately so the explicit publish refresh action can warm the cache before users fetch the stable YAML URL
- the production site now serves the visual-panel stabilization build through `assets/index-CABfgdoP.js` and `assets/index-ymyL48pH.css`
- the production site now serves the follow-up visual-panel resize/drag build through `assets/index-CHWZmOJW.js` and `assets/index-ymyL48pH.css`
- the current freeze candidate is deployed to the public site through `assets/index-BJgE6rdl.js` and `assets/index-BOlVZnjf.css`
- the repository no longer contains the temporary local `workspace-bridge` deploy zip after the freeze cleanup pass

## Residual Risks

- cloud-side probe numbers are still not equivalent to client-device Clash latency; they are only a server-side comparative benchmark
- tunnel parsing is grounded in the current Connliberty/Xray structure, but future upstream schema changes could still require another formatter pass
- eager publish refresh improves correctness, but it can make the refresh button noticeably slower when upstream subscriptions are slow
- the web build still emits a large-chunk warning for the main frontend bundle; this does not block the freeze baseline but remains a future optimization item
