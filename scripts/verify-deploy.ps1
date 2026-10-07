$ErrorActionPreference = 'Stop'
$global:handoverMockCalls = @()
function yc {
  $global:LASTEXITCODE = 0
  $global:handoverMockCalls += ,@($args)
  if ($args[0] -eq 'serverless' -and $args[1] -eq 'function') {
    '{"id":"mock-version","environment":{"AWS_SECRET_ACCESS_KEY":"fixture-secret-only"}}'
  }
}
if ((Get-Command yc).CommandType -ne 'Function') { throw 'CLI mock was not installed' }
$env:YC_FUNCTION_ID='function-test-id'
$env:YC_SERVICE_ACCOUNT_ID='runtime-test-id'
$env:YC_DEPLOY_BUCKET='package-test-bucket'
$env:WORKSPACE_BUCKET='workspace-test-bucket'
$env:YC_GATEWAY_ID='gateway-test-id'
$env:YC_GATEWAY_SPEC='deploy/yandex/gateway.verify.local.yaml'
$env:AWS_ACCESS_KEY_ID='fixture-key-only'
$env:AWS_SECRET_ACCESS_KEY='fixture-secret-only'
$env:PROXY_URL=''
$env:PUBLIC_APP_URL='https://app.example'
'openapi: 3.0.0' | Set-Content -LiteralPath deploy/yandex/gateway.verify.local.yaml
try {
  $captured = & ./scripts/deploy-workspace-bridge.ps1 6>&1
  if (($captured | Out-String).Contains('fixture-secret-only')) { throw 'Version environment leaked to deploy output' }
  if ($global:handoverMockCalls.Count -ne 3) { throw 'Unexpected function deploy command count' }
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path (Get-Location) 'artifacts/tmp/workspace-bridge.zip'))
  try {
    $names = @($zip.Entries | ForEach-Object FullName)
    if ($names.Count -ne 4 -or 'bin/sing-box' -notin $names -or 'index.js' -notin $names) { throw 'ZIP runtime manifest mismatch' }
  } finally { $zip.Dispose() }
  $global:handoverMockCalls=@()
  $env:YC_GATEWAY_ID=''
  $failed=$false
  try { & ./scripts/deploy-workspace-bridge.ps1 } catch { $failed=$true }
  if (-not $failed -or $global:handoverMockCalls.Count -ne 0) { throw 'Missing gateway did not fail before CLI calls' }
  $env:YC_FRONTEND_BUCKET='frontend-test-bucket'
  & ./scripts/deploy-frontend.ps1 6>&1 | Out-Null
  $calls=$global:handoverMockCalls
  if ($calls.Count -lt 3 -or ($calls[-1] -join ' ') -notmatch 'index.html.*no-cache') { throw 'Entrypoint was not uploaded last' }
  if (($calls | Where-Object { ($_ -join ' ') -match '\.js.*--content-type application/javascript' }).Count -lt 1) { throw 'JavaScript MIME missing' }
  if (($calls | Where-Object { ($_ -join ' ') -match '\.css.*--content-type text/css' }).Count -lt 1) { throw 'CSS MIME missing' }
  Write-Host 'Mocked deploy verified: function version output redacted, four runtime ZIP entries, gateway preflight, asset MIME and entrypoint ordering. No real CLI calls.'
} finally { Remove-Item -LiteralPath deploy/yandex/gateway.verify.local.yaml -ErrorAction SilentlyContinue }
