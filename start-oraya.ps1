param([switch]$Restart)
$ErrorActionPreference = "Stop"
$orayaRoot = $PSScriptRoot
$backendRoot = Join-Path $orayaRoot "backend"
$frontendRoot = Join-Path $orayaRoot "frontend"
$logs = Join-Path $backendRoot "storage\runtime"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$env:PATH = "$orayaRoot\.tools\bin\ffmpeg;$env:PATH"

$backendListener = Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue
if ($backendListener -and $Restart) {
    $server = Get-CimInstance Win32_Process -Filter "ProcessId=$($backendListener.OwningProcess)"
    if ($server.CommandLine -notmatch [regex]::Escape("$backendRoot\.venv\Scripts\python.exe") -or $server.CommandLine -notmatch 'uvicorn app.main:app') {
        throw "Port 8000 belongs to another process; it was left running."
    }
    Stop-Process -Id $backendListener.OwningProcess
    $backendListener = $null
}
if (-not $backendListener) {
    Start-Process -FilePath "$backendRoot\.venv\Scripts\python.exe" `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $backendRoot -WindowStyle Hidden `
        -RedirectStandardOutput "$logs\backend-out.log" -RedirectStandardError "$logs\backend-error.log" | Out-Null
}

# Keep the existing frontend session intact until the backend can accept auth checks.
$backendReady = $false
for ($attempt = 0; $attempt -lt 25; $attempt++) {
    try {
        $metadata = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/meta" -TimeoutSec 2
        if ($metadata.app -eq "ORAYA") { $backendReady = $true; break }
    } catch { Start-Sleep -Milliseconds 200 }
}
if (-not $backendReady) { throw "ORAYA's backend is not ready. See $logs\backend-error.log; the frontend was left running." }

$frontendListener = Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue
if ($frontendListener -and $Restart) {
    $viteServer = Get-CimInstance Win32_Process -Filter "ProcessId=$($frontendListener.OwningProcess)"
    if ($viteServer.CommandLine -notmatch [regex]::Escape($frontendRoot) -or $viteServer.CommandLine -notmatch 'vite') {
        throw "Port 5173 belongs to another process; it was left running."
    }
    Stop-Process -Id $frontendListener.OwningProcess
    $frontendListener = $null
}
if (-not $frontendListener) {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $viteEntry = Join-Path $frontendRoot "node_modules\vite\bin\vite.js"
    Start-Process -FilePath $nodePath `
        -ArgumentList @("`"$viteEntry`"", "--host", "127.0.0.1", "--port", "5173", "--strictPort") `
        -WorkingDirectory $frontendRoot -WindowStyle Hidden `
        -RedirectStandardOutput "$logs\frontend-out.log" -RedirectStandardError "$logs\frontend-error.log" | Out-Null
}
Write-Output "ORAYA: http://127.0.0.1:5173"
Write-Output "Backend health: http://127.0.0.1:8000/api/v1/health"
Write-Output "Servers run in the background. Logs: $logs"
