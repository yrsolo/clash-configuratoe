# Release Flow

## Default

1. Update relevant docs.
2. Run `npm run docs-check`.
3. Run targeted checks or `npm run release-check` for larger stages.
4. Update [work/now/evidence.md](/n:/PROJECTS/service/clash-configuratoe/work/now/evidence.md).
5. Remove obvious temporary deploy artifacts before finishing a pause or release pass.
6. Deploy frontend or serverless artifacts if the task requires it.

## Serverless Bridge Deploy

For `serverless/workspace-bridge`, prefer the scripted path instead of ad-hoc `yc` commands:

1. Ensure the required environment variables are loaded:
   - `YC_FUNCTION_ID`
   - `YC_SERVICE_ACCOUNT_ID`
   - `YC_DEPLOY_BUCKET`
   - `WORKSPACE_BUCKET`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `PROXY_URL`
   - optional `YC_GATEWAY_ID`
   - optional `YC_GATEWAY_SPEC`
2. Run `npm run deploy:workspace-bridge`.
3. Use the script output plus a live smoke check to confirm the new `$latest` version and gateway update.

Why this path exists:

- direct `yc serverless function version create --source-path ...` fails once the package is over the 3.5 MB limit
- the script always uploads the zip to Object Storage first, then deploys from the package bucket
- the same script also updates the API gateway spec so new routes are not forgotten
- the generated local package zip is temporary and should not remain checked into the repository
