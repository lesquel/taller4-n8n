# ═══════════════════════════════════════════════════════════════════════════════

# TALLER 4: Integración de Herramientas de Automatización (n8n) con MesaYa

# ═══════════════════════════════════════════════════════════════════════════════

## 📋 Resumen

Este documento describe la integración de **n8n** como plataforma de automatización
de workflows event-driven para el sistema MesaYa. n8n actúa como suscriptor de
webhooks junto con las Edge Functions de Supabase existentes.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MesaYa Architecture                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐                │
│  │ Frontend│───▶│   Gateway    │───▶│ ms-reservations │                │
│  │ Angular │    │  (NestJS)    │    │    (NestJS)     │                │
│  └─────────┘    └──────────────┘    └────────┬────────┘                │
│                                              │                          │
│                                              │ Webhook Events           │
│                                              ▼                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    webhook_subscriptions                          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │ │
│  │  │ Supabase Edge   │  │ n8n Workflow 1  │  │ n8n Workflow 2   │   │ │
│  │  │ Functions       │  │ (Notificación)  │  │ (Auditoría)      │   │ │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘   │ │
│  │           │                    │                    │             │ │
│  └───────────┼────────────────────┼────────────────────┼─────────────┘ │
│              │                    │                    │               │
│              ▼                    ▼                    ▼               │
│  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐     │
│  │    Telegram       │  │   Telegram +    │  │  Google Sheets   │     │
│  │    (Legacy)       │  │   Gemini AI     │  │                  │     │
│  └───────────────────┘  └─────────────────┘  └──────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Inicio Rápido

### 1. Levantar la infraestructura

```powershell
# Levantar todos los servicios incluyendo n8n
docker-compose up -d

# Verificar que n8n está corriendo
docker logs mesaya-n8n
```

### 2. Acceder a n8n

- **URL:** http://localhost:5678
- **Usuario:** admin
- **Contraseña:** admin (definido en `.env` como `N8N_PASSWORD`)

### 3. Registrar suscripciones webhook

```powershell
# Conectar a PostgreSQL y ejecutar el script
docker exec -i mesaya-postgres psql -U mesaya -d db_reservas < scripts/seed-n8n-webhooks.sql
```

### 4. Importar workflows en n8n

1. Ir a n8n UI → Click en "..." → **Import from File**
2. Seleccionar los archivos de `n8n-workflows/`:
   - `01-notificacion-inteligente.json`
   - `02-auditoria-sheets.json`
   - `03-alertas-criticas.json`

### 5. Configurar credenciales

En n8n, ir a **Settings → Credentials** y crear:

| Credencial            | Tipo                          | Valores              |
| --------------------- | ----------------------------- | -------------------- |
| Gemini API Key        | HTTP Query Auth               | `key` = tu API key   |
| MesaYa Telegram Bot   | Telegram API                  | Bot token del `.env` |
| Google Sheets Account | Google OAuth2/Service Account | JSON de credenciales |

### 6. Activar workflows

Para cada workflow importado, click en el toggle **Active** para habilitarlo.

---

## 📂 Estructura de Archivos

```
taller4-n8n/
├── docker-compose.yml          # ← n8n agregado
├── scripts/
│   └── seed-n8n-webhooks.sql   # SQL para registrar suscripciones
├── n8n-workflows/
│   ├── README.md
│   ├── 01-notificacion-inteligente.json
│   ├── 02-auditoria-sheets.json
│   ├── 03-alertas-criticas.json
│   └── helpers/
│       └── hmac-validation.js  # Código de referencia HMAC
└── TALLER4_N8N.md              # Este documento
```

---

## 🔧 Workflows Implementados

### Workflow 1: Notificación Inteligente

**Trigger:** `reservation.created`

```
[Webhook] → [Validar HMAC] → [Gemini AI] → [Telegram]
```

- Recibe evento de nueva reserva
- Valida firma HMAC-SHA256
- Llama a Gemini para generar mensaje personalizado
- Envía notificación a Telegram

