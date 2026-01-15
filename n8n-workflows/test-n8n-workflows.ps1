# ===================================================================
# Script de Prueba para Workflows n8n - MesaYa Taller 4
# ===================================================================
# Ejecutar: .\test-n8n-workflows.ps1
# ===================================================================

param(
    [string]$N8nUrl = "http://localhost:5678",
    [switch]$All,
    [switch]$Notification,
    [switch]$Sheets,
    [switch]$Alerts
)

Write-Host "`nMesaYa - Test de Workflows n8n" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$timestamp = (Get-Date).ToString("o")
$correlationId = "corr_test_" + (Get-Random -Maximum 99999)

# Workflow 1: Notificacion Tiempo Real
function Test-NotificationWorkflow {
    Write-Host "`nProbando Workflow 1: Notificacion Tiempo Real..." -ForegroundColor Yellow
    
    $body = @{
        event = "reserva.creada"
        id = "evt_test_" + (Get-Random -Maximum 99999)
        timestamp = $timestamp
        data = @{
            reserva_id = "res-test-" + (Get-Random -Maximum 99999)
            usuario_nombre = "Juan Pérez Test"
            mesa_numero = 5
            num_personas = 4
            fecha_reserva = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            hora_reserva = "20:00"
            estado = "PENDING"
        }
        metadata = @{
            source = "powershell-test"
            correlation_id = $correlationId
            version = "1.0.0"
        }
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$N8nUrl/webhook/reserva-notificacion" `
            -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        
        Write-Host "[OK] Respuesta recibida:" -ForegroundColor Green
        $response | ConvertTo-Json | Write-Host
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
}

# Workflow 2: Sincronizacion Sheets
# ─────────────────────────────────────────────────────────────
function Test-SheetsWorkflow {
    Write-Host "`nProbando Workflow 2: Sincronizacion Sheets..." -ForegroundColor Yellow
    
    $body = @{
        event = "reserva.confirmada"
        id = "evt_sheets_" + (Get-Random -Maximum 99999)
        timestamp = $timestamp
        data = @{
            reserva_id = "res-sheets-" + (Get-Random -Maximum 99999)
            usuario_nombre = "María García Test"
            mesa_numero = 3
            num_personas = 2
            fecha_reserva = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
            hora_reserva = "19:30"
            estado = "CONFIRMED"
        }
        metadata = @{
            source = "powershell-test"
            correlation_id = $correlationId
            version = "1.0.0"
        }
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$N8nUrl/webhook/reserva-sheets-sync" `
            -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        
        Write-Host "[OK] Respuesta recibida:" -ForegroundColor Green
        $response | ConvertTo-Json | Write-Host
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Workflow 3: Alertas Inteligentes (ALTA urgencia - Telegram)
# ─────────────────────────────────────────────────────────────
function Test-AlertsWorkflow {
    Write-Host "`nProbando Workflow 3: Alertas Inteligentes (ALTA - Telegram)..." -ForegroundColor Yellow
    
    # Test con evento de alta urgencia (cancelación)
    $body = @{
        event = "reserva.cancelada"
        id = "evt_alert_" + (Get-Random -Maximum 99999)
        timestamp = $timestamp
        data = @{
            reserva_id = "res-alert-" + (Get-Random -Maximum 99999)
            usuario_nombre = "Carlos Lopez Test"
            mesa_numero = 7
            num_personas = 6
            fecha_reserva = (Get-Date).ToString("yyyy-MM-dd")
            hora_reserva = "21:00"
            motivo_cancelacion = "Emergencia familiar - Test"
            estado = "CANCELLED"
        }
        metadata = @{
            source = "powershell-test"
            correlation_id = $correlationId
            version = "1.0.0"
        }
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$N8nUrl/webhook/reserva-alertas" `
            -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        
        Write-Host "[OK] Respuesta recibida:" -ForegroundColor Green
        $response | ConvertTo-Json | Write-Host
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Workflow 3b: Alertas Inteligentes (MEDIA urgencia - Email)
# ─────────────────────────────────────────────────────────────
function Test-AlertsWorkflowMedia {
    Write-Host "`nProbando Workflow 3b: Alertas Inteligentes (MEDIA - Email)..." -ForegroundColor Yellow
    
    # Test con evento de urgencia media (modificación)
    $body = @{
        event = "reserva.modificada"
        id = "evt_alert_media_" + (Get-Random -Maximum 99999)
        timestamp = $timestamp
        data = @{
            reserva_id = "res-media-" + (Get-Random -Maximum 99999)
            usuario_nombre = "Ana Martinez Test"
            mesa_numero = 4
            num_personas = 3
            fecha_reserva = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            hora_reserva = "19:00"
            cambios = "Cambio de horario de 18:00 a 19:00"
            estado = "CONFIRMED"
        }
        metadata = @{
            source = "powershell-test"
            correlation_id = $correlationId
            version = "1.0.0"
        }
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$N8nUrl/webhook/reserva-alertas" `
            -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        
        Write-Host "[OK] Respuesta recibida:" -ForegroundColor Green
        $response | ConvertTo-Json | Write-Host
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Ejecutar tests segun parametros
# ─────────────────────────────────────────────────────────────

# Verificar que n8n este corriendo
Write-Host "`nVerificando conexion a n8n ($N8nUrl)..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-WebRequest -Uri "$N8nUrl/healthz" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] n8n esta corriendo" -ForegroundColor Green
}
catch {
    Write-Host "[WARN] n8n no responde en $N8nUrl" -ForegroundColor Red
    Write-Host "   Asegurate de que n8n este corriendo: docker-compose up -d n8n" -ForegroundColor Yellow
    exit 1
}

if ($All -or (-not $Notification -and -not $Sheets -and -not $Alerts)) {
    Test-NotificationWorkflow
    Start-Sleep -Seconds 2
    Test-SheetsWorkflow
    Start-Sleep -Seconds 2
    Test-AlertsWorkflowMedia
    Start-Sleep -Seconds 2
    Test-AlertsWorkflow
}
else {
    if ($Notification) { Test-NotificationWorkflow }
    if ($Sheets) { Test-SheetsWorkflow }
    if ($Alerts) { Test-AlertsWorkflow }
}

Write-Host "`n" -NoNewline; Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "Tests completados" -ForegroundColor Green
Write-Host "   Revisa los logs de n8n: docker-compose logs -f n8n" -ForegroundColor Cyan
Write-Host "   Revisa tu Telegram para las notificaciones (ALTA)" -ForegroundColor Cyan
Write-Host "   Revisa tu Email para las alertas (MEDIA)" -ForegroundColor Cyan
Write-Host "   Revisa tu Google Sheets para los registros" -ForegroundColor Cyan
