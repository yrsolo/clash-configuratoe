# clash-configuratoe

`clash-configuratoe` is a static-first visual builder for Clash Verge configurations. Users assemble proxy providers, manual proxies, proxy groups, rule blocks, and visual panels on a node canvas, then publish a stable YAML URL or guest snapshot.

## What It Is

This repository contains the current working baseline for a browser-based Clash configuration editor. The product uses a canonical JSON project format for editing and persistence, while generating Clash-compatible YAML as a derived artifact for export and sharing.

## Why It Exists

Editing large Clash configs by hand is slow, error-prone, and hard to explain to non-expert users. This project makes the configuration structure visible and editable through a graph UI, with presets for common routing scenarios such as AI services, Telegram, video, torrents, and a default rest-of-world path.

## Core Capabilities

- Node-based editor for providers, proxies, groups, rules, and visual canvas panels
- Canonical JSON project model with lossless editor metadata
- JSON export for lossless project backup and transfer
- Clash YAML export and best-effort Clash YAML import
- Stable published YAML links for workspace projects, plus guest snapshot publish links and QR codes
- Lightweight hash-based personal workspaces backed by a serverless storage bridge
- Same-origin formatter and source inspection routes behind the Yandex gateway
- Built-in starter presets and local draft autosave

## Quick Start

```bash
npm install
npm run dev
```

Then open:

- Web app: `http://localhost:5173`
- Documentation map: [docs/README.md](/n:/PROJECTS/service/clash-configuratoe/docs/README.md)

## Repository Structure

- `apps/web` - Vite + React client application
- `packages/schema` - domain types, presets, import/export logic, validation
- `docs` - permanent project documentation
- `work` - active task tracking and evidence
- `agent` - operating contract, prompt notes, and policy files
- `.codex/skills` - reusable procedural skills for docs, tracking, and checks
- `serverless` - cloud-function bridge code used behind the same-origin gateway
- `.github/workflows` - CI checks
- `scripts` - bootstrap, docs, and release helpers

## Documentation

Start here:

- [Documentation Map](/n:/PROJECTS/service/clash-configuratoe/docs/README.md)
- [Product Overview](/n:/PROJECTS/service/clash-configuratoe/docs/overview/product.md)
- [System Overview](/n:/PROJECTS/service/clash-configuratoe/docs/architecture/system-overview.md)

## Agent Workflow

- [AGENTS.md](/n:/PROJECTS/service/clash-configuratoe/AGENTS.md)
- [Operating Contract](/n:/PROJECTS/service/clash-configuratoe/agent/OPERATING_CONTRACT.md)
- [Current Task](/n:/PROJECTS/service/clash-configuratoe/work/now/current-task.md)

## Status

Feature development is currently paused. The repository should be treated as a working MVP baseline with a live editor, serverless workspace/publish bridge, same-origin formatter, and cloud-side source inspection. The main remaining gaps are product hardening and stronger auth, not missing core editor infrastructure.
