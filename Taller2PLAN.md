Plan: Taller 2 — Webhooks Idempotentes (Supabase + NestJS)
TL;DR: Conectar los microservicios con Supabase mediante webhooks idempotentes. Crear tablas en PostgreSQL, dos Edge Functions en Supabase (logger + notifier), y un WebhookModule en ms-reservations que firma, publica vía HTTP y reintenta con Bull. La idempotencia se aplica en el consumidor (Supabase) con processed_webhooks.

Steps
Actualizar esquema DB: añadir tablas webhook_subscriptions, webhook_events, webhook_deliveries, processed_webhooks. Modificar o añadir script: init-db.sh.
Crear funciones Supabase (Edge Functions, Deno/TS): webhook-event-logger (validar HMAC, chequear/insertar processed_webhooks, guardar en webhook_events) y webhook-external-notifier (validar HMAC, enviar a Telegram). Archivos propuestos: supabase/functions/webhook-event-logger/index.ts y supabase/functions/webhook-external-notifier/index.ts.
Añadir WebhookModule en ms-reservations: crear webhook.service.ts (firmar payload con HMAC y enviar con @nestjs/axios), webhook.listener.ts (escuchar eventos de dominio), y webhook.module.ts. Archivos: ms-reservations/src/webhook/webhook.service.ts, ms-reservations/src/webhook/webhook.listener.ts.
Cola de reintentos (Bull/BullMQ): crear cola webhook-outbox con retry/exponential backoff y dead-letter handling. Archivo propuesto: ms-reservations/src/webhook/webhook.queue.ts.
Idempotencia y contrato: publicar siempre idempotency_key (ej. reservation:{id}:created) en el payload; Supabase hace SELECT id FROM processed_webhooks WHERE idempotency_key = ? antes de procesar y retorna 200 + { "duplicate": true } si ya existe. Documentar secreto HMAC en webhook_subscriptions.secret.
Pruebas y demo: scripts para crear reserva y para enviar el mismo webhook 3 veces; verificar 1) solo 1 mensaje en Telegram y 2) solo 1 fila en processed_webhooks. Añadir scripts/webhook-test.sh y pasos en README.
Further Considerations
Credenciales necesarias: provéeme DATABASE_URL (o confirmación de usar la DB existente), Supabase project keys, y TELEGRAM_BOT_TOKEN.
Edge Functions runtime: Supabase usa Deno — confirmar si quieres TypeScript Deno (recomendado) o Node (alternativa).
¿Mantener Redis idempotency en ms-reservations como capa defensiva? Option A: sólo en Supabase (consumer). Option B: doble-check en ms-reservations (publisher) — recomiéndese Option A for simplicity.
¿Revisas este plan y me indicas con cuál paso quieres que comencemos? (Opciones rápidas: 1=SQL + migration, 2=WebhookService en NestJS, 3=Edge Function idempotencia)
