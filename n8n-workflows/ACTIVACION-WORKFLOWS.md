# 🚀 Guía de Configuración de n8n para Taller 4

## Estado Actual

✅ **URLs de webhooks actualizadas** en la base de datos:

- `n8n-notificacion-inteligente` → `http://n8n:5678/webhook/reservation-created`
- `n8n-auditoria-sheets` → `http://n8n:5678/webhook/audit-events`
- `n8n-alertas-criticas` → `http://n8n:5678/webhook/reservation-cancelled`

✅ **Archivos JSON de workflows creados** en `n8n-workflows/`

❌ **Pendiente**: Importar y **ACTIVAR** los workflows en n8n

---

## 📋 Pasos para Activar Workflows

### 1. Acceder a n8n

- Abrir: **http://localhost:5678**
- Login: **admin / admin**

### 2. Importar Workflows (en este orden)

Para cada workflow:

1. Click en **"+ Add Workflow"** (esquina superior izquierda)
2. Click en los **tres puntos (...)** → **"Import from File"**
3. Seleccionar el archivo JSON correspondiente
4. **IMPORTANTE**: Hacer click en el **toggle de activación** (esquina superior derecha)

#### Workflow 1: Notificación de Reservas

- Archivo: `01-notificacion-simple.json`
- Webhook path: `/webhook/reservation-created`
- Usa: Gemini AI para generar mensajes
- Nodo IF para filtrar solo `reservation.created`

#### Workflow 2: Auditoría de Eventos

- Archivo: `02-auditoria-switch.json`
- Webhook path: `/webhook/audit-events`
- Usa: **Switch node** con 4 ramas:
  - Nueva Reserva
  - Cancelación
  - Confirmación
  - Otro Evento

#### Workflow 3: Alertas por Urgencia

- Archivo: `03-alertas-urgencia.json`
- Webhook path: `/webhook/reservation-cancelled`
- Usa: **Switch node** con 4 niveles de urgencia:
  - ALTA (Grupo Grande ≥8 personas)
  - ALTA (Mismo día)
  - MEDIA (5-7 personas o ≤3 días)
  - BAJA (resto)
- Gemini AI genera mensajes para urgencia alta

### 3. Verificar Activación

Después de importar, cada workflow debe mostrar:

- Toggle **verde/activo** en la esquina superior derecha
- Badge "Active" visible

---

## 🧪 Probar los Webhooks

### Test 1: Notificación de Reserva Nueva

```powershell
$body = @{
    event_type = "reservation.created"
    payload = @{
        id = "test-123"
        reservationDate = "2026-01-20"
        reservationTime = "19:00:00"
        numberOfGuests = 4
        tableId = "mesa-1"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:5678/webhook/reservation-created" -Method POST -ContentType "application/json" -Body $body
```

### Test 2: Auditoría con Switch

```powershell
$body = @{
    event_type = "reservation.cancelled"
    payload = @{
        id = "audit-456"
        reservationDate = "2026-01-20"
        numberOfGuests = 6
        notes = "Cliente enfermo"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:5678/webhook/audit-events" -Method POST -ContentType "application/json" -Body $body
```

### Test 3: Alerta de Urgencia Alta (grupo grande)

```powershell
$body = @{
    event_type = "reservation.cancelled"
    payload = @{
        id = "vip-789"
        reservationDate = "2026-01-14"
        numberOfGuests = 10
        notes = "Grupo corporativo"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:5678/webhook/reservation-cancelled" -Method POST -ContentType "application/json" -Body $body
```

---

## 🔄 Crear Nueva Reserva (Flujo Completo)

Una vez activados los workflows, crear una reserva disparará automáticamente los webhooks:

```powershell
$token = "demo-token-para-pruebas"
$body = @{
    tableId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    restaurantId = "550e8400-e29b-41d4-a716-446655440000"
    reservationDate = "2026-01-25"
    reservationTime = "2026-01-25T20:00:00Z"
    numberOfGuests = 6
    notes = "Cena de cumpleaños"
    idempotencyKey = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/reservations" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $body
```

---

## 📊 Arquitectura del Taller 4

```
┌─────────────────┐
│    Frontend     │
│   Angular 17    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│    Gateway      │─────► Gemini AI
│   NestJS API    │
└────────┬────────┘
         │ RabbitMQ
         ▼
┌─────────────────┐      ┌─────────────────┐
│ ms-reservations │─────►│   PostgreSQL    │
│   (Webhooks)    │      └─────────────────┘
└────────┬────────┘
         │ HTTP Webhooks
         ▼
┌─────────────────────────────────────────────────────┐
│                        n8n                          │
├─────────────────┬──────────────┬───────────────────┤
│  /webhook/      │  /webhook/   │  /webhook/        │
│  reservation-   │  audit-      │  reservation-     │
│  created        │  events      │  cancelled        │
├─────────────────┼──────────────┼───────────────────┤
│   IF Node       │ SWITCH Node  │  SWITCH Node      │
│   ↓             │ 4 ramas      │  4 niveles        │
│   Gemini AI     │              │  urgencia         │
│   ↓             │              │  ↓                │
│   Respuesta     │              │  Gemini AI        │
└─────────────────┴──────────────┴───────────────────┘
```

## ❗ Troubleshooting

### Error 404 en webhooks

- **Causa**: Workflow no está activado
- **Solución**: Ir al workflow en n8n y activar el toggle

### "Unable to sign without access token"

- **Causa**: Google Sheets requiere OAuth
- **Solución**: Usar workflows sin Google Sheets (los proporcionados) o configurar OAuth

### Webhooks llegan a n8n cloud

- **Causa**: URLs incorrectas en DB
- **Solución**: Ya corregido - URLs apuntan a `http://n8n:5678/...`
