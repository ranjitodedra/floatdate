# Preview Match Email Script
# Usage: .\preview-email.ps1 [CRON_SECRET] [URL]

param(
    [string]$CronSecret = $env:CRON_SECRET,
    [string]$BaseUrl = "http://localhost:3000",
    [string]$RecipientName = "Alice",
    [string]$MatchName = "Bob",
    [string]$MatchEmail = "bob@example.com",
    [string]$MatchBio = "Coffee snob. Dog person. Reads too much sci-fi.",
    [string]$Explanation = "You were matched because of your aligned core values and shared interests.",
    [double]$Score = 0.87
)

if (-not $CronSecret) {
    Write-Host "Error: CRON_SECRET not provided. Set it as parameter or environment variable." -ForegroundColor Red
    Write-Host "Usage: .\preview-email.ps1 -CronSecret 'your-secret'" -ForegroundColor Yellow
    exit 1
}

# Build query string
$queryParams = @(
    "recipientName=$([System.Web.HttpUtility]::UrlEncode($RecipientName))",
    "matchName=$([System.Web.HttpUtility]::UrlEncode($MatchName))",
    "matchEmail=$([System.Web.HttpUtility]::UrlEncode($MatchEmail))",
    "matchBio=$([System.Web.HttpUtility]::UrlEncode($MatchBio))",
    "explanation=$([System.Web.HttpUtility]::UrlEncode($Explanation))",
    "score=$Score"
) -join "&"

$url = "$BaseUrl/api/admin/preview-match-email?$queryParams"
$headers = @{
    "Authorization" = "Bearer $CronSecret"
}

Write-Host "Fetching preview from: $url" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $url -Headers $headers -ErrorAction Stop
    $response.Content | Out-File -FilePath "preview.html" -Encoding UTF8
    Write-Host "Preview saved to preview.html" -ForegroundColor Green
    Start-Process "preview.html"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
