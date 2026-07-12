# Pre-commit safety check for the public portfolio repo.
# Exits 1 if any blocked files or suspicious content are found.
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
)

$ErrorActionPreference = "Stop"
$resolved = Resolve-Path $TargetPath
$issues = @()

# --- Blocked file patterns (user data / secrets) ---
$blockedPatterns = @(
    ".env",
    ".env.local",
    ".env.production",
    "*.dump",
    "*.pem"
)

foreach ($pattern in $blockedPatterns) {
    $hits = Get-ChildItem -Path $resolved -Recurse -Force -Filter $pattern -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' }
    foreach ($hit in $hits) {
        $issues += "Blocked file: $($hit.FullName)"
    }
}

# .env variants (any .env* except .env.example)
$envFiles = Get-ChildItem -Path $resolved -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -like ".env*" -and
        $_.Name -ne ".env.example" -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\.git\\'
    }
foreach ($f in $envFiles) {
    $issues += "Blocked env file: $($f.FullName)"
}

# Backup-like filenames
$backupHits = Get-ChildItem -Path $resolved -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        ($_.Extension -eq ".dump" -or $_.Name -match 'backup') -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\.git\\'
    }
foreach ($f in $backupHits) {
    $issues += "Possible backup file: $($f.FullName)"
}

# --- Suspicious content in tracked-boundary files (text scan) ---
$textFiles = Get-ChildItem -Path $resolved -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Extension -match '^\.(md|ts|tsx|js|json|ps1|sql|example|mjs)$' -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\.git\\' -and
        $_.FullName -notmatch '\\docs\\archive\\'
    }

$hexSecretPattern = '[0-9a-f]{64}'
foreach ($file in $textFiles) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        if ($content -match "JWT_SECRET=\s*$hexSecretPattern" -or $content -match "CRON_SECRET=\s*$hexSecretPattern") {
            $issues += "Possible committed secret in: $($file.FullName)"
        }
    } catch {
        # Skip binary or unreadable files
    }
}

if ($issues.Count -gt 0) {
    Write-Host "PUBLIC SAFETY CHECK FAILED" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "Public safety check passed: $resolved" -ForegroundColor Green
exit 0
