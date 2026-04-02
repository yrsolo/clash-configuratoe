# Serverless

Serverless code used behind the public gateway lives here.

## Current Contents

- `workspace-bridge/` - Yandex Cloud Function that handles workspace restore/load/save/delete, published project/YAML reads, formatter requests, and logical source inspection probes

## Why It Exists

The project stays static-first on the frontend, but secret-bearing storage operations, publish persistence, proxied formatter fetches, and cloud-side logical proxy inspection are pushed behind a small serverless bridge.

## Deploy Path

Use the scripted deploy flow instead of hand-assembling `yc` commands:

```powershell
npm run deploy:workspace-bridge
```

The script:

1. packages `serverless/workspace-bridge`
2. uploads the zip to Object Storage
3. creates a new Yandex Cloud Function version from the uploaded package
4. keeps `$latest` on the new version
5. optionally updates the API gateway from `work/now/clash-site-public.openapi.yaml`

This avoids the recurring failure mode where direct local `--source-path` deploys break once the zip exceeds Yandex Cloud's direct upload size limit.

The generated local package zip is a temporary deploy artifact and should not be kept in the repository.
