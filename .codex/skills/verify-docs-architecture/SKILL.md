# Skill: verify-docs-architecture

## Purpose

Check that the repository still follows the documentation architecture from `start.md`.

## Verify

- root docs stay overview-only
- `docs/` remains layered from overview to architecture to reference to process
- `work/` contains temporary execution context, not permanent architecture
- `agent/` and `.codex/skills/` exist for operational guidance
- load-bearing docs still point to real files

## Output

- what matches the intended structure
- what is missing
- what should move between `docs/` and `work/`
