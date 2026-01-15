<div align="center">

# 🍽️ MesaYa - Sistema de Reservas con Microservicios

### **Taller 2: Webhooks Idempotentes con Notificaciones en Tiempo Real**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 🎬 Video Explicativo

<a href="https://drive.google.com/file/d/13eJHvdU_cRGLEXBBq3XsO3Myl29t0lTZ/view?usp=sharing">
  <img src="https://img.shields.io/badge/▶_VER_VIDEO_EXPLICATIVO-FF0000?style=for-the-badge&logo=googledrive&logoColor=white" alt="Ver Video" width="350"/>
</a>

> 📺 **Haz clic en el botón de arriba** para ver la demostración completa del sistema funcionando con notificaciones de Telegram en tiempo real.

---

</div>

## ✨ ¿Qué es MesaYa?

**MesaYa** es un sistema de gestión de reservas para restaurantes construido con arquitectura de **microservicios**. Este proyecto implementa el **Taller 2** de la materia Servidores Web, enfocándose en:

| Característica                 | Descripción                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| 🔄 **Webhooks Idempotentes**   | Sistema de notificaciones que garantiza entrega única (exactly-once)  |
| 📱 **Notificaciones Telegram** | Alertas en tiempo real cuando se crean, confirman o cancelan reservas |
| 🔐 **Firma HMAC-SHA256**       | Seguridad criptográfica para validar autenticidad de webhooks         |
| ⚡ **Cola de Reintentos**      | Bull/Redis para reintentar entregas fallidas con backoff exponencial  |
| 🏗️ **Supabase Edge Functions** | Funciones serverless para procesar webhooks                           |

---

## 📁 Estructura del Proyecto

```
mesaYa/
├── docker-compose.yml          # Orquestación de contenedores
├── .env.example                # Variables de entorno de ejemplo
├── scripts/
│   └── init-db.sh             # Script para crear las dos BDs
├── gateway/                    # API Gateway (Puerto 3000)
│   ├── src/
│   │   ├── auth/              # Módulo de autenticación JWT
│   │   ├── reservations/      # Proxy hacia ms-reservations
│   │   └── tables/            # Proxy hacia ms-tables
│   └── Dockerfile
├── ms-tables/                  # Microservicio de Mesas (Entidad Maestra)
│   ├── src/
│   │   └── tables/            # Lógica de mesas
│   └── Dockerfile
└── ms-reservations/            # Microservicio de Reservas (Entidad Transaccional)
    ├── src/
    │   ├── reservations/      # Lógica de reservas
    │   └── redis/             # Servicio de idempotencia
    └── Dockerfile
```

## 🚀 Inicio Rápido

### 1. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 2. Levantar infraestructura

```bash
docker-compose up -d rabbitmq redis postgres
```

### 3. Instalar dependencias de cada servicio

```bash
cd gateway && npm install && cd ..
cd ms-tables && npm install && cd ..
cd ms-reservations && npm install && cd ..
```

### 4. Iniciar servicios en desarrollo

Abre 3 terminales:

```bash
# Terminal 1 - Gateway
cd gateway && npm run dev

# Terminal 2 - ms-tables
cd ms-tables && npm run dev

# Terminal 3 - ms-reservations
cd ms-reservations && npm run dev
```

### 5. O levantar todo con Docker

```bash
docker-compose up --build
```

## 🔌 Puertos y URLs

| Servicio            | Puerto | URL                       |
| ------------------- | ------ | ------------------------- |
| Gateway API         | 3000   | http://localhost:3000     |
| RabbitMQ Management | 15672  | http://localhost:15672    |
| RabbitMQ AMQP       | 5672   | amqp://localhost:5672     |
| Redis               | 6379   | redis://localhost:6379    |
| PostgreSQL          | 5432   | postgres://localhost:5432 |

## 📚 API Endpoints

### Health Check

```
GET /api/v1/
```

### Reservaciones (requiere JWT)

```
POST /api/v1/reservations
GET  /api/v1/reservations
GET  /api/v1/reservations/:id
```

### Mesas (público)

```
GET /api/v1/tables
GET /api/v1/tables/:id
GET /api/v1/tables/section/:sectionId
```

## 🔐 Autenticación

El Gateway valida tokens JWT. Incluir en headers:

```
Authorization: Bearer <tu-token>
```

## 🛡️ Idempotencia

Cada reserva requiere un `idempotencyKey` único:

```json
{
  "idempotencyKey": "reservation-2024-12-09-user123-table456",
  "restaurantId": "uuid",
  "tableId": "uuid",
  "reservationDate": "2024-12-15",
  "reservationTime": "2024-12-15T19:00:00Z",
  "numberOfGuests": 4
}
```

Si envías la misma `idempotencyKey` dos veces, recibirás:

