# Frontend Architecture

## Stack

- Vite
- React
- TypeScript
- `@xyflow/react` for the node canvas
- local state with React hooks

## Main UI Areas

- left sidebar for node creation and presets
- central canvas for graph editing and visual panels
- right inspector for editing selected node or group properties
- bottom/output area for validation, YAML preview, publish links, and import flow

## Editor Responsibilities

- maintain graph nodes, edges, and canvas groups
- autosave drafts to local storage
- import YAML into the canonical JSON model
- generate YAML previews
- restore and persist lightweight personal workspaces
- keep a stable published URL for the active workspace project
- perform guest snapshot publish through the same-origin publish API

## Non-Goals For MVP

- no collaborative editing
- no strong account system yet
- no server-side rendering requirement
- no direct secret-bearing calls from the browser
