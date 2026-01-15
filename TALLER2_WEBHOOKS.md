# 🔗 Taller 2: Webhooks Idempotentes (Supabase + NestJS)

## 📋 Resumen

Este taller implementa la conexión entre el "mundo interno" (Microservicios NestJS) y el "mundo externo" (Supabase/Telegram) mediante **Webhooks Idempotentes**.

### Estrategia: Idempotent Consumer (Opción B)

La idempotencia se implementa en el **consumidor** (Supabase Edge Functions) usando la tabla `processed_webhooks` en PostgreSQL.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        NestJS (Publisher)                        │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐ │
│  │ Reservation │───▶│   Webhook    │───▶│    Bull Queue       │ │
│  │   Service   │    │   Listener   │    │ (webhook-outbox)    │ │
│  └─────────────┘    └──────────────┘    └──────────┬──────────┘ │
│                                                     │            │
│                     ┌──────────────┐                │            │
│                     │   Webhook    │◀───────────────┘            │
│                     │   Service    │                             │
│                     │ (HMAC Sign)  │                             │
│                     └──────┬───────┘                             │
└────────────────────────────│────────────────────────────────────┘
                             │ HTTP POST
                             │ X-Webhook-Signature: sha256=...
                             │ X-Idempotency-Key: reservation:123:created
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (Consumer)                          │
│  ┌────────────────────────┐    ┌─────────────────────────────┐  │
│  │  webhook-event-logger  │    │ webhook-external-notifier   │  │
│  │                        │    │                             │  │
│  │  1. Verify HMAC        │    │  1. Verify HMAC             │  │
│  │  2. Check idempotency  │    │  2. Check idempotency       │  │
│  │  3. Save to DB         │    │  3. Send to Telegram        │  │
│  └───────────┬────────────┘    └──────────────┬──────────────┘  │
│              │                                 │                 │
│              ▼                                 ▼                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     PostgreSQL                              │ │
│  │  • webhook_events       • processed_webhooks (idempotencia)│ │
│  │  • webhook_deliveries   • webhook_subscriptions            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Telegram     │
                    │   Bot API       │
                    └─────────────────┘
```

---

## 📁 Estructura de Archivos

```
mesaYa/
├── scripts/
│   ├── init-db.sh              # ← Actualizado con tablas de webhook
│   ├── webhook-test.sh         # ← Script de prueba (Bash)
│   └── webhook-test.ps1        # ← Script de prueba (PowerShell)
│
├── supabase/
│   ├── config.toml             # Configuración del proyecto
│   ├── .env.example            # Variables de entorno
│   └── functions/
│       ├── webhook-event-logger/
│       │   └── index.ts        # Logger + Idempotencia
│       └── webhook-external-notifier/
│           └── index.ts        # Telegram + Idempotencia
│
└── ms-reservations/
    └── src/
        ├── app.module.ts       # ← Integra BullModule y WebhookModule
        ├── reservations/
        │   ├── reservations.service.ts  # ← Dispara webhooks
        │   └── reservations.module.ts   # ← Importa WebhookModule
        └── webhook/
            ├── index.ts
            ├── webhook.module.ts
            ├── webhook.service.ts      # HMAC signing + HTTP dispatch
            ├── webhook.processor.ts    # Bull queue processor
            ├── webhook.listener.ts     # Domain event handler
            ├── dto/
            │   └── webhook.dto.ts
            └── entities/
                ├── index.ts
                ├── webhook-subscription.entity.ts
                ├── webhook-event.entity.ts
                └── webhook-delivery.entity.ts
```

---

## 🚀 Setup

### 1. Base de Datos (PostgreSQL)

Las tablas se crean automáticamente con Docker:

```bash
# Recrear volúmenes y ejecutar init-db.sh
docker-compose down -v
docker-compose up -d postgres
```

O ejecutar manualmente el SQL en `scripts/init-db.sh`.

### 2. Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Inicializar proyecto (si es nuevo)
cd supabase
supabase init

# Crear las tablas en Supabase (copiar SQL de init-db.sh)
# Dashboard → SQL Editor → Ejecutar

# Configurar secrets
supabase secrets set WEBHOOK_SECRET=your-webhook-secret-change-me
supabase secrets set TELEGRAM_BOT_TOKEN=your-bot-token
supabase secrets set TELEGRAM_CHAT_ID=your-chat-id

# Deploy Edge Functions
supabase functions deploy webhook-event-logger
supabase functions deploy webhook-external-notifier
```

### 3. Telegram Bot

