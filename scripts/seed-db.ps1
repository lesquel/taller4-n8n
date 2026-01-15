Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   MesaYa - Seed de Base de Datos" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$root = Resolve-Path "$PSScriptRoot/.."

# Verificar que PostgreSQL este corriendo
Write-Host "[1/2] Verificando PostgreSQL..." -ForegroundColor Green
$pgContainer = docker ps --filter "name=mesaya-postgres" --format "{{.Names}}"
if (-not $pgContainer) {
    Write-Host "   PostgreSQL no esta corriendo. Iniciando..." -ForegroundColor Yellow
    docker compose up -d postgres
    Start-Sleep -Seconds 5
}
Write-Host "   OK PostgreSQL corriendo" -ForegroundColor Green

# Ejecutar seed de mesas
Write-Host ""
Write-Host "[2/2] Ejecutando seed de mesas..." -ForegroundColor Green
Set-Location "$root/ms-tables"
npx ts-node src/seed.ts

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   Seed completado!" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
