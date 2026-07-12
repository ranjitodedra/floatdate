# Sync private FloatDate tree -> public portfolio clone (fresh history, no private git ancestry).
#
# Usage:
#   .\scripts\sync-public.ps1                    # copy files + safety check
#   .\scripts\sync-public.ps1 -Commit            # also commit in public clone
#   .\scripts\sync-public.ps1 -Commit -Push      # commit and push to public origin
#   .\scripts\sync-public.ps1 -Initialize        # clone public repo if missing
#
# Environment overrides:
#   $env:FLOATDATE_PUBLIC_PATH  — default: ..\floatdate-public (sibling of private repo)
#   $env:FLOATDATE_PUBLIC_REMOTE — default: https://github.com/ranjitodedra/float-date.git

param(
    [switch]$Commit,
    [switch]$Push,
    [switch]$Initialize,
    [string]$PublicPath = $(if ($env:FLOATDATE_PUBLIC_PATH) { $env:FLOATDATE_PUBLIC_PATH } else { "" }),
    [string]$PublicRemote = $(if ($env:FLOATDATE_PUBLIC_REMOTE) { $env:FLOATDATE_PUBLIC_REMOTE } else { "https://github.com/ranjitodedra/float-date.git" }),
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$PrivateRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $PublicPath) {
    $PublicPath = Join-Path (Split-Path $PrivateRoot -Parent) "floatdate-public"
}
$PublicPath = [System.IO.Path]::GetFullPath($PublicPath)

$VerifyScript = Join-Path $PSScriptRoot "verify-public-safe.ps1"

Write-Host "Private repo: $PrivateRoot" -ForegroundColor Cyan
Write-Host "Public clone: $PublicPath" -ForegroundColor Cyan
Write-Host "Public remote: $PublicRemote" -ForegroundColor Cyan

# --- Initialize public clone if needed ---
if (-not (Test-Path (Join-Path $PublicPath ".git"))) {
    if (-not $Initialize) {
        Write-Host ""
        Write-Host "Public clone not found at: $PublicPath" -ForegroundColor Yellow
        Write-Host "Re-run with -Initialize to clone $PublicRemote" -ForegroundColor Yellow
        exit 1
    }
    $parent = Split-Path $PublicPath -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
    if (Test-Path $PublicPath) {
        Write-Host "Path exists but is not a git repo: $PublicPath" -ForegroundColor Red
        exit 1
    }
    Write-Host "Cloning public repo..." -ForegroundColor Green
    git clone $PublicRemote $PublicPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# --- Mirror files (never copy .git or local secrets) ---
$excludedDirs = @(".git", "node_modules", ".next", ".vercel", ".cursor", "out", "build", "coverage")
$excludedFiles = @(".env", ".env.local", ".env.production")

# robocopy /MIR with exclusions
$xd = ($excludedDirs | ForEach-Object { "/XD", $_ }) -join " "
$xf = ($excludedFiles | ForEach-Object { "/XF", $_ }) -join " "

Write-Host "Syncing files (robocopy /MIR)..." -ForegroundColor Green
$robocopyArgs = @(
    $PrivateRoot,
    $PublicPath,
    "/MIR",
    "/XD", ".git", "node_modules", ".next", ".vercel", ".cursor", "out", "build", "coverage",
    "/XF", ".env", ".env.local", ".env.production", "*.dump", "tsconfig.tsbuildinfo", "next-env.d.ts",
    "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np"
)
& robocopy @robocopyArgs | Out-Null
# robocopy exit codes 0-7 are success variants
if ($LASTEXITCODE -ge 8) {
    Write-Host "robocopy failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Remove internal-only docs from public tree (owner workflow / rotation notes)
foreach ($internalDoc in @("docs\RECRUITER_READY_REPORT.md", "docs\PUBLIC_REPO.md")) {
    $path = Join-Path $PublicPath $internalDoc
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Removed $internalDoc from public tree" -ForegroundColor DarkGray
    }
}

# Remove any stray .env* except .env.example
Get-ChildItem -Path $PublicPath -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -like ".env*" -and $_.Name -ne ".env.example" -and
        $_.FullName -notmatch '\\node_modules\\'
    } | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Removed stray env file: $($_.FullName)" -ForegroundColor Yellow
    }

# Remove generated files that should not be in the public repo
foreach ($generated in @("tsconfig.tsbuildinfo", "next-env.d.ts")) {
    $path = Join-Path $PublicPath $generated
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Removed $generated from public tree" -ForegroundColor DarkGray
    }
}

# --- Safety check ---
Write-Host "Running public safety check..." -ForegroundColor Green
& $VerifyScript -TargetPath $PublicPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $Commit -and -not $Push) {
    Write-Host ""
    Write-Host "Sync complete. Review changes in public clone:" -ForegroundColor Green
    Write-Host "  cd `"$PublicPath`"" -ForegroundColor White
    Write-Host "  git status" -ForegroundColor White
    Write-Host "Then run with -Commit or -Commit -Push when ready." -ForegroundColor White
    exit 0
}

Push-Location $PublicPath
try {
    $privateSha = git -C $PrivateRoot rev-parse --short HEAD 2>$null
    $date = Get-Date -Format "yyyy-MM-dd"
    $msg = if ($privateSha) { "Sync portfolio from private @$privateSha ($date)" } else { "Sync portfolio ($date)" }

    git add -A
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "No changes to commit in public repo." -ForegroundColor Yellow
        if ($Push) {
            git push origin $Branch
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
        exit 0
    }

    git commit -m $msg
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Committed in public repo: $msg" -ForegroundColor Green

    if ($Push) {
        Write-Host "Pushing to origin $Branch..." -ForegroundColor Green
        git push origin $Branch
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host "Public repo updated: $PublicRemote" -ForegroundColor Green
    }
} finally {
    Pop-Location
}
