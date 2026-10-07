# Commands Reference

## npm

- `npm ci` - install workspace dependencies from the lockfile
- `npm ci --prefix serverless/workspace-bridge` - install the separate bridge dependencies
- `npm run dev` - run the web app locally
- `npm run docs-check` - verify required docs and portable local Markdown links
- `npm run schema:generate` - regenerate the JSON Schema snapshot from the runtime contract
- `npm run typecheck` - typecheck schema and web workspaces
- `npm run test` - build schema and run schema + web tests
- `npm run build` - build schema and web app
- `npm run test:bridge` - run the serverless bridge tests
- `npm run test:deploy` - check deployment packaging/MIME/preflight/output against a mock CLI; requires PowerShell and an existing frontend build, never calls the cloud
- `npm run release-check` - docs-check + typecheck + schema/web tests + bridge tests + build
- `npm run deploy:workspace-bridge` - package the cloud function, upload the zip to Object Storage, create a new Yandex Cloud Function version, and update the API gateway spec
- `npm run deploy:workspace-bridge -- -DryRun -SkipGatewayUpdate` - validate/package locally without cloud calls
- `npm run gateway:render` - render `deploy/yandex/gateway.local.yaml` from your environment values
- `npm run deploy:frontend` - upload fingerprinted assets before the entrypoint
- `npm run deploy:frontend -- -DryRun` - check the frontend upload plan without cloud calls

## Make

- `make bootstrap`
- `make dev`
- `make build`
- `make test`
- `make docs-check`
- `make release-check`

## Shell Helpers

- `bash scripts/bootstrap.sh`
- `bash scripts/docs-check.sh`
- `bash scripts/test.sh`
- `bash scripts/release-check.sh`

## PowerShell Helpers

- `powershell -ExecutionPolicy Bypass -File scripts/deploy-workspace-bridge.ps1` - recommended deploy path for the `workspace-bridge` function on this repo's Windows-first workstation setup

Use `pwsh -File` on macOS/Linux. First function deployment uses `-SkipGatewayUpdate`.
See [complete deployment and variables](yandex-deploy.md) before running cloud mutations.
