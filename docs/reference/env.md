# Environment Reference

## Required For Local Development

- `VITE_PUBLIC_APP_URL` - base application URL used to compose publish links
- `VITE_WORKSPACE_API_BASE` - same-origin workspace and publish route base, defaults to `/api/workspace`
- `VITE_WORKSPACE_APP_SALT` - public salt used when deriving weak hash-based workspace keys in the browser

## Runtime Secret Variables

- `WORKSPACE_BUCKET` - private Object Storage bucket used by the serverless bridge
- `AWS_ACCESS_KEY_ID` - Object Storage access key for the serverless bridge
- `AWS_SECRET_ACCESS_KEY` - Object Storage secret key for the serverless bridge
- `S3_ENDPOINT` - Object Storage endpoint, defaults to Yandex Object Storage
- `PROXY_URL` - upstream proxy used by the formatter and source inspection path

## Deploy Helper Variables

- `YC_FUNCTION_ID` - target Yandex Cloud Function id for `workspace-bridge`
- `YC_SERVICE_ACCOUNT_ID` - service account id attached to new function versions
- `YC_DEPLOY_BUCKET` - Object Storage bucket used to upload the function package before deployment
- `YC_DEPLOY_OBJECT` - object key for the uploaded package, defaults to `deployments/clash-workspace-bridge-package-py.zip`
- `YC_GATEWAY_ID` - optional API gateway id to update after function deployment
- `YC_GATEWAY_SPEC` - optional local path to the gateway OpenAPI spec, defaults to `work/now/clash-site-public.openapi.yaml`

## Runtime Behavior Notes

- published YAML refresh uses the same serverless boundary and storage credentials as workspace persistence
- explicit publish refresh may fetch upstream provider subscriptions immediately in order to warm the served YAML cache

## Notes

- the browser only needs public Vite-prefixed values
- the cloud function needs storage credentials, `WORKSPACE_BUCKET`, and optional proxy settings
- the checked-in `.env` must still be treated as compromised material
