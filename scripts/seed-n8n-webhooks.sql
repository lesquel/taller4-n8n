-- ═══════════════════════════════════════════════════════════════════════
-- Taller 4: Suscripciones de Webhook para n8n
-- Ejecutar en: db_reservas
-- ═══════════════════════════════════════════════════════════════════════

-- Eliminar suscripciones previas de n8n (si existen)
DELETE FROM webhook_subscriptions WHERE name LIKE 'n8n%';

-- ───────────────────────────────────────────────────────────────
-- Workflow 1: Notificación Inteligente (reservation.created)
-- n8n generará mensaje con Gemini y enviará a Telegram
-- ───────────────────────────────────────────────────────────────
INSERT INTO webhook_subscriptions (name, target_url, secret, event_types, is_active)
VALUES (
  'n8n Notificación Inteligente',
  'http://n8n:5678/webhook/reservation-created',
  'mesaya_webhook_secret_2024',
  '{reservation.created}',
  true
);

-- ───────────────────────────────────────────────────────────────
-- Workflow 2: Auditoría Google Sheets (todos los eventos)
-- n8n registrará cada evento en una hoja de cálculo
-- ───────────────────────────────────────────────────────────────
INSERT INTO webhook_subscriptions (name, target_url, secret, event_types, is_active)
VALUES (
  'n8n Auditoría Sheets',
  'http://n8n:5678/webhook/audit-events',
  'mesaya_webhook_secret_2024',
  '{reservation.created,reservation.confirmed,reservation.cancelled,table.occupied,table.released}',
  true
);

-- ───────────────────────────────────────────────────────────────
-- Workflow 3: Alertas Críticas (reservation.cancelled)
-- n8n alertará al admin si se cancela mesa grande (>6 personas)
-- ───────────────────────────────────────────────────────────────
INSERT INTO webhook_subscriptions (name, target_url, secret, event_types, is_active)
VALUES (
  'n8n Alertas Críticas',
  'http://n8n:5678/webhook/reservation-cancelled',
  'mesaya_webhook_secret_2024',
  '{reservation.cancelled}',
  true
);

-- ───────────────────────────────────────────────────────────────
-- Verificar suscripciones creadas
-- ───────────────────────────────────────────────────────────────
SELECT 
  id,
  name,
  target_url,
  event_types,
  is_active,
  created_at
FROM webhook_subscriptions
WHERE name LIKE 'n8n%'
ORDER BY id;
