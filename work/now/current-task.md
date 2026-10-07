# Current Task

## Active handover preparation (2026-10-07)

Status: implementation/documentation complete; GitHub delivery pending.
The user chose a GitHub link instead of an archive and authorized a local commit
on 2026-10-08. Push is not requested; transfer checks are recorded in evidence.
The earlier repairs below remain historical context.

Prepare a portable repository for a new owner who supplies their own subscriptions
and deploys into their own Yandex Cloud account. Deliver Russian onboarding,
separate cloud registration and deployment guides, platform client guides, and a
credential-free starter project derived from the supplied `new.json`.
Preserve the pre-existing working-tree changes and their evidence below. Commit
the prepared coherent tree locally. No live deployment, credential rotation or
push is requested in this task.

Acceptance: portable documentation links, reproducible deployment templates and
helpers without owner-specific infrastructure IDs, validated starter JSON/YAML,
relevant automated checks, and explicit remaining limitations.

## Title

Current repair: legacy published YAML must resolve filtered provider keys from the saved project so generated numeric suffixes do not appear in server names.

Active follow-up: prefix subscription server names with their Provider key in exports, inspection, and published configurations.

Current follow-up: import client-negotiated subscriptions using native Clash YAML, preserving Hysteria2 and XHTTP through inspection and publishing. Never store the real subscription URL in source or fixtures.

Add direct VLESS Reality link nodes to the Clash editor.

## Goal

Let users paste a `vless://` URI into a dedicated source node, connect it to proxy
groups, and export the corresponding Clash/Mihomo VLESS Reality proxy safely.

## Scope

- add a VLESS URI node to the schema, canvas, connection rules, inspector, and creation menus
- parse standard VLESS Reality URI parameters into exported Clash YAML
- keep the URI in workspace secrets rather than the stored project JSON
- import exported VLESS proxies back into VLESS URI nodes where their fields are representable
- cover export, validation, and editor creation with tests and document the capability

## Risks

- VLESS links contain credentials and must never appear in sanitized workspace project JSON
- malformed URI input must not produce invalid YAML
- only the supported VLESS Reality URI fields should be promised

## Docs Needed

Yes
