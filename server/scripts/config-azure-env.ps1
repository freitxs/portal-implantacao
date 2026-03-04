#!/usr/bin/env pwsh

# Configurar variáveis de ambiente no Azure App Service a partir do arquivo .env local
# Uso: .\scripts\config-azure-env.ps1

param(
    [string]$ResourceGroup = "production-saas",
    [string]$AppServiceName = "portal-implantacao-backend",
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Parse-EnvFile {
    param([string]$FilePath)
    
    $env_vars = @{}
    
    if (-not (Test-Path $FilePath)) {
        Write-Error-Custom "Arquivo $FilePath não encontrado!"
        exit 1
    }
    
    Get-Content $FilePath | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object {
        $line = $_
        if ($line -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove aspas se existirem
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $env_vars[$key] = $value
        }
    }
    
    return $env_vars
}

try {
    Write-Info "Lendo variáveis de $EnvFile..."
    $envVars = Parse-EnvFile $EnvFile
    
    if ($envVars.Count -eq 0) {
        Write-Error-Custom "Nenhuma variável encontrada em $EnvFile"
        exit 1
    }
    
    Write-Success "Encontradas $($envVars.Count) variáveis"
    Write-Info ""
    Write-Info "Variáveis que serão configuradas:"
    $envVars.Keys | ForEach-Object {
        $value = $envVars[$_]
        # Mask sensitive values
        if ($_ -match "SECRET|PASSWORD|URL" -and $value.Length -gt 20) {
            $masked = $value.Substring(0, 10) + "***" + $value.Substring($value.Length - 10)
            Write-Host "  • $($_): $masked"
        } else {
            Write-Host "  • $($_): $value"
        }
    }
    Write-Info ""
    
    $confirm = Read-Host "Deseja prosseguir com a configuração? (s/n)"
    if ($confirm -ne "s") {
        Write-Info "Operação cancelada."
        exit 0
    }
    
    Write-Info ""
    Write-Info "Configurando variáveis no Azure App Service..."
    
    # Montar comando az webapp config appsettings set
    $settings = @()
    $envVars.Keys | ForEach-Object {
        $settings += "$_=$($envVars[$_])"
    }
    
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --settings $settings
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Falha ao configurar variáveis no Azure!"
        exit 1
    }
    
    Write-Success "Variáveis configuradas com sucesso!"
    Write-Info ""
    Write-Info "App Service está sendo reiniciado..."
    Write-Info "Aguarde 30-60 segundos para a aplicação estar online."
    Write-Info ""
    Write-Info "URL: https://$AppServiceName.azurewebsites.net"
    Write-Info "Health check: https://$AppServiceName.azurewebsites.net/health"
    
} catch {
    Write-Error-Custom $_
    exit 1
}
