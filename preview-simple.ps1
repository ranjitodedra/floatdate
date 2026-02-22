# Simple preview command - replace YOUR_CRON_SECRET with your actual secret
$secret = "c7354e1dd20cb716af84a922e9767466fd482a3f49d230ad12ffca2edd652d6e"
$headers = @{ "Authorization" = "Bearer $secret" }
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/preview-match-email" -Headers $headers -OutFile "preview.html"
Start-Process "preview.html"
