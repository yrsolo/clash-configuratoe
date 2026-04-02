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
3. The editor preserves node positions plus canvas-group metadata such as visual panels and rule panels in the canonical JSON model.
4. Workspace save persists sanitized JSON, YAML, and secrets through the serverless bridge.
5. The app keeps one stable published YAML URL per workspace project, or creates a guest snapshot publish when no workspace is active.
6. Explicit publish refresh eagerly materializes provider-backed sources on the server and warms the exact YAML served to clients and shown in the preview pane.

## Near-Term Boundaries

- no standalone backend application in MVP
- no traditional authenticated backend yet; identity is still weak hash-based
- workspace and published artifact persistence already run through same-origin serverless APIs
- subscription formatting, publish persistence, eager published-YAML warming, and source inspection already run in the cloud-function boundary
