$ErrorActionPreference = "Stop"

$projectPath = Join-Path $env:USERPROFILE "Documents\Projects\venture-production-starter-v0.1"
$migrationPath = Join-Path $projectPath "supabase\migrations\20260805193000_create_private_profile_system.sql"
$envPath = Join-Path $projectPath ".env.local"

if (-not (Test-Path $migrationPath)) {
    throw "The Venture Profiles migration was not found at: $migrationPath"
}

$sql = Get-Content -Path $migrationPath -Raw
Set-Clipboard -Value $sql

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Test-Path $envPath)) {
        return ""
    }

    $line = Get-Content $envPath |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -Last 1

    if (-not $line) {
        return ""
    }

    $position = $line.IndexOf("=")

    if ($position -lt 0) {
        return ""
    }

    $value = $line.Substring($position + 1).Trim()

    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    return $value
}

$supabaseUrl = Get-DotEnvValue "NEXT_PUBLIC_SUPABASE_URL"
$dashboardUrl = "https://supabase.com/dashboard"

if ($supabaseUrl -match '^https://([a-zA-Z0-9-]+)\.supabase\.co') {
    $projectRef = $Matches[1]
    $dashboardUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
}

Write-Host ""
Write-Host "The Venture Profiles V1.0 SQL migration is now on your clipboard." -ForegroundColor Green
Write-Host ""
Write-Host "In the Supabase SQL editor:" -ForegroundColor Cyan
Write-Host "1. Paste with Ctrl + V"
Write-Host "2. Review the script"
Write-Host "3. Click Run"
Write-Host "4. Wait for Success before testing /profile"
Write-Host ""
Write-Host "Opening Supabase..." -ForegroundColor Cyan

Start-Process $dashboardUrl
