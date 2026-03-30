# System Overview

## High-Level Shape

The MVP is a static-first web application:

- `apps/web` renders the editor, workspace UX, import flow, and publish UX
- `packages/schema` defines the canonical JSON model and YAML transformations
- `serverless/workspace-bridge` persists workspace data and published artifacts in Yandex Object Storage

## Source Of Truth

- `ConfigProject` JSON is canonical
- Clash YAML is derived output for external consumers
- editor cosmetics and canvas layout never round-trip through YAML

## Main Flow

1. User edits a `ConfigProject` on the graph canvas.
2. The app validates the graph.
3. The schema package renders Clash YAML.
4. Workspace save persists sanitized JSON, YAML, and secrets through the serverless bridge.
5. The app returns a secret-token share link, a raw YAML URL, and a QR code.

## Near-Term Boundaries

- no standalone backend application in MVP
- no traditional authenticated backend yet; identity is still weak hash-based
- workspace and published artifact persistence already run through same-origin serverless APIs
- VLESS subscription resolving is abstracted behind a resolver interface for later serverless implementation
