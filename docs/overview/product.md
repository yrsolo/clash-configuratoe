# Product Overview

## What It Is

`clash-configuratoe` is a visual builder for Clash Verge profiles. Instead of editing YAML directly, the user assembles a graph of providers, manual proxies, proxy groups, and thematic rules, then exports a valid Clash configuration.

## Who It Is For

- power users who tune Clash Verge manually today
- operators preparing configs for less technical teammates or clients
- anyone who wants reusable presets and a shareable output URL

## Problem It Solves

Manual Clash YAML quickly becomes hard to reason about when providers, groups, and rule routing grow. The editor turns that hidden routing logic into visible blocks, keeps editor-only metadata in JSON, and generates YAML only when needed.

## Main Scenarios

- build a config from scratch on a graph canvas
- import an existing Clash YAML and continue editing visually
- apply built-in presets for AI, Telegram, video, torrents, and default traffic
- keep a stable client subscription URL for one workspace project and update the YAML behind that same link
- publish a guest snapshot link, raw YAML view, and QR code when needed

## Next Reading

- [Getting Started](/n:/PROJECTS/service/clash-configuratoe/docs/overview/getting-started.md)
- [System Overview](/n:/PROJECTS/service/clash-configuratoe/docs/architecture/system-overview.md)
- [Config Format](/n:/PROJECTS/service/clash-configuratoe/docs/reference/config-format.md)
