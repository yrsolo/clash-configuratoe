# Operating Contract

## Goal

Keep development verifiable, incremental, and easy to resume.

## Invariants

1. Code beats prose when they conflict.
2. Important claims must be traceable to code, schema, tests, config, or runtime behavior.
3. Permanent docs live in `docs/`; temporary execution context lives in `work/`.
4. Root docs stay concise and navigational.
5. Non-trivial work should leave a clear trail in `work/now/`.

## Start Gate

Before noticeable work:

1. Read [README.md](/n:/PROJECTS/service/clash-configuratoe/README.md).
2. Read [docs/README.md](/n:/PROJECTS/service/clash-configuratoe/docs/README.md).
3. Read [AGENTS.md](/n:/PROJECTS/service/clash-configuratoe/AGENTS.md).
4. Check [work/now/current-task.md](/n:/PROJECTS/service/clash-configuratoe/work/now/current-task.md).
5. Update [work/now/plan.md](/n:/PROJECTS/service/clash-configuratoe/work/now/plan.md) when the task is larger than a local tweak.

## Source Of Truth

Use this priority when checking claims:

1. Runtime code
2. Schemas and contracts
3. Tests
4. CI and deploy files
5. Documentation
6. Temporary notes

## Finish Gate

Before closing a meaningful task:

1. Update affected docs.
2. Run relevant checks.
3. Record evidence and residual risks in [work/now/evidence.md](/n:/PROJECTS/service/clash-configuratoe/work/now/evidence.md).
