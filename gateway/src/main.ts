import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import fetch from "node-fetch";

// Patch global fetch to use node-fetch instead of undici (Node 18+ native fetch)
// This fixes "TypeError: fetch failed" issues with Google Generative AI in some environments
if (!global.fetch) {
  (global as any).fetch = fetch;
  (global as any).Headers = (fetch as any).Headers;
  (global as any).Request = (fetch as any).Request;
  (global as any).Response = (fetch as any).Response;
} else {
  // Override even if it exists
  (global as any).fetch = fetch;
  (global as any).Headers = (fetch as any).Headers;
  (global as any).Request = (fetch as any).Request;
  (global as any).Response = (fetch as any).Response;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global de la API
  app.setGlobalPrefix("api/v1");

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:4200"],
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("🍽️ MesaYa API Gateway")
    .setDescription(
      `
# API de Reservas de Restaurante MesaYa

Sistema de reservas inteligente con integración de IA (Gemini) y automatización de workflows (n8n).

## 🚀 Inicio Rápido

### 1. Obtener Token de Autenticación
Usa el endpoint \`POST /api/v1/auth/login\` con:
\`\`\`json
{
  "email": "demo@mesaya.com",
  "password": "demo"
}
\`\`\`

### 2. Autorizar Swagger
1. Copia el \`accessToken\` de la respuesta
2. Click en el botón **Authorize** 🔒 (arriba a la derecha)
3. Pega el token en el campo y confirma

### 3. Usar Endpoints Protegidos
Ahora puedes crear reservas y usar todos los endpoints.

---

## 📚 Módulos Disponibles

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Authentication** | Login, registro y tokens |
| 🪑 **Tables** | Gestión de mesas |
| 🍽️ **Reservations** | Crear y gestionar reservas |
| 🤖 **AI Chat** | Asistente IA con Gemini |

## 🔧 Arquitectura

- **Gateway**: NestJS (este servicio)
- **Microservicios**: ms-tables, ms-reservations
- **Mensajería**: RabbitMQ
- **Base de Datos**: PostgreSQL
- **Cache**: Redis (idempotencia)
- **IA**: Google Gemini 2.0 Flash
- **Automatización**: n8n Cloud

## 📧 Webhooks (n8n)

Cuando se crea una reserva, se disparan webhooks automáticos a:
- 🤖 Notificación con mensaje generado por IA
- 📊 Auditoría en Google Sheets
- ⚠️ Alertas para cancelaciones críticas
    `
    )
    .setVersion("1.0.0")
    .setContact("MesaYa Team", "https://mesaya.com", "soporte@mesaya.com")
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description: "Ingresa tu token JWT",
        in: "header",
      },
      "access-token"
    )
    .addTag("❤️ Health", "Estado del servicio")
    .addTag("🔐 Authentication", "Login, registro y tokens JWT")
    .addTag("🪑 Tables", "Gestión de mesas del restaurante")
    .addTag("🍽️ Reservations", "Crear y gestionar reservas")
    .addTag("🤖 AI Chat", "Asistente de IA con Gemini")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "MesaYa API Docs",
    customfavIcon: "https://swagger.io/favicon-32x32.png",
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5em }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.GATEWAY_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Gateway running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
