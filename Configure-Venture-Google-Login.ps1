$ErrorActionPreference = "Stop"

$projectPath = Join-Path $env:USERPROFILE "Documents\Projects\venture-production-starter-v0.1"
$envPath = Join-Path $projectPath ".env.local"

if (-not (Test-Path $envPath)) {
    throw ".env.local was not found at: $envPath"
}

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $matchingLine = Get-Content -Path $envPath |
        Where-Object {
            $_ -match "^\s*$([regex]::Escape($Name))\s*="
        } |
        Select-Object -Last 1

    if (-not $matchingLine) {
        return ""
    }

    $equalsPosition = $matchingLine.IndexOf("=")

    if ($equalsPosition -lt 0) {
        return ""
    }

    $value = $matchingLine.Substring($equalsPosition + 1).Trim()

    if (
        $value.StartsWith('"') -and
        $value.EndsWith('"')
    ) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    return $value
}

$supabaseUrl = Get-DotEnvValue "NEXT_PUBLIC_SUPABASE_URL"

if (-not $supabaseUrl) {
    throw "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local."
}

try {
    $supabaseUri = [Uri]$supabaseUrl
}
catch {
    throw "NEXT_PUBLIC_SUPABASE_URL is not a valid URL."
}

$projectRef = $supabaseUri.Host.Split('.')[0]
$googleRedirectUri = "$($supabaseUrl.TrimEnd('/'))/auth/v1/callback"
$localOrigin = "http://localhost:3000"
$productionOrigin = "https://venture.boogiebangers.com"
$localCallback = "$localOrigin/auth/callback"
$productionCallback = "$productionOrigin/auth/callback"

$setupText = @"
VENTURE GOOGLE LOGIN SETUP

GOOGLE AUTH PLATFORM
Application type: Web application
Name: Venture Web Login

Authorized JavaScript origins:
$localOrigin
$productionOrigin

Authorized redirect URI:
$googleRedirectUri

SUPABASE URL CONFIGURATION
Site URL:
$productionOrigin

Additional redirect URLs:
$localCallback
$productionCallback

Do not place the Google Client Secret in .env.local.
Paste the Google Client ID and Client Secret only into:
Supabase > Authentication > Providers > Google
"@

Set-Clipboard -Value $setupText

Write-Host ""
Write-Host "Venture Google Login setup details are now on your clipboard." -ForegroundColor Green
Write-Host ""
Write-Host $setupText
Write-Host ""
Write-Host "Opening Google Auth Platform and Supabase configuration pages..." -ForegroundColor Cyan

Start-Process "https://console.cloud.google.com/auth/branding"
Start-Sleep -Milliseconds 350
Start-Process "https://console.cloud.google.com/auth/audience"
Start-Sleep -Milliseconds 350
Start-Process "https://console.cloud.google.com/auth/clients"
Start-Sleep -Milliseconds 350
Start-Process "https://supabase.com/dashboard/project/$projectRef/auth/providers"
Start-Sleep -Milliseconds 350
Start-Process "https://supabase.com/dashboard/project/$projectRef/auth/url-configuration"

Write-Host ""
Write-Host "Complete these steps:" -ForegroundColor Yellow
Write-Host "1. In Google Auth Platform, finish Branding and Audience."
Write-Host "2. While the app is in Testing, add your Gmail address as a test user."
Write-Host "3. Create a Web application OAuth client named Venture Web Login."
Write-Host "4. Paste the origins and redirect URI shown above."
Write-Host "5. Copy the Google Client ID and Client Secret."
Write-Host "6. In Supabase Providers, enable Google and paste both values."
Write-Host "7. In Supabase URL Configuration, add both callback URLs."
Write-Host "8. Save everything, restart Venture, and test /sign-in."
Write-Host ""
Write-Host "Google credentials stay in Google and Supabase. Venture needs no new local secret." -ForegroundColor DarkGray
