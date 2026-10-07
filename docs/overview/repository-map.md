# Repository Map

## Main Directories

- `apps/web` - browser application and editor UI
- `packages/schema` - domain contracts, presets, YAML import/export, validation
- `docs` - permanent project documentation
- `work` - active task state and evidence
- `agent` - operating contract, prompt notes, and policy files
- `.codex/skills` - procedural skills for docs, tracking, and checks
- `serverless` - cloud-function bridge code used behind the gateway
- `tests` - top-level integration and e2e placeholders; active package-level tests live next to their code
- `artifacts` - durable generated assets worth keeping
- `scripts` - developer helpers
- `.github/workflows` - CI automation

## Typical Reading Order

1. [README.md](../../readme.md)
2. [docs/README.md](../README.md)
3. [docs/overview/product.md](product.md)
4. [docs/architecture/system-overview.md](../architecture/system-overview.md)
5. [agent/OPERATING_CONTRACT.md](../../agent/OPERATING_CONTRACT.md)
6. [docs/reference/config-format.md](../reference/config-format.md)
