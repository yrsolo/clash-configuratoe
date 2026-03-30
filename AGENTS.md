# AGENTS.md

This repository follows a lightweight documentation-first workflow.

## Before Large Changes

1. Read [README.md](/n:/PROJECTS/service/clash-configuratoe/README.md).
2. Read [docs/README.md](/n:/PROJECTS/service/clash-configuratoe/docs/README.md).
3. Read [agent/OPERATING_CONTRACT.md](/n:/PROJECTS/service/clash-configuratoe/agent/OPERATING_CONTRACT.md).
4. Read [work/now/current-task.md](/n:/PROJECTS/service/clash-configuratoe/work/now/current-task.md).
5. Update `work/now/plan.md` if the task is larger than a local tweak.

## Source Of Truth

When docs and implementation diverge, trust these in order:

1. Code
2. Schema and contracts
3. Tests
4. Runtime configuration
5. Documentation

## Documentation Rules

- Root `README.md` stays overview-only.
- `docs/overview` explains the product quickly.
- `docs/architecture` explains implementation shape and contracts.
- `docs/reference` is precise and operational.
- `docs/process` explains workflow and governance.
- `work/` stores temporary execution context and evidence.

## Tracking Rules

For meaningful work, keep these current:

- `work/now/current-task.md`
- `work/now/plan.md`
- `work/now/evidence.md`

## Safety

- Never commit real secrets.
- Treat the checked-in `.env` as compromised sample material that must be rotated before any deployment.
- Keep secret-bearing integrations behind serverless boundaries.
