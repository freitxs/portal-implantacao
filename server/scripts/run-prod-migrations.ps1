# Safe production migrations helper for Prisma + SQL Server
# Usage: run from PowerShell: pwsh -File .\server\scripts\run-prod-migrations.ps1

function Confirm-Or-Exit($msg) {
    $r = Read-Host "$msg (y/N)"
    if ($r -ne 'y' -and $r -ne 'Y') {
        Write-Host "Aborting." -ForegroundColor Yellow
        exit 1
    }
}

# Resolve server root from script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$serverRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $serverRoot

Write-Host "Server root: $serverRoot" -ForegroundColor Cyan

# Ensure user confirmed they have a backup
Confirm-Or-Exit "Você já fez backup do banco de produção?"

# Ask for DATABASE_URL if not set
if (-not $env:DATABASE_URL -or $env:DATABASE_URL -eq '') {
    $db = Read-Host "Cole a DATABASE_URL (sqlserver://... ; encrypt=true;trustServerCertificate=false)"
    if (-not $db) { Write-Host "No DATABASE_URL provided. Exiting." -ForegroundColor Red; exit 1 }
    $env:DATABASE_URL = $db
}

Write-Host "Usando DATABASE_URL: (hidden)" -ForegroundColor Green

# Show prisma migrate status
Write-Host "\n== prisma migrate status ==" -ForegroundColor Cyan
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) { Write-Host "npx not found in PATH. Install Node/npm or run with npx available." -ForegroundColor Red; exit 1 }

Write-Host "Executando: npx prisma migrate status --schema prisma/schema.sqlserver.prisma" -ForegroundColor DarkCyan
npm --silent run -s || $null
try {
    npx prisma migrate status --schema prisma/schema.sqlserver.prisma
} catch {
    Write-Host "prisma migrate status falhou: $_" -ForegroundColor Red
}

# List migrations and show first lines to help inspection
Write-Host "\n== Migrations disponíveis (preview dos SQL) ==" -ForegroundColor Cyan
$migs = Get-ChildItem -Path prisma/migrations -Directory -ErrorAction SilentlyContinue | Sort-Object Name
if (-not $migs) { Write-Host "Nenhuma pasta de migrations encontrada." -ForegroundColor Yellow }
foreach ($m in $migs) {
    $sqlPath = Join-Path $m.FullName "migration.sql"
    Write-Host "\n- $($m.Name):" -ForegroundColor Gray
    if (Test-Path $sqlPath) {
        Get-Content -Path $sqlPath -TotalCount 20 | ForEach-Object { Write-Host "    $_" }
    } else {
        Write-Host "    migration.sql não encontrado" -ForegroundColor Yellow
    }
}

# Offer to mark migrations as applied (resolve) without executing SQL
Write-Host "\nSe o banco já contém o schema equivalente às migrations, você pode marcar migrations como aplicadas (resolve) para evitar aplicar SQL)." -ForegroundColor Cyan
$doResolve = Read-Host "Deseja marcar migrations selecionadas como 'applied' sem executar? (y/N)"
if ($doResolve -eq 'y' -or $doResolve -eq 'Y') {
    Write-Host "Escolha nomes de migrations para marcar (separe por vírgula) ou 'all' para marcar todas:" -ForegroundColor Cyan
    $choice = Read-Host "Input"
    if ($choice -eq 'all') {
        foreach ($m in $migs) {
            Write-Host "Resolvendo: $($m.Name)" -ForegroundColor Green
            npx prisma migrate resolve --applied $m.Name --schema prisma/schema.sqlserver.prisma
        }
    } else {
        $names = $choice -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
        foreach ($n in $names) {
            if (Test-Path (Join-Path "prisma/migrations" $n)) {
                Write-Host "Resolvendo: $n" -ForegroundColor Green
                npx prisma migrate resolve --applied $n --schema prisma/schema.sqlserver.prisma
            } else {
                Write-Host "Migration $n não encontrada; pulando." -ForegroundColor Yellow
            }
        }
    }
    Write-Host "Rodando status novamente..." -ForegroundColor Cyan
    npx prisma migrate status --schema prisma/schema.sqlserver.prisma
    Write-Host "Concluído resolver." -ForegroundColor Green
    exit 0
}

# Otherwise ask to run migrations (deploy)
$apply = Read-Host "Deseja aplicar as migrations agora (npx prisma migrate deploy)? (y/N)"
if ($apply -eq 'y' -or $apply -eq 'Y') {
    Write-Host "Aplicando migrations — isso vai executar SQL no banco de produção." -ForegroundColor Yellow
    Confirm-Or-Exit "Confirma mais uma vez que fez backup e entende que vai aplicar alterações no DB?"
    try {
        # Use package script if present
        $pkg = Get-Content package.json -Raw | ConvertFrom-Json
        if ($pkg.scripts."prisma:prod") {
            Write-Host "Usando script npm run prisma:prod" -ForegroundColor Cyan
            npm run prisma:prod
        } else {
            Write-Host "Executando npx prisma migrate deploy" -ForegroundColor Cyan
            npx prisma migrate deploy --schema prisma/schema.sqlserver.prisma
        }
    } catch {
        Write-Host "Erro ao aplicar migrations: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host "Migrations aplicadas. Verificando status..." -ForegroundColor Green
    npx prisma migrate status --schema prisma/schema.sqlserver.prisma
    exit 0
}

Write-Host "Nenhuma ação tomada. Saindo." -ForegroundColor Yellow
exit 0
