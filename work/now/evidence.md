# Evidence

## Local commit authorization (2026-10-08)

- User requested a local commit of the prepared changes. Scope includes the coherent handover tree and the pre-existing editor/schema/bridge repairs it incorporates; branch `dev`. Push, live deployment and history rewriting are not requested.
- Validation baseline: clean-copy release-check (49 tests, typecheck and production build), mocked deploy verification and both dependency audits passed during preparation. The subsequent GitHub-delivery edit only changes documentation and removes the archive helper; docs-check passed afterward.
- Pre-commit checks passed: docs-check (61 Markdown files, 121 local links), staged diff whitespace check, staged private/generated-file exclusions and credential-pattern scan. Compared all staged text against 8 original subscription/server/credential values and their encoded forms: no matches. This targeted check does not erase or certify old Git history.

## GitHub delivery preference (2026-10-08)

- User selected a GitHub link instead of a handover archive. Replaced archive instructions with clone/fork, private-repository access and prepared-branch delivery instructions; removed the packaging helper, npm command and generated handover ZIP.
- Verified local branch `dev` and origin `https://github.com/yrsolo/clash-configuratoe.git`. The prepared changes remain uncommitted/unpushed, so the GitHub link alone does not yet deliver them. No commit, push or access grant performed.
- Earlier archive verification below remains historical installation evidence; it is no longer the delivery route.

## Repository handover preparation (2026-10-07)

- Preserved the pre-existing uncommitted editor/schema/bridge changes; no commit, push, merge, live deployment or credential rotation performed.
- Inspected the supplied project only through redacted summaries, then reconstructed `default/new.json` from permitted fields: 35 nodes, 6 panels, 31 deduplicated edges, 4 placeholder providers. All credential-bearing sources disabled; DIRECT permitted until owner setup. Torrent websites route to TORRENTS, client processes to DIR.
- Replaced subscription URLs/server credentials in built-in creation and imported examples. Removed legacy standalone formatter example and oversized scaffold text. Only an explicit old-host migration check retains the former owner host in active frontend source.
- Compared 8 original credential/source values from the supplied project and committed starter against tracked/new text files, including encoded URL forms: no matches. This is a targeted scan, not proof of universal secret absence. Git history is unchanged; prior credentials need provider-side rotation.
- Permanent gateway template uses placeholders; renderer verified 11 API and 8 static operations, runtime payload 2.0, gateway service account, frontend bucket replacement, and missing-env rejection. No old gateway IDs are deployment defaults.
- Function helper preflights a requested gateway update, packages only 4 runtime files, uploads through Object Storage, uses nodejs22/512MB/120s and suppresses created-version environment output. PROXY_URL is optional; PUBLIC_APP_URL replaces hardcoded proxy bypass.
- Frontend helper uploads assets before index, specifies JS/CSS MIME and cache policy. Dry runs and mock CLI verified ZIP manifest, environment output redaction, missing-gateway early failure, MIME and ordering. No real `yc` mutations executed.
- Added actual JSON import/restore with validation, preserved graph layout/sources and fresh project identity; invalid JSON leaves the current project intact and shows an error. JSON Schema now generated from runtime Zod instead of a stale subset.
- Wrote separate Russian registration, full Yandex deployment, starter/setup, operations and Windows/macOS/Android/iOS guides. Official sources checked on 2026-10-07; clients selected as Clash Verge Rev, FlClash and Stash with explicit iOS compatibility limits.
- `npm run release-check` passed: docs/link check, typecheck, 13 schema + 25 web + 11 bridge tests (49 total), production build. `npm run schema:generate`, function/frontend dry runs, gateway render checks and `npm run test:deploy` also passed. Existing >500 kB bundle warning remains (about 668 kB JS before gzip).
- Bundled Linux sing-box identified from ELF/Go metadata: v1.13.4, Go 1.25.8, 67,384,232 bytes. SHA-256 recorded in serverless README. Its exact upstream-release provenance and real runtime execution are not verified locally.
- Handover archive packages the current tree including new docs/scripts/tests; excludes Git history, private env/local specs, dependencies, build outputs and temp files. Recipient must create their own cloud resources, keys and subscriptions.
- A clean archive install exposed 12 root and 4 bridge npm-audit findings. Updated compatible dependencies and moved both test workspaces to patched Vitest 4.1.11; bridge uses undici 7.30.0. Both audits report zero known vulnerabilities on 2026-10-07. Updated proxy documentation to match SOCKS5 support in the installed undici source; live proxy connectivity remains untested.
- Verified the final 139-file archive manifest, required handover files and private/generated exclusions. Extracted into a separate directory and ran the documented recipient sequence: both `npm ci` installs (zero audit findings), full `release-check` (49 tests, typecheck, 61 Markdown/121 links, build), then mocked `test:deploy`, all passed. Vitest discovery is restricted to schema source tests so emitted `dist` copies are not counted twice. Repacked afterward only to include this evidence entry.
- External validation still required by the new owner: cloud account/billing/permissions, live deploy/smoke checks, subscription availability, protocol connectivity and real clients on all four platforms. MVP authentication, public formatter/publication ownership/rate limits/SSRF controls remain documented hardening work.

