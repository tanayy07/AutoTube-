# PowerShell script to set up Telegram webhook

$botToken = "8489678797:AAGig9MJS2Pl02R8RbL9aRNIr1HxafPUieY"

Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
Start-Process ngrok -ArgumentList "http 3000" -PassThru

Write-Host "`nWaiting for ngrok to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Get ngrok URL
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get
    $ngrokUrl = $ngrokApi.tunnels[0].public_url
    
    if ($ngrokUrl -notlike "https://*") {
        $ngrokUrl = $ngrokApi.tunnels[1].public_url
    }
    
    Write-Host "`nNgrok URL: $ngrokUrl" -ForegroundColor Green
    
    # Set webhook
    $webhookUrl = "$ngrokUrl/api/telegram/webhook"
    Write-Host "`nSetting webhook to: $webhookUrl" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method POST -Body (@{url=$webhookUrl} | ConvertTo-Json) -ContentType "application/json"
    
    if ($response.ok) {
        Write-Host "`nWebhook set successfully!" -ForegroundColor Green
        Write-Host "Your bot is now ready to receive messages." -ForegroundColor Green
    } else {
        Write-Host "`nFailed to set webhook: $($response.description)" -ForegroundColor Red
    }
    
    # Get webhook info
    $info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo" -Method Get
    Write-Host "`nWebhook Info:" -ForegroundColor Cyan
    Write-Host "URL: $($info.result.url)" -ForegroundColor White
    Write-Host "Pending updates: $($info.result.pending_update_count)" -ForegroundColor White
    
} catch {
    Write-Host "`nError: Could not get ngrok URL. Make sure ngrok is running." -ForegroundColor Red
    Write-Host "You can manually check ngrok at: http://localhost:4040" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
