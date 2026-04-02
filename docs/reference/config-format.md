# Config Format

## Canonical JSON

The app edits a `ConfigProject` document with:

- `nodes`: semantic graph nodes
- `edges`: semantic connections between nodes
- `canvasGroups`: visual panels on the editor canvas
- `meta`: version and editor metadata

Current canvas-group roles:

- `generic` - free-form visual panel with persisted size and optional child-drag behavior
- `rulePanel` - compact rule container whose child rules are auto-packed and exposed through one shared output

Notable current fields inside node payloads include:

- global formatter URL and global health-check URL on `globalSettings`
- optional per-group `customHealthCheckEnabled` and `customHealthCheckUrl` on `proxyGroup`
- provider `formatter.enabled` plus secret-bearing subscription URLs stored outside project JSON for workspace persistence

The default starter project used by the web app lives in [default/new.json](/n:/PROJECTS/service/clash-configuratoe/default/new.json).

## Supported Node Kinds

- `globalSettings`
- `proxyProvider`
- `manualProxy`
- `sourceMerge`
- `proxyGroup`
- `ruleSet`

## Secrets Split

Workspace storage does not keep all values in the project JSON.

Secret-bearing values are extracted into `secrets.json`, keyed by project id and node id:

- global formatter URL
- provider subscription URLs
- manual proxy username/password

## YAML Output

Generated Clash YAML includes:

- `profile`
- `proxy-providers`
- `proxies`
- `proxy-groups`
- `rules`

When the published server output is materialized for workspace-backed links, provider-backed sources may be expanded into static `proxies:` so the served YAML can preserve `dialer-proxy` chains while keeping helper proxies out of group membership.

## Import Rules

- accepts standard Clash YAML
- reconstructs providers, manual proxies, groups, and rule sets
- does not attempt to restore editor-specific layout or visual styling
