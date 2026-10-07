# Getting Started

## Requirements

- Node.js 24+
- npm 11+

## Install

```bash
npm ci
```

## Run The App

```bash
npm run dev
```

Open `http://localhost:5173`.

## Current Runtime Model

- guest mode works without sign-in and uses local draft storage
- workspace mode uses `user name + access code` to derive a weak hash key in the browser
- same-origin `/api/workspace/*` and `/api/published/*` routes talk to the serverless bridge

Vite alone does not provide these API routes. Local guest editing and file export
work without them; cloud workspace/publish/inspection require a deployed gateway.
Vite reads public environment files from `apps/web`, not the repository root.
The starter in `default/new.json` contains disabled placeholder sources and routes
directly until the owner configures real subscriptions.

For handover, follow [new owner onboarding](../reference/handover.md),
[Yandex deployment](../reference/yandex-deploy.md), and
[subscription setup](../reference/starter-configuration.md).

## Main Developer Commands

```bash
npm run test
npm run build
npm run docs-check
```

For the full checks, install the separate function dependencies with
`npm ci --prefix serverless/workspace-bridge`, then run `npm run release-check`.

## What To Explore Next

- [Repository Map](repository-map.md)
- [Frontend Architecture](../architecture/frontend.md)
- [API Reference](../reference/api.md)
- [Routes Reference](../reference/routes.md)
