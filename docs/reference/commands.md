# Commands Reference

## npm

- `npm install` - install workspace dependencies
- `npm run dev` - run the web app locally
- `npm run docs-check` - verify required docs structure
- `npm run typecheck` - typecheck schema and web workspaces
- `npm run test` - build schema and run schema + web tests
- `npm run build` - build schema and web app
- `npm run release-check` - docs-check + typecheck + test + build
- `npm run deploy:workspace-bridge` - package the cloud function, upload the zip to Object Storage, create a new Yandex Cloud Function version, and update the API gateway spec

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