## Legacy numeric prefix repair (2026-09-08)

- Old source YAML without additional-prefix now resolves generated filtered provider keys against the saved published project.
- Regression confirms `lib__9177` and `PO__9177` display `lib_` and `PO_`, while intentional `vpn_123` remains intact.
- Bridge tests: 11 passed; docs-check passed. Deployed active version `d4e9qbabgb8jed6ei6o6`.
- Existing materialized caches need published refresh, followed by a client subscription update.

## Provider prefixes (2026-09-08)

- Exported provider overrides and inspection labels now use the original Provider key followed by a space.
- Materialized publication prefixes names before deduplication and rewrites local dialer references; helper nodes remain excluded from group membership.
- Passed bridge tests (10), schema tests (10), web tests (23), typecheck, docs-check, and build.
- Deployed bridge version `d4e83g3to1s399rnah7b` and frontend `index-Du7-SZSq.js`. Public index and asset return 200 with the new prefix export code.
- Existing published caches require refresh to show the new names; no user projects were modified directly.

## Native Clash subscription importer (2026-09-08)

- Added provider format selection, server User-Agent negotiation, inspect propagation, and YAML import/export round-trip.
- Native mode preserves the entire proxy list and strips upstream global settings, groups, and rules; invalid/empty feeds fail explicitly.
- Live source checked in memory: all 19 proxies preserved exactly; no real URL or credentials stored in fixtures.
- Passed typecheck, schema tests (9), existing web tests (21), bridge tests (9), docs-check, and production build.
- Added focused web request propagation coverage for inspection and manual probing.
- Deployed frontend `index-v2KhpZmQ.js` and bridge version `d4e8or9vgrqphuj97v6j` on 2026-09-08.
- Production formatter and source inspection both returned HTTP 200 and all 19 source proxies in native Clash mode.
- Fixed deployment script: reserved `$latest` tag is assigned automatically, and failed CLI operations now stop deployment.
- Protocol connectivity and client XHTTP support have not been tested. Existing large-bundle build warning remains.

## Verified

- direct `vless://` URI nodes now connect into source merges and proxy groups and render as native Clash/Mihomo `vless` proxies
- supported Reality URI fields are exported: `sni`, `fp`, `flow`, `pbk`, and `sid`
- VLESS URIs are redacted from persisted workspace project JSON and restored from the workspace secret envelope
- imported Clash VLESS Reality proxies are reconstructed as direct VLESS URI nodes
- the editor exposes VLESS link creation from the toolbar and canvas context menu
- double-clicking a VLESS node opens the existing server-list dialog with its locally decoded server card, without sending the credential URI to the inspection endpoint

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
- `packages/schema` now exposes a richer service preset catalog for Telegram, YouTube, Meta, AI, Russian banks, and Russian services while keeping one preset equal to one ready-to-route rule node
- the web preset list now renders from the schema preset catalog instead of a hardcoded short array
- the editor now keeps a runtime-only undo/redo history for meaningful `ConfigProject` changes, with toolbar buttons and `Ctrl/Cmd+Z` plus `Ctrl/Cmd+Shift+Z`
- the editor shell now supports a narrow-screen layout where workspace/auth/project/import panels sit above the canvas and publish/preview panels sit below it
- node creation and preset creation now live in toolbar dropdown menus (`Добавить ноду`, `Добавить правило`) instead of always-visible side sections
- the starter-scene counts still update correctly when adding nodes or preset rule blocks through the new toolbar menus

