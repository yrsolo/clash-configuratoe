# Evidence

## Verified

- root `README.md` now reflects the current product shape: visual panels, JSON export, stable workspace publish URLs, same-origin formatter, and source inspection
- architecture and reference docs were updated to match the real system instead of earlier MVP assumptions
- `docs/reference/api.md` no longer describes source inspection as raw TCP latency; it now reflects cloud-side probe behavior
- `docs/reference/env.md` and checked-in env examples now match the actual runtime variables used by the web app and serverless bridge
- `apps/web/README.md` and `serverless/README.md` now describe the current responsibilities of those repo areas
- `work/now/current-task.md` and `work/now/plan.md` now reflect the documentation-and-cleanup pause instead of an older template-alignment task
- obvious transient files were removed, including test runner cache and unpacked or archived helper artifacts under `work/now`

## Checks Run

- `npm run docs-check`
- `npm run typecheck`
- `npm run test`

## Residual Risks

- stronger auth and ownership controls remain future work; the docs now describe this explicitly instead of implying those capabilities already exist
