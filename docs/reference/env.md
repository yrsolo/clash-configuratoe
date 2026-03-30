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

## Notes

- the browser only needs public Vite-prefixed values
- the cloud function needs storage credentials, `WORKSPACE_BUCKET`, and optional proxy settings
- the checked-in `.env` must still be treated as compromised material