## Checks Run

- `npm run typecheck`
- `npm run test --workspace @clash-configuratoe/schema`
- `npm run test --workspace @clash-configuratoe/web`
- `npm run docs-check`
- `npm run build`

- `npm run docs-check`
- `npm run typecheck`
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
- `yc storage s3 cp apps/web/dist/assets/index-7mzAfEy7.js s3://clash.solofarm.ru/assets/index-7mzAfEy7.js --content-type "application/javascript; charset=utf-8"`
- `npm run typecheck --workspace @clash-configuratoe/web`
- `npm run test --workspace @clash-configuratoe/web`
- `npm run build --workspace @clash-configuratoe/web`
- `yc storage s3 cp apps/web/dist/index.html s3://clash.solofarm.ru/index.html --content-type "text/html; charset=utf-8"`
- `yc storage s3 cp apps/web/dist/assets/index-CWtNmDNS.js s3://clash.solofarm.ru/assets/index-CWtNmDNS.js --content-type "application/javascript; charset=utf-8"`
- `yc storage s3 cp apps/web/dist/assets/index-dvQnBQ11.css s3://clash.solofarm.ru/assets/index-dvQnBQ11.css --content-type "text/css; charset=utf-8"`

## Production Smoke

- deployed the VLESS server-list build as `assets/index-BA_x7-CZ.js`; a cache-busted public index request references it and the asset returns `200 OK`

- deployed the VLESS-link frontend build to `clash.solofarm.ru` as `assets/index-CovqVfx4.js` and `assets/index-B3KqzY04.css`
- public `index.html` references `index-CovqVfx4.js`; a direct request to that asset returned `200 OK` with the expected JavaScript content type

- the current baseline keeps helper proxies in the same provider feed to preserve working Clash chain semantics, even though this still leaves UI noise on the Clash side
- `GET /api/published/yaml` supports lazy on-request refresh for workspace-backed published configs and keeps a 10-minute server-side cache window
- the lazy refresh path materializes provider-backed subscriptions into static `proxies:` before response, keeps helper proxies available for `dialer-proxy`, and removes provider `use:` membership from the returned proxy groups
- `POST /api/published/refresh` now forces that materialization immediately so the explicit publish refresh action can warm the cache before users fetch the stable YAML URL
- the production site now serves the visual-panel stabilization build through `assets/index-CABfgdoP.js` and `assets/index-ymyL48pH.css`
- the production site now serves the follow-up visual-panel resize/drag build through `assets/index-CHWZmOJW.js` and `assets/index-ymyL48pH.css`
- the current freeze candidate is deployed to the public site through `assets/index-BJgE6rdl.js` and `assets/index-BOlVZnjf.css`
- the production site now serves the preset-and-history build through `assets/index-7mzAfEy7.js` and `assets/index-BOlVZnjf.css`
- the production site now serves the mobile-layout and toolbar-menu build through `assets/index-CWtNmDNS.js` and `assets/index-dvQnBQ11.css`
- the repository no longer contains the temporary local `workspace-bridge` deploy zip after the freeze cleanup pass

## Residual Risks

- cloud-side probe numbers are still not equivalent to client-device Clash latency; they are only a server-side comparative benchmark
- tunnel parsing is grounded in the current Connliberty/Xray structure, but future upstream schema changes could still require another formatter pass
- eager publish refresh improves correctness, but it can make the refresh button noticeably slower when upstream subscriptions are slow
- the web build still emits a large-chunk warning for the main frontend bundle; this does not block the freeze baseline but remains a future optimization item
