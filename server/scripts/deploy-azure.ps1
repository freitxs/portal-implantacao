#!/usr/bin/env pwsh

# Deploy do servidor para Azure App Service
# Uso: .\scripts\deploy-azure.ps1

param(
    [string]$ResourceGroup = "production-saas",
    [string]$AppServiceName = "portal-implantacao-backend",
    [string]$SourcePath = ".\publish.zip"
)

$ErrorActionPreference = "Stop"
$script:StartTime = Get-Date

function Write-Info {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    write-host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Get-ElapsedTime {
    $elapsed = (Get-Date) - $script:StartTime
    return $elapsed.ToString("mm\:ss")
}

try {
    Write-Info "Iniciando deploy para Azure App Service..."
    Write-Info "Recurso: $ResourceGroup / $AppServiceName"
    Write-Info ""

    # 1. Verificar Node.js
    Write-Info "Verificando Node.js..."
    $nodeVersion = node --version
    Write-Success "Node.js $nodeVersion"

    # 2. Build TypeScript
    Write-Info "Compilando TypeScript..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Build falhou!"
        exit 1
    }
    Write-Success "Build concluído"

    # 3. Limpar zip anterior
    Write-Info "Preparando artefato de deploy..."
    if (Test-Path $SourcePath) {
        Remove-Item $SourcePath -Force
    }

    # 4. Criar zip com arquivos essenciais
    $filesToZip = @(
        "package.json",
        "package-lock.json",
        "dist",
        "prisma",
        "scripts"
    )

    Write-Info ""
    Write-Info "⚠️  AVISO: .env local NÃO é incluído. Configure variáveis no Azure App Service."
    Write-Info "   Use: az webapp config appsettings set --resource-group ... --settings KEY=VALUE"
    Write-Info ""

    $missingFiles = @()
    foreach ($file in $filesToZip) {
        if (-not (Test-Path $file)) {
            $missingFiles += $file
        }
    }

    if ($missingFiles.Count -gt 0) {
        Write-Error-Custom "Arquivos faltando: $($missingFiles -join ', ')"
        exit 1
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $zipPath = Resolve-Path $SourcePath -ErrorAction SilentlyContinue
    if (-not $zipPath) {
        $zipPath = Join-Path (Get-Location) $SourcePath
    }

    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

    foreach ($file in $filesToZip) {
        $fullPath = Resolve-Path $file
        if ((Get-Item $fullPath).PSIsContainer) {
            # Diretório
            Get-ChildItem -Path $fullPath -Recurse | ForEach-Object {
                $relativePath = $_.FullName.Substring((Resolve-Path (Split-Path $fullPath)).Path.Length + 1)
                if (-not $_.PSIsContainer) {
                    $entry = $zip.CreateEntry($relativePath.Replace('\', '/'))
                    $stream = $entry.Open()
                    $fileStream = [System.IO.File]::OpenRead($_.FullName)
                    $fileStream.CopyTo($stream)
                    $stream.Close()
                    $fileStream.Close()
                }
            }
        } else {
            # Arquivo individual
            $entry = $zip.CreateEntry((Split-Path $fullPath -Leaf))
            $stream = $entry.Open()
            $fileStream = [System.IO.File]::OpenRead($fullPath)
            $fileStream.CopyTo($stream)
            $stream.Close()
            $fileStream.Close()
        }
    }
    $zip.Dispose()

    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Success "Arquivo criado: $SourcePath ($([math]::Round($zipSize, 2)) MB)"

    # 5. Deploy no Azure
    Write-Info ""
    Write-Info "Iniciando deploy no Azure..."
    Write-Info "Comando: az webapp deploy --resource-group $ResourceGroup --name $AppServiceName --src-path $SourcePath"
    Write-Info ""

    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src-path $SourcePath

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Deploy falhou no Azure!"
        exit 1
    }

    Write-Success "Deploy concluído com sucesso!"
    Write-Info ""
    Write-Info "App Service URL: https://$AppServiceName.azurewebsites.net"
    Write-Info "Health check: https://$AppServiceName.azurewebsites.net/health"
    Write-Info ""
    Write-Success "Tempo total: $(Get-ElapsedTime)"

} catch {
    Write-Error-Custom $_
    exit 1
}
