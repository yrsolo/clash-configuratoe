# Frontend Architecture

## Stack

- Vite
- React
- TypeScript
- `@xyflow/react` for the node canvas
- local state with React hooks

## Main UI Areas

- desktop layout uses a three-column shell: utility panels, central canvas, and inspector/publish panels
- small-screen layout collapses into a single-column flow: workspace/auth/project/import panels above the canvas, publish/preview panels below it
- node and preset creation now live in toolbar dropdowns (`Добавить ноду`, `Добавить правило`) instead of long always-visible side lists
- the central canvas remains the dominant editing surface on every breakpoint

## Canvas Behavior

- `generic` canvas groups are free-form visual panels
- generic panels can be resized from the bottom-right grip
- active generic panels drag their contained nodes with them when those node centers remain inside the panel bounds
- inactive generic panels still render as containers but do not drag their contents
- `rulePanel` groups auto-pack contained `ruleSet` nodes into a compact vertical stack and expose one shared output handle

## Editor Responsibilities

- maintain graph nodes, edges, and canvas groups
- expose richer built-in service presets as single ready-to-route rule nodes
- keep a runtime-only undo/redo history for meaningful project edits
- expose compact toolbar creation menus for all node kinds and rule presets
- autosave drafts to local storage
- import YAML into the canonical JSON model
- export the current `ConfigProject` as JSON
- show the last server-rendered published YAML after an explicit refresh instead of a local best-effort project render
- restore and persist lightweight personal workspaces
- keep a stable published URL for the active workspace project
- perform guest snapshot publish through the same-origin publish API
- trigger an eager publish refresh so the preview and stable link reflect the same warmed server output
- open source inspection cards by double-clicking provider nodes, showing one logical tunnel server per card with optional detour details

## Non-Goals For MVP

- no collaborative editing
- no strong account system yet
- no server-side rendering requirement
- no direct browser access to workspace storage credentials
