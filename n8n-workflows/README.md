# 📦 Workflows n8n para MesaYa - Taller 4

Esta carpeta contiene los workflows exportados de n8n para el sistema de automatización MesaYa según las especificaciones del Taller 4 ULEAM.

## 🏗️ Arquitectura Event-Driven

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│   MCP Server    │────▶│ ms-reservations │
│   (Port 3000)   │     │   (Port 3005)   │     │   (RabbitMQ)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         │ HTTP POST (Webhooks)
                                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                         n8n (Port 5678)                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ 01-Notificación  │ │ 02-Sheets Sync   │ │ 03-Alertas       │   │
│  │   (Telegram)     │ │ (Google Sheets)  │ │  Inteligentes    │   │
│  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘   │
└───────────┼────────────────────┼────────────────────┼──────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
      ┌──────────┐        ┌──────────┐    ┌──────────────────────┐
      │ Telegram │        │ Google   │    │ Telegram (Alta)      │
      │   Bot    │        │ Sheets   │    │ Gmail (Media)        │
      └──────────┘        └──────────┘    │ Log (Baja)           │
                                          └──────────────────────┘
```

## 📁 Estructura de Archivos

```
n8n-workflows/
├── README.md                              # Esta documentación
├── workflows/
│   ├── 01-notificacion-tiempo-real.json   # Workflow 1: Telegram + Gemini
│   ├── 02-sincronizacion-sheets.json      # Workflow 2: Google Sheets
│   └── 03-alertas-inteligentes.json       # Workflow 3: Alertas por urgencia
└── helpers/
    └── hmac-validation.js                 # Helper para validación HMAC
```

## 🚀 Inicio Rápido

### 1. Levantar n8n con Docker

```bash
# Desde la raíz del proyecto
docker-compose up -d n8n

# Verificar que esté corriendo
docker-compose logs -f n8n
```

### 2. Acceder a n8n

- **URL**: http://localhost:5678
- **Usuario**: admin
- **Contraseña**: admin

### 3. Importar Workflows

1. Ve a **Workflows** → **Import from File**
2. Importa cada archivo JSON de `workflows/`
3. Activa cada workflow con el toggle

## 📋 Workflows Disponibles

| Archivo                            | Descripción                                      | Webhook Path                    |
| ---------------------------------- | ------------------------------------------------ | ------------------------------- |
| `01-notificacion-tiempo-real.json` | Genera mensaje con Gemini y envía Telegram       | `/webhook/reserva-notificacion` |
| `02-sincronizacion-sheets.json`    | Registra eventos en Google Sheets                | `/webhook/reserva-sheets-sync`  |
| `03-alertas-inteligentes.json`     | Alertas con Switch de urgencia (Alta/Media/Baja) | `/webhook/reserva-alertas`      |

## 🔀 Flujo de Nodos por Workflow

### Workflow 01 - Notificación Tiempo Real

```
Webhook → IF (Validar) → Set (Transformar) → Gemini AI → Combinar → Telegram → Respuesta
```

**Payload esperado:**

```json
{
  "event": "reserva.creada",
  "id": "evt_123456",
  "timestamp": "2026-01-13T10:30:00.000Z",
  "data": {
    "reserva_id": "res-uuid-here",
    "usuario_nombre": "Juan Pérez",
    "mesa_numero": 5,
    "num_personas": 4,
    "fecha_reserva": "2026-01-15",
    "hora_reserva": "19:00",
    "estado": "PENDING"
  },
  "metadata": {
    "source": "ms-reservations",
    "correlation_id": "corr_123456"
  }
}
```

### Workflow 02 - Sincronización Sheets

```
Webhook → Estructurar Datos → Google Sheets (Append/Update) → Respuesta
```

**Columnas en Google Sheets:**
| Columna | Descripción |
|---------|-------------|
| Fecha/Hora | Timestamp del evento |
| Tipo Evento | reserva.creada, reserva.confirmada, etc. |
| ID Reserva | UUID de la reserva |
| Cliente | Nombre del usuario |
| Mesa | Número de mesa |
| Personas | Número de comensales |
| Estado | PENDING, CONFIRMED, CANCELLED |

### Workflow 03 - Alertas Inteligentes

```
Webhook → Clasificar Urgencia → Gemini (Analizar) → Switch (Urgencia)
                                                         ├── ALTA → Telegram
                                                         ├── MEDIA → Gmail
                                                         └── BAJA → Log