```json
{
  "statusCode": 409,
  "message": "Reservation with this idempotencyKey already exists",
  "idempotencyKey": "reservation-2024-12-09-user123-table456"
}
```

## 🗄️ Bases de Datos

| Base de Datos | Microservicio   | Descripción                      |
| ------------- | --------------- | -------------------------------- |
| db_mesas      | ms-tables       | Entidad maestra (mesas)          |
| db_reservas   | ms-reservations | Entidad transaccional (reservas) |

## 📨 Eventos RabbitMQ

| Evento           | Emisor          | Receptor  | Descripción             |
| ---------------- | --------------- | --------- | ----------------------- |
| `table.occupied` | ms-reservations | ms-tables | Marca mesa como ocupada |
| `table.released` | ms-reservations | ms-tables | Libera mesa             |

## 🧪 Prueba de Idempotencia

Script para probar que la idempotencia funciona:

```bash
# Enviar 5 requests paralelas con la misma idempotencyKey
# Solo 1 debe pasar, 4 deben fallar con 409
node gateway/tools/chaos-test.js
```

## 📊 Diagrama de Arquitectura

```
┌─────────────────┐
│     Cliente     │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP + JWT
         ▼
┌─────────────────┐
│   API Gateway   │ ◄── Valida JWT, extrae userId
│   (Puerto 3000) │
└────────┬────────┘
         │ RabbitMQ
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌─────────────┐
│  ms-  │ │    ms-      │
│tables │ │reservations │
└───┬───┘ └──────┬──────┘
    │            │
    ▼            ▼
┌───────┐ ┌─────────────┐
│db_mesa│ │ db_reservas │
│   s   │ └──────┬──────┘
└───────┘        │
                 ▼
            ┌────────┐
            │ Redis  │ ◄── Idempotency keys
            └────────┘
```

---

## 🔔 Taller 2: Sistema de Webhooks Idempotentes

### 📋 Flujo de Webhooks

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│   Reserva    │───▶│  Webhook Event  │───▶│  Bull Queue (Redis) │
│   Creada     │    │  + HMAC Sign    │    │  Con Reintentos     │
└──────────────┘    └─────────────────┘    └──────────┬──────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    ▼
    ┌───────────────────────────────────────────────────────────┐
    │                   Supabase Edge Functions                  │
    │  ┌─────────────────────┐    ┌─────────────────────────┐   │
    │  │  webhook-event-     │    │  webhook-external-      │   │
    │  │  logger             │    │  notifier               │   │
    │  │  (Guarda eventos)   │    │  (Envía a Telegram)     │   │
    │  └─────────────────────┘    └────────────┬────────────┘   │
    └──────────────────────────────────────────┼────────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │   📱 Telegram Bot   │
                                    │  @mesaya_notif_bot  │
                                    └─────────────────────┘
```

### 🛡️ Seguridad con HMAC-SHA256

Cada webhook incluye una firma criptográfica para garantizar autenticidad:

```javascript
// El publisher firma el payload
const signature = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest("hex");

// Header enviado: X-Webhook-Signature: sha256=abc123...
```

### 📱 Notificaciones en Telegram

El sistema envía notificaciones automáticas a Telegram para:

| Evento                     | Mensaje                           |
| -------------------------- | --------------------------------- |
| 🍽️ `reservation.created`   | Nueva reserva creada con detalles |
| ✅ `reservation.confirmed` | Reserva confirmada                |
| ❌ `reservation.cancelled` | Reserva cancelada                 |
| 🔴 `table.occupied`        | Mesa ocupada                      |
| 🟢 `table.released`        | Mesa liberada                     |

### 🔄 Reintentos con Backoff Exponencial

Si un webhook falla, se reintenta automáticamente:

| Intento | Delay                        |
| ------- | ---------------------------- |
| 1       | 1 segundo                    |
| 2       | 2 segundos                   |
| 3       | 4 segundos                   |
| 4       | 8 segundos                   |
| 5       | 16 segundos (último intento) |

---

## 🧪 Scripts de Prueba

### Prueba Rápida

```powershell
cd scripts
.\quick-test.ps1
```

### Suite Completa de Pruebas

```powershell
cd scripts
.\test-webhooks.ps1           # Todas las pruebas
.\test-webhooks.ps1 -Test create      # Solo crear reserva
.\test-webhooks.ps1 -Test confirm     # Solo confirmar
.\test-webhooks.ps1 -Test cancel      # Solo cancelar
.\test-webhooks.ps1 -Test idempotency # Probar idempotencia
.\test-webhooks.ps1 -Test direct      # Webhook directo a Supabase
```


<div align="center">

### ⭐ Si te gustó este proyecto, ¡dale una estrella!

**Hecho con ❤️ usando NestJS, RabbitMQ, Supabase y Telegram**

</div>





.\n8n-workflows\test-n8n-workflows.ps1