# Getting Started

## Requirements

- Node.js 24+
- npm 11+

## Install

```bash
npm install
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

## Main Developer Commands

```bash
npm run test
npm run build
npm run docs-check
```

## What To Explore Next

- [Repository Map](/n:/PROJECTS/service/clash-configuratoe/docs/overview/repository-map.md)
- [Frontend Architecture](/n:/PROJECTS/service/clash-configuratoe/docs/architecture/frontend.md)
- [API Reference](/n:/PROJECTS/service/clash-configuratoe/docs/reference/api.md)
- [Routes Reference](/n:/PROJECTS/service/clash-configuratoe/docs/reference/routes.md)