```

**Lógica de Urgencia:**
| Urgencia | Eventos | Acción |
|----------|---------|--------|
| **ALTA** | `reserva.cancelada`, `checkin.no_show` | Telegram inmediato |
| **MEDIA** | `reserva.modificada` | Email al administrador |
| **BAJA** | Otros eventos | Solo registro en log |

## 🔐 Credenciales Requeridas

Antes de activar los workflows, configura estas credenciales en n8n:

### 1. Gemini API Key (HTTP Query Auth)

1. Ve a **Settings** → **Credentials** → **Add Credential**
2. Selecciona **HTTP Query Auth**
3. Nombre: `Gemini API Key`
4. Parámetros:
   - Name: `key`
   - Value: Tu API Key de Gemini

### 2. Telegram Bot

1. Crea un bot con [@BotFather](https://t.me/BotFather)
2. En n8n: **Settings** → **Credentials** → **Telegram API**
3. Access Token: Tu token del bot

### 3. Google Sheets OAuth2

1. Crea credenciales OAuth2 en [Google Cloud Console](https://console.cloud.google.com/)
2. En n8n: **Settings** → **Credentials** → **Google Sheets OAuth2**
3. Autoriza con tu cuenta de Google

## 🧪 Testing

Para probar los webhooks manualmente:

```bash
# Probar Workflow 1 - Notificación
curl -X POST http://localhost:5678/webhook/reserva-notificacion \
  -H "Content-Type: application/json" \
  -d '{
    "event": "reserva.creada",
    "id": "evt_test_001",
    "timestamp": "2026-01-13T10:30:00.000Z",
    "data": {
      "reserva_id": "res-test-123",
      "usuario_nombre": "María García",
      "mesa_numero": 3,
      "num_personas": 2,
      "fecha_reserva": "2026-01-15",
      "hora_reserva": "20:00",
      "estado": "PENDING"
    },
    "metadata": {
      "source": "test",
      "correlation_id": "corr_test_001"
    }
  }'

# Probar Workflow 3 - Alerta (cancelación = urgencia ALTA)
curl -X POST http://localhost:5678/webhook/reserva-alertas \
  -H "Content-Type: application/json" \
  -d '{
    "event": "reserva.cancelada",
    "id": "evt_test_003",
    "timestamp": "2026-01-13T11:30:00.000Z",
    "data": {
      "reserva_id": "res-test-123",
      "usuario_nombre": "María García",
      "mesa_numero": 3,
      "motivo_cancelacion": "Cambio de planes",
      "estado": "CANCELLED"
    },
    "metadata": {
      "source": "test",
      "correlation_id": "corr_test_003"
    }
  }'
```

## 📊 Flujo End-to-End

1. **Usuario solicita**: "Quiero reservar una mesa para 4 personas mañana a las 8pm"
2. **API Gateway + Gemini**: Decide ejecutar `buscar_mesa_disponible`, `crear_reserva`
3. **MCP Server**: Ejecuta los Tools vía JSON-RPC
4. **ms-reservations**: Guarda reserva + emite webhook a n8n
5. **n8n Workflow 1**: Genera mensaje con IA → Envía a Telegram
6. **n8n Workflow 2**: Registra en Google Sheets
7. **Respuesta al usuario**: "¡Reserva confirmada! Mesa 5, mañana 20:00"

## 📝 Variables de Entorno

El archivo `.env` debe contener:

```dotenv
# n8n Configuration
N8N_WEBHOOK_URL=http://n8n:5678
N8N_ENABLED=true
N8N_USER=admin
N8N_PASSWORD=admin

# Google Sheets
GOOGLE_SHEETS_ID=tu-sheet-id-aqui

# Telegram Bot
TELEGRAM_BOT_TOKEN=tu-token-del-bot
TELEGRAM_CHAT_ID=tu-chat-id

# Gemini API
GEMINI_API_KEY=tu-api-key-de-gemini

# Admin Email (para alertas media)
ADMIN_EMAIL=admin@mesaya.com
```

## 📚 Referencias

- [Documentación oficial n8n](https://docs.n8n.io)
- [Templates de workflows](https://n8n.io/workflows)
- [Crear bot de Telegram](https://core.telegram.org/bots#creating-a-new-bot)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Gemini AI Studio](https://aistudio.google.com)

---

> "n8n extiende tu sistema sin invadirlo. El Backend hace lo suyo, n8n automatiza las consecuencias."