### Workflow 2: Auditoría Google Sheets

**Trigger:** Todos los eventos (`reservation.*`, `table.*`)

```
[Webhook] → [Validar HMAC] → [Google Sheets Append]
```

- Recibe cualquier evento webhook
- Registra en Google Sheets con columnas:
  - Fecha, Hora, Tipo Evento, ID Reserva, Mesa, Personas, Estado

### Workflow 3: Alertas Críticas

**Trigger:** `reservation.cancelled`

```
[Webhook] → [Validar HMAC] → [IF numberOfGuests > 6]
                                    ├── TRUE → [Telegram Alert Admin]
                                    └── FALSE → [Log Only]
```

- Detecta cancelaciones de mesas grandes (>6 personas)
- Envía alerta urgente al administrador por Telegram
- Cancelaciones normales solo se registran en log

---

## 🔐 Seguridad

### Validación HMAC

Todos los workflows validan la firma HMAC del webhook:

```javascript
const crypto = require("crypto");

const SECRET = $env.WEBHOOK_SECRET || "mesaya_webhook_secret_2024";
const signature = $input.first().headers["x-webhook-signature"];
const payload = JSON.stringify($input.first().body);

const expectedSignature =
  "sha256=" + crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

if (signature !== expectedSignature) {
  throw new Error("❌ Firma HMAC inválida");
}
```

### Idempotencia

El header `X-Idempotency-Key` se pasa en cada webhook para evitar procesamiento duplicado.

---

## ⚙️ Variables de Entorno

Agregar a tu `.env`:

```bash
# n8n Authentication
N8N_USER=admin
N8N_PASSWORD=admin

# Credenciales para workflows
TELEGRAM_BOT_TOKEN=tu-bot-token
TELEGRAM_CHAT_ID=tu-chat-id
GEMINI_API_KEY=tu-gemini-key
WEBHOOK_SECRET=mesaya_webhook_secret_2024

# Google Sheets (opcional)
GOOGLE_SHEET_ID=tu-sheet-id
```

---

## 🧪 Testing

### Probar webhook manualmente

```bash
# Generar firma HMAC
node n8n-workflows/helpers/hmac-validation.js

# Enviar webhook de prueba (desde host)
curl -X POST http://localhost:5678/webhook/reservation-created \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=TU_FIRMA_AQUI" \
  -d '{
    "event_type": "reservation.created",
    "data": {
      "id": 999,
      "tableId": 5,
      "numberOfGuests": 4,
      "customerName": "Test User"
    }
  }'
```

### Ver logs en n8n

1. Ir a **Executions** en la barra lateral
2. Filtrar por workflow específico
3. Click en ejecución para ver detalle paso a paso

---

## 🔗 Endpoints de Webhooks

| Webhook Path                     | Evento                  | Workflow                 |
| -------------------------------- | ----------------------- | ------------------------ |
| `/webhook/reservation-created`   | `reservation.created`   | Notificación Inteligente |
| `/webhook/audit-events`          | `*`                     | Auditoría Sheets         |
| `/webhook/reservation-cancelled` | `reservation.cancelled` | Alertas Críticas         |

**URL Base Docker:** `http://n8n:5678`
**URL Base Host:** `http://localhost:5678`

---

## 📚 Referencias

- [n8n Documentation](https://docs.n8n.io/)
- [Gemini API Reference](https://ai.google.dev/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## ✅ Checklist de Implementación

- [x] Agregar servicio n8n a docker-compose.yml
- [x] Crear script SQL para suscripciones webhook
- [x] Crear workflow de notificación inteligente (Gemini + Telegram)
- [x] Crear workflow de auditoría (Google Sheets)
- [x] Crear workflow de alertas críticas (condicional)
- [x] Documentar validación HMAC
- [ ] Configurar credenciales en n8n UI
- [ ] Probar flujo end-to-end
- [ ] Exportar workflows finales

---

_Última actualización: Enero 2026 - Taller 4 Servidores Web_
