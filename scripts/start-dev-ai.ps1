Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   MesaYa - Iniciando Entorno de Desarrollo AI (Taller 3)" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script iniciará todos los componentes necesarios para el sistema." -ForegroundColor Yellow
Write-Host "Asegúrate de tener Docker corriendo para la infraestructura base." -ForegroundColor Yellow
Write-Host ""

# 1. Iniciar Infraestructura (Docker)
Write-Host "[1/6] Verificando infraestructura Docker..." -ForegroundColor Green
try {
    Write-Host "   Iniciando RabbitMQ, Redis y PostgreSQL..." -ForegroundColor Gray
    docker-compose up -d rabbitmq redis postgres
} catch {
    Write-Error "Error: $_"
    exit 1
}

$root = Resolve-Path "$PSScriptRoot/.."
Write-Host "   Directorio raíz: $root" -ForegroundColor Gray
Write-Host ""

# Función helper para iniciar procesos
function Start-ServiceWindow {
    param (
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [string]$Color = "Cyan"
    )
    Write-Host "[$Name] Iniciando en nueva ventana..." -ForegroundColor $Color
    
    # Construir argumentos para Start-Process
    # Usamos -Command para ejecutar una serie de comandos en la nueva ventana
    # 1. Write-Host para titulo, 2. cd para cambiar dir, 3. comando real
    $innerCommand = "Write-Host '$Name' -ForegroundColor $Color; cd '$Path'; $Command"
    
    $processParams = @{
        FilePath = "powershell"
        ArgumentList = "-NoExit", "-Command", $innerCommand
        WindowStyle = "Normal"
    }
    Start-Process @processParams
}

# 2. Iniciar MS-Tables
Write-Host "[2/6] Iniciando Microservicio Tables..." -ForegroundColor Green
Start-ServiceWindow -Name "MS-Tables" -Path "$root/ms-tables" -Command "npm run dev" -Color "Blue"

# 3. Iniciar MS-Reservations
Write-Host "[3/6] Iniciando Microservicio Reservations..." -ForegroundColor Green
Start-ServiceWindow -Name "MS-Reservations" -Path "$root/ms-reservations" -Command "npm run dev" -Color "Magenta"

# Esperar un momento para que los microservicios inicialicen
Write-Host "   Esperando 5 segundos para inicialización de microservicios..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 4. Iniciar Gateway
Write-Host "[4/6] Iniciando API Gateway..." -ForegroundColor Green
Start-ServiceWindow -Name "Gateway" -Path "$root/gateway" -Command "npm run dev" -Color "Yellow"

# 5. Iniciar MCP Server
Write-Host "[5/6] Iniciando MCP Server..." -ForegroundColor Green
Start-ServiceWindow -Name "MCP Server" -Path "$root/mcp-server" -Command "npm run dev" -Color "Cyan"

# 6. Iniciar Frontend
Write-Host "[6/6] Iniciando Frontend Angular..." -ForegroundColor Green
Start-ServiceWindow -Name "Frontend" -Path "$root/frontend" -Command "npm start" -Color "Red"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   ✅ Todo listo!" -ForegroundColor Green
Write-Host "   - Frontend: http://localhost:4200" -ForegroundColor Gray
Write-Host "   - Gateway:  http://localhost:3000" -ForegroundColor Gray
Write-Host "   - MCP:      http://localhost:3005" -ForegroundColor Gray
Write-Host "===================================================================" -ForegroundColor Cyan
