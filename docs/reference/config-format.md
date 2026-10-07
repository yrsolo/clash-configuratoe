# Config Format

## Native Clash subscriptions

All subscription servers are named `<Provider key> <original name>` in inspection
and published YAML. Provider-based exports use Mihomo's `override.additional-prefix`.
Filtered source branches retain the original provider key as their display prefix.
For older published YAML without prefix overrides, refresh resolves generated
filter keys against the saved project's provider nodes; intentional digits in
the original provider key remain unchanged.
Publication rewrites provider-local `dialer-proxy` references with the same prefix
and keeps internal helper nodes out of selectable group membership.

Provider nodes accept `formatter.sourceFormat: "clash"` (omitted or `"legacy"` keeps existing behavior).
In the provider inspector, paste the subscription URL and select **Clash YAML (подписки для Happ)**.
This enables the server formatter, which requests native YAML using a Clash User-Agent.
The formatter preserves all proxy fields, including Hysteria2 and XHTTP options, but excludes upstream groups, rules, and global settings.
Connect the provider to your own groups as usual. Empty or non-Clash responses fail explicitly.
YAML export carries `format=clash` in the formatter URL; YAML import restores the selection.
Inspection and published refresh use the same format. Protocol support still depends on the client core.

## Canonical JSON

The JSON Schema snapshot is generated from the runtime Zod model with
`npm run schema:generate`. Regenerate it after contract changes; the old hand-written
snapshot omitted global settings, merge nodes and VLESS and could reject valid
editor projects. Runtime parsing remains the source of truth.

The [handover starter](starter-configuration.md) has disabled placeholder sources.
New browser projects resolve their formatter URL against the current origin;
offline/schema-only rendering uses `https://formatter.invalid/api/formatter` as a
placeholder when a formatter is needed and no explicit URL is supplied.

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

The default starter project used by the web app lives in [default/new.json](../../default/new.json).

## Supported Node Kinds

- `globalSettings`
- `proxyProvider`
- `manualProxy`
- `vlessProxy`
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
# Direct VLESS Reality links

Use a **VLESS link** node for one `vless://` URI rather than an HTTP subscription.
Connect it to a source merge or proxy group just like a manual proxy. The generated
Clash/Mihomo YAML includes the URI's server, port, UUID, network, and supported
Reality fields: `sni`, `fp`, `flow`, `pbk`, and `sid`.

The URI is a credential. Workspace projects keep it in the project's secret envelope
instead of the stored project JSON, but the generated YAML necessarily contains the
connection UUID and must be shared only with intended clients.

Double-click a VLESS link node to view the decoded server card. Unlike an HTTP
subscription, a direct URI contains one server and is not cloud-probed from that view.
