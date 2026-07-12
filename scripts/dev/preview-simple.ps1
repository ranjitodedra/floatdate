# Simple match-email preview — requires CRON_SECRET in environment
# Usage: $env:CRON_SECRET = "your-secret"; .\scripts\dev\preview-simple.ps1

if (-not $env:CRON_SECRET) {
    Write-Host "Error: Set CRON_SECRET environment variable first." -ForegroundColor Red
    exit 1
}

$headers = @{ "Authorization" = "Bearer $env:CRON_SECRET" }
$outFile = Join-Path $PSScriptRoot "preview.html"
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/preview-match-email" -Headers $headers -OutFile $outFile
Start-Process $outFile
