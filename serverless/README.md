# Serverless

Serverless code used behind the public gateway lives here.

## Current Contents

- `workspace-bridge/` - Yandex Cloud Function that handles workspace restore/load/save/delete and published project/YAML reads

## Why It Exists

The project stays static-first on the frontend, but secret-bearing storage operations and publish persistence are pushed behind a small serverless bridge.
