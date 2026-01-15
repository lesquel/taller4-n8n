# MesaYa - Taller 3: Integración MCP & Gemini AI

## 🎯 Descripción

Este taller integra **Model Context Protocol (MCP)** y **Google Gemini 2.0 Flash** al sistema de reservas MesaYa, permitiendo a los usuarios interactuar mediante lenguaje natural para buscar mesas y crear reservas.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Angular)                         │
│                    http://localhost:4200                           │
│                         Chat UI                                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GATEWAY (NestJS)                              │
│                    http://localhost:3000                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ TablesCtrl  │  │ ReservCtrl  │  │   AiModule  │ ◄── NUEVO      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         │         ┌──────┴──────┐   ┌─────┴─────┐                  │
│         │         │  RabbitMQ   │   │  Gemini   │                  │
│         │         │   Client    │   │  Service  │                  │
└─────────┼─────────┴──────┬──────┴───┴─────┬─────┴──────────────────┘
          │                │                │
          │                │                ▼
          │                │    ┌───────────────────────┐
          │                │    │    MCP SERVER         │
          │                │    │  http://localhost:3005│
          │                │    │  ┌─────────────────┐  │
          │                │    │  │ JSON-RPC 2.0    │  │
          │                │    │  │ Tools:          │  │
          │                │    │  │ - search_tables │  │
          │                │    │  │ - validate_avail│  │
          │                │    │  │ - create_reserv │  │
          │                │    │  └────────┬────────┘  │
          │                │    └───────────┼───────────┘
          │                │                │
          │                ▼                ▼
          │         ┌─────────────────────────────┐
          │         │        RabbitMQ             │
          │         └──────────┬──────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   ms-tables     │  │ ms-reservations │
│   (PostgreSQL)  │  │ (PostgreSQL +   │
│                 │  │  Redis Cache)   │
└─────────────────┘  └─────────────────┘
```

## 📁 Estructura de Nuevos Componentes

```
talleres/
├── mcp-server/                    # 🆕 Servidor MCP
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── routes/
│   │   │   └── mcp.router.ts     # JSON-RPC endpoint
│   │   ├── tools/
│   │   │   ├── definitions.ts    # Tool schemas
│   │   │   └── handlers.ts       # Tool implementations
│   │   ├── services/
│   │   │   └── gateway-client.ts # HTTP client for Gateway
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── gateway/src/ai/               # 🆕 Módulo AI en Gateway
│   ├── ai.module.ts
│   ├── ai.controller.ts
│   ├── services/
│   │   ├── gemini.service.ts     # Integración Gemini
│   │   └── mcp-client.service.ts # Cliente MCP JSON-RPC
│   └── dto/
│       └── chat.dto.ts
│
└── frontend/                      # 🆕 Frontend Angular
    ├── src/
    │   ├── app/
    │   │   ├── components/chat/  # Chat UI component
    │   │   └── services/         # Chat service
    │   └── environments/
    ├── angular.json
    └── Dockerfile
```

## 🚀 Quick Start

### 1. Configurar API Key de Gemini

Edita el archivo `.env` y reemplaza la clave de Gemini:

```bash
GEMINI_API_KEY=tu-api-key-de-google-ai-studio
```

> 📝 Obtén tu API Key gratis en: https://aistudio.google.com/app/apikey

### 2. Instalar Dependencias

```bash
# MCP Server
cd mcp-server
npm install

# Gateway (nuevas dependencias)
cd ../gateway
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Ejecutar con Docker Compose

```bash
# Desde la raíz del proyecto
docker-compose up --build
```

### 4. Ejecutar en Desarrollo (Script Automatizado)

Para facilitar el desarrollo, hemos creado un script que levanta toda la infraestructura y los microservicios en terminales separadas automáticamente.

**Opción A (Recomendada): Usar el script todo en uno**

Este script levanta RabbitMQ, Redis y Postgres con Docker, y abre 5 ventanas de terminal para los microservicios y el frontend.

```powershell
# Desde Powershell
.\scripts\start-dev-ai.ps1
```

**Opción B: Manualmente (Sin Script)**

Terminal 1 - Infraestructura:

```bash
docker-compose up rabbitmq redis postgres
```

Terminal 2 - Gateway:

```bash
cd gateway && npm run dev
```

Terminal 3 - MCP Server:

```bash
cd mcp-server && npm run dev
```

Terminal 4 - Frontend:

```bash
cd frontend && npm start
```

## 🔧 Endpoints

### Gateway (Puerto 3000)

| Método | Endpoint           | Descripción                     |
| ------ | ------------------ | ------------------------------- |
| POST   | `/api/chat`        | Enviar mensaje al asistente AI  |
| GET    | `/api/chat/status` | Estado del servicio AI          |
| GET    | `/api/chat/tools`  | Listar herramientas disponibles |

### MCP Server (Puerto 3005)

| Método | Endpoint      | Descripción           |
| ------ | ------------- | --------------------- |
| POST   | `/mcp`        | JSON-RPC 2.0 endpoint |
| GET    | `/mcp/tools`  | Listar tools (REST)   |
| GET    | `/mcp/health` | Health check          |

## 🛠️ Herramientas MCP Disponibles

### 1. `search_tables`

Busca mesas disponibles en el restaurante.

**Input:**

```json
{
  "capacidad": 4,
  "seccion": "terraza"
}
```

### 2. `validate_availability`

Verifica disponibilidad de una mesa para fecha/hora.

**Input:**

```json
{
  "tableId": "uuid-mesa",
  "fecha": "2026-01-10",
  "hora": "20:00"
}
```

### 3. `create_reservation`

Crea una nueva reserva (requiere JWT).

**Input:**

```json
{
  "tableId": "uuid-mesa",
  "restaurantId": "uuid-restaurante",
  "fecha": "2026-01-10",
  "hora": "20:00",
  "numberOfGuests": 4
}
```

## 💬 Ejemplos de Conversación

**Usuario:** "Quiero reservar una mesa para 4 personas mañana"

**Asistente:**

1. Ejecuta `search_tables` con capacidad=4
2. Muestra opciones disponibles
3. Pregunta preferencias de hora/sección

**Usuario:** "La mesa 5 a las 8pm"

**Asistente:**

1. Ejecuta `validate_availability`
2. Si está libre, ejecuta `create_reservation`
3. Confirma la reserva con detalles

## 🧪 Testing

### Test del MCP Server

```bash
curl -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Test del Chat API

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, ¿qué mesas tienen disponibles?"
  }'
```

## 📊 Puertos Finales

| Servicio        | Puerto     | URL                    |
| --------------- | ---------- | ---------------------- |
| Frontend        | 4200       | http://localhost:4200  |
| Gateway         | 3000       | http://localhost:3000  |
| MCP Server      | 3005       | http://localhost:3005  |
| ms-tables       | interno    | -                      |
| ms-reservations | interno    | -                      |
| RabbitMQ        | 5672/15672 | http://localhost:15672 |
| Redis           | 6379       | -                      |
| PostgreSQL      | 5433       | -                      |

## 🔐 Autenticación

Para crear reservas, el usuario debe estar autenticado. El Frontend debe:

1. Obtener JWT del servicio `mesa-ya-res` (puerto 3001)
2. Almacenar token en localStorage
3. Incluir header `Authorization: Bearer <token>` en las peticiones

## 📚 Recursos

- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [JSON-RPC 2.0 Spec](https://www.jsonrpc.org/specification)
