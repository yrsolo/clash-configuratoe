# Skill: trace-source-of-truth

## Purpose

Verify important claims against the real implementation before updating docs.

## Use When

- changing API or publish behavior
- changing auth or workspace flows
- changing config or env handling
- doing a documentation sync after a large stage

## Priority Order

1. Code
2. Schemas and contracts
3. Tests
4. CI and deploy files
5. Documentation

## Output

- verified claims
- inferred claims
- unverified claims
- docs that drift from implementation