1. Habla con [@BotFather](https://t.me/BotFather) en Telegram
2. Crea un bot: `/newbot`
3. Guarda el token: `123456:ABC-DEF...`
4. Obtén tu Chat ID:
   - Envía un mensaje a tu bot
   - Visita `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Busca `"chat":{"id":...}`

### 4. ms-reservations

```bash
cd ms-reservations
npm install   # Instala @nestjs/bull, bull, axios
npm run dev
```

### 5. Actualizar URLs

En `webhook_subscriptions` (tabla en PostgreSQL), actualiza las URLs:

```sql
UPDATE webhook_subscriptions
SET target_url = 'https://TU_PROYECTO.supabase.co/functions/v1/webhook-event-logger',
    secret = 'tu-secreto-real'
WHERE name = 'Supabase Event Logger';

UPDATE webhook_subscriptions
SET target_url = 'https://TU_PROYECTO.supabase.co/functions/v1/webhook-external-notifier',
    secret = 'tu-secreto-real'
WHERE name = 'Supabase Telegram Notifier';
```

---

## 🧪 Pruebas

### PowerShell (Windows)

```powershell
cd scripts
.\webhook-test.ps1 -WebhookSecret "tu-secreto" -SupabaseFunctionUrl "https://tu-proyecto.supabase.co/functions/v1"
```

### Bash (Linux/Mac/WSL)

```bash
cd scripts
chmod +x webhook-test.sh
WEBHOOK_SECRET="tu-secreto" SUPABASE_FUNCTION_URL="https://tu-proyecto.supabase.co/functions/v1" ./webhook-test.sh
```

### Prueba Manual con cURL

```bash
# Generar firma HMAC
PAYLOAD='{"event_type":"reservation.created","idempotency_key":"test-123","timestamp":"2025-12-15T10:00:00Z","data":{"reservation_id":"res-001"}}'
SECRET="your-webhook-secret"
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

# Enviar webhook
curl -X POST "https://tu-proyecto.supabase.co/functions/v1/webhook-event-logger" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -H "X-Idempotency-Key: test-123" \
  -d "$PAYLOAD"
```

---

## ✅ Checklist de Demostración

### Happy Path

- [ ] Crear reserva via Gateway
- [ ] ms-reservations guarda en DB + emite a RabbitMQ
- [ ] WebhookListener captura evento
- [ ] WebhookService firma y encola
- [ ] Bull processor envía HTTP a Supabase
- [ ] Edge Function valida HMAC
- [ ] Edge Function guarda en `webhook_events`
- [ ] Edge Function envía a Telegram
- [ ] Recibo notificación en Telegram 📱

### Prueba de Idempotencia

- [ ] Enviar el **mismo** webhook 3 veces (mismo `idempotency_key`)
- [ ] Primera vez: procesado (`duplicate: false`)
- [ ] Segunda vez: detectado como duplicado (`duplicate: true`)
- [ ] Tercera vez: detectado como duplicado (`duplicate: true`)
- [ ] Solo **1 mensaje** en Telegram
- [ ] Solo **1 fila** en `processed_webhooks`

### Prueba de Resiliencia (Retry)

- [ ] Simular error 500 en Edge Function
- [ ] Bull reintenta con exponential backoff
- [ ] Ver logs de reintentos en ms-reservations
- [ ] Después de 5 intentos fallidos: `status = 'failed'` en `webhook_deliveries`

---

## 🔐 Seguridad

### HMAC-SHA256

```typescript
// Publisher (NestJS)
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
// Header: X-Webhook-Signature: sha256=abc123...

// Consumer (Supabase/Deno)
const key = await crypto.subtle.importKey(...);
const hash = await crypto.subtle.sign('HMAC', key, payload);
// Comparación segura contra timing attacks
```

### Idempotency Key

Formato: `{entity}:{id}:{event}`

- `reservation:550e8400-e29b-41d4-a716:created`
- `table:123:occupied:reservation-456`

---

## 📊 Monitoreo

### Ver estado de deliveries

```sql
SELECT
    status,
    COUNT(*) as count
FROM webhook_deliveries
GROUP BY status;
```

### Ver webhooks procesados

```sql
SELECT * FROM processed_webhooks
ORDER BY processed_at DESC
LIMIT 10;
```

### Bull Queue Dashboard (opcional)

```bash
npm install -g bull-board
# O usa el endpoint /admin/queues si lo configuras
```

---

## 🎓 Conceptos Clave del Taller

1. **Webhook**: HTTP callback que notifica eventos a sistemas externos
2. **HMAC**: Firma criptográfica para verificar autenticidad e integridad
3. **Idempotencia**: Procesar el mismo mensaje múltiples veces produce el mismo resultado
4. **Exponential Backoff**: Reintentos con delays crecientes (1s, 2s, 4s, 8s, 16s)
5. **Dead Letter Queue**: Mensajes que fallaron todos los reintentos
6. **Edge Function**: Código serverless que corre cerca del usuario

---

## 🐛 Troubleshooting

| Problema                 | Solución                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| `Invalid signature`      | Verificar que el secreto sea idéntico en NestJS y Supabase              |
| `Connection refused`     | Verificar que Redis esté corriendo (`docker-compose up redis`)          |
| No llega Telegram        | Verificar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en Supabase secrets |
| Duplicados no detectados | Verificar que `idempotency_key` sea único por evento                    |
| Bull no procesa          | Verificar conexión a Redis y que el processor esté registrado           |

---

## 📚 Referencias

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [NestJS Bull Queue](https://docs.nestjs.com/techniques/queues)
- [HMAC Webhooks](https://webhook.site/docs/hmac-validation)
- [Idempotent Consumer Pattern](https://microservices.io/patterns/communication-style/idempotent-consumer.html)
