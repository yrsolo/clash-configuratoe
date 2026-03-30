# Data Model

## Canonical Model

The canonical format is `ConfigProject` from `packages/schema`.

It contains:

- graph nodes for global settings, providers, manual proxies, merge nodes, groups, and rule sets
- editor edges for semantic relationships
- canvas groups for visual organization
- lossless editor metadata such as positions, colors, comments, and collapsed state

## Derived Artifacts

- Clash YAML for external use
- publish records containing `projectId`, `shareUrl`, `yamlUrl`, and `qrPayload`
- workspace secret envelopes that keep formatter URL, subscription URLs, and manual proxy credentials outside project JSON

## Round-Trip Rules

- JSON -> JSON is lossless
- JSON -> YAML is deterministic
- YAML -> JSON is best-effort and reconstructs semantics, not editor cosmetics
