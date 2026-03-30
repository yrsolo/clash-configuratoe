# Environment Reference

## Required For Local Development

- `PUBLIC_APP_URL` - base application URL used to compose publish links
- `VITE_WORKSPACE_API_BASE` - same-origin workspace bridge route, defaults to `/api/workspace`
- `VITE_WORKSPACE_APP_SALT` - public salt used when deriving weak hash-based workspace keys in the browser

## Runtime Secret Variables

- `AWS_ACCESS_KEY_ID` - Object Storage access key for the serverless bridge
- `AWS_SECRET_ACCESS_KEY` - Object Storage secret key for the serverless bridge
- `WORKSPACE_BUCKET_NAME` - private object storage bucket for user workspaces
- `SESSION_SIGNING_SECRET` - reserved for future stronger session handling
- `BROWSER_AUTH_PROXY_SECRET` - reserved for future browser-auth proxy work

## Notes

- the browser only needs public Vite-prefixed values
- the cloud function needs storage credentials and bucket settings
- the checked-in `.env` must still be treated as compromised material
