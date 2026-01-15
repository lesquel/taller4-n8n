-- ═══════════════════════════════════════════════════════════════════════
-- SEED DATA SCRIPT - MesaYa Restaurant Reservation System
-- ═══════════════════════════════════════════════════════════════════════
-- Este script inserta datos de prueba en las bases de datos:
-- - db_mesas: Mesas del restaurante
-- - db_reservas: Reservaciones y webhooks
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- BASE DE DATOS: db_mesas
-- ───────────────────────────────────────────────────────────────────────
\c db_mesas;

-- IDs de secciones del restaurante (simulados)
-- Sección 1: Terraza (outdoor)
-- Sección 2: Salón Principal (main hall)
-- Sección 3: VIP / Privado

-- Limpiar datos existentes
TRUNCATE TABLE tables CASCADE;

-- Insertar 20 mesas distribuidas en 3 secciones
INSERT INTO tables (id, "sectionId", number, capacity, "posX", "posY", width, height, status, "isAvailable", "createdAt", "updatedAt") VALUES
-- ═══ SECCIÓN 1: TERRAZA (8 mesas) ═══
('11111111-1111-1111-1111-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 2, 50, 50, 80, 80, 'AVAILABLE', true, NOW(), NOW()),
('11111111-1111-1111-1111-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 2, 150, 50, 80, 80, 'AVAILABLE', true, NOW(), NOW()),
('11111111-1111-1111-1111-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, 4, 250, 50, 100, 100, 'OCCUPIED', false, NOW(), NOW()),
('11111111-1111-1111-1111-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 370, 50, 100, 100, 'AVAILABLE', true, NOW(), NOW()),
('11111111-1111-1111-1111-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 6, 50, 170, 120, 120, 'AVAILABLE', true, NOW(), NOW()),
('11111111-1111-1111-1111-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 6, 6, 190, 170, 120, 120, 'BLOCKED', false, NOW(), NOW()),
('11111111-1111-1111-1111-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 7, 4, 330, 170, 100, 100, 'AVAILABLE', true, NOW(), NOW()),
('11111111-1111-1111-1111-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 8, 2, 450, 170, 80, 80, 'AVAILABLE', true, NOW(), NOW()),

-- ═══ SECCIÓN 2: SALÓN PRINCIPAL (8 mesas) ═══
('22222222-2222-2222-2222-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 9, 4, 50, 50, 100, 100, 'AVAILABLE', true, NOW(), NOW()),
('22222222-2222-2222-2222-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 10, 4, 170, 50, 100, 100, 'OCCUPIED', false, NOW(), NOW()),
('22222222-2222-2222-2222-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 11, 6, 290, 50, 120, 120, 'AVAILABLE', true, NOW(), NOW()),
('22222222-2222-2222-2222-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 12, 6, 430, 50, 120, 120, 'AVAILABLE', true, NOW(), NOW()),
('22222222-2222-2222-2222-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 13, 8, 50, 190, 140, 140, 'AVAILABLE', true, NOW(), NOW()),
('22222222-2222-2222-2222-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 14, 8, 210, 190, 140, 140, 'OCCUPIED', false, NOW(), NOW()),
('22222222-2222-2222-2222-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 15, 4, 370, 190, 100, 100, 'AVAILABLE', true, NOW(), NOW()),
('22222222-2222-2222-2222-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 16, 2, 490, 190, 80, 80, 'AVAILABLE', true, NOW(), NOW()),

-- ═══ SECCIÓN 3: VIP / PRIVADO (4 mesas) ═══
('33333333-3333-3333-3333-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 17, 10, 50, 50, 180, 180, 'AVAILABLE', true, NOW(), NOW()),
('33333333-3333-3333-3333-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 18, 10, 250, 50, 180, 180, 'AVAILABLE', true, NOW(), NOW()),
('33333333-3333-3333-3333-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 19, 12, 50, 250, 200, 200, 'OCCUPIED', false, NOW(), NOW()),
('33333333-3333-3333-3333-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 20, 6, 270, 250, 120, 120, 'AVAILABLE', true, NOW(), NOW());

-- Verificar inserción
SELECT 'MESAS INSERTADAS:' as info, COUNT(*) as total FROM tables;
SELECT status, COUNT(*) as cantidad FROM tables GROUP BY status;

-- ───────────────────────────────────────────────────────────────────────
-- BASE DE DATOS: db_reservas
-- ───────────────────────────────────────────────────────────────────────
\c db_reservas;

-- Limpiar datos existentes (mantener webhooks)
TRUNCATE TABLE reservations CASCADE;

-- IDs de usuarios simulados
-- Usuario 1: Juan García (cliente frecuente)
-- Usuario 2: María López (cliente nuevo)
-- Usuario 3: Carlos Mendoza (cliente VIP)

-- ID del restaurante (único para este sistema)
-- Restaurant ID: rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr

-- Insertar 25 reservaciones (pasadas, actuales y futuras)
-- Usando gen_random_uuid() para generar UUIDs válidos o usando formato correcto
INSERT INTO reservations (id, "userId", "restaurantId", "tableId", "reservationDate", "reservationTime", "numberOfGuests", status, "createdAt", "updatedAt") VALUES
-- ═══ RESERVACIONES COMPLETADAS (pasadas) ═══
('a0000001-0001-4001-8001-000000000001', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000001', '2026-01-10', '2026-01-10 19:00:00', 2, 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('a0000001-0001-4001-8001-000000000002', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000001', '2026-01-10', '2026-01-10 20:00:00', 4, 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('a0000001-0001-4001-8001-000000000003', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000001', '2026-01-10', '2026-01-10 21:00:00', 8, 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('a0000001-0001-4001-8001-000000000004', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000005', '2026-01-11', '2026-01-11 13:00:00', 6, 'COMPLETED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('a0000001-0001-4001-8001-000000000005', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000003', '2026-01-11', '2026-01-11 19:30:00', 5, 'COMPLETED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- ═══ RESERVACIONES CANCELADAS ═══
('a0000001-0001-4001-8001-000000000006', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000003', '2026-01-12', '2026-01-12 20:00:00', 4, 'CANCELLED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('a0000001-0001-4001-8001-000000000007', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000002', '2026-01-12', '2026-01-12 21:00:00', 10, 'CANCELLED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- ═══ RESERVACIONES NO SHOW ═══
('a0000001-0001-4001-8001-000000000008', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000005', '2026-01-12', '2026-01-12 19:00:00', 7, 'NO_SHOW', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- ═══ RESERVACIONES HOY (13 enero 2026) - CHECKED IN ═══
('a0000001-0001-4001-8001-000000000009', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000003', '2026-01-13', '2026-01-13 12:00:00', 4, 'CHECKED_IN', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000010', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000002', '2026-01-13', '2026-01-13 12:30:00', 4, 'CHECKED_IN', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000011', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000006', '2026-01-13', '2026-01-13 13:00:00', 8, 'CHECKED_IN', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000012', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000003', '2026-01-13', '2026-01-13 13:30:00', 12, 'CHECKED_IN', NOW(), NOW()),

-- ═══ RESERVACIONES HOY - CONFIRMADAS (para la tarde/noche) ═══
('a0000001-0001-4001-8001-000000000013', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000001', '2026-01-13', '2026-01-13 19:00:00', 2, 'CONFIRMED', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000014', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000004', '2026-01-13', '2026-01-13 19:30:00', 4, 'CONFIRMED', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000015', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000001', '2026-01-13', '2026-01-13 20:00:00', 4, 'CONFIRMED', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000016', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000001', '2026-01-13', '2026-01-13 20:30:00', 10, 'CONFIRMED', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000017', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000004', '2026-01-13', '2026-01-13 21:00:00', 6, 'CONFIRMED', NOW(), NOW()),

-- ═══ RESERVACIONES PENDIENTES (futuras) ═══
('a0000001-0001-4001-8001-000000000018', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000002', '2026-01-14', '2026-01-14 19:00:00', 2, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000019', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000003', '2026-01-14', '2026-01-14 20:00:00', 6, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000020', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000002', '2026-01-14', '2026-01-14 21:00:00', 10, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000021', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000005', '2026-01-15', '2026-01-15 13:00:00', 6, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000022', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '22222222-2222-2222-2222-000000000005', '2026-01-15', '2026-01-15 19:30:00', 8, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000023', 'b0000001-0001-4001-8001-000000000002', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000004', '2026-01-16', '2026-01-16 20:00:00', 6, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000024', 'b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001', '11111111-1111-1111-1111-000000000007', '2026-01-17', '2026-01-17 19:00:00', 4, 'PENDING', NOW(), NOW()),
('a0000001-0001-4001-8001-000000000025', 'b0000001-0001-4001-8001-000000000003', 'c0000001-0001-4001-8001-000000000001', '33333333-3333-3333-3333-000000000001', '2026-01-18', '2026-01-18 21:00:00', 10, 'PENDING', NOW(), NOW());

-- Verificar inserción
SELECT 'RESERVACIONES INSERTADAS:' as info, COUNT(*) as total FROM reservations;
SELECT status, COUNT(*) as cantidad FROM reservations GROUP BY status ORDER BY cantidad DESC;

-- ───────────────────────────────────────────────────────────────────────
-- WEBHOOK SUBSCRIPTIONS para n8n
-- ───────────────────────────────────────────────────────────────────────

-- Limpiar webhooks existentes
TRUNCATE TABLE webhook_subscriptions CASCADE;

-- Insertar suscripciones a webhooks de n8n
INSERT INTO webhook_subscriptions (id, name, target_url, secret, event_types, is_active, created_at, updated_at) VALUES
-- Webhook 1: Notificación Inteligente (Gemini + Telegram)
(
    'd0000001-0001-4001-8001-000000000001',
    'n8n-notificacion-inteligente',
    'https://miquel1319.app.n8n.cloud/webhook/reservation-created',
    'mesaya_webhook_secret_2024',
    ARRAY['reservation.created', 'reservation.confirmed'],
    true,
    NOW(),
    NOW()
),
-- Webhook 2: Auditoría en Google Sheets
(
    'd0000001-0001-4001-8001-000000000002',
    'n8n-auditoria-sheets',
    'https://miquel1319.app.n8n.cloud/webhook/audit-events',
    'mesaya_webhook_secret_2024',
    ARRAY['reservation.created', 'reservation.confirmed', 'reservation.cancelled', 'reservation.completed', 'reservation.checked_in'],
    true,
    NOW(),
    NOW()
),
-- Webhook 3: Alertas Críticas (grupos grandes)
(
    'd0000001-0001-4001-8001-000000000003',
    'n8n-alertas-criticas',
    'https://miquel1319.app.n8n.cloud/webhook/reservation-cancelled',
    'mesaya_webhook_secret_2024',
    ARRAY['reservation.cancelled', 'reservation.no_show'],
    true,
    NOW(),
    NOW()
);

-- Verificar webhooks
SELECT 'WEBHOOK SUBSCRIPTIONS:' as info, COUNT(*) as total FROM webhook_subscriptions;
SELECT name, is_active, array_length(event_types, 1) as num_events FROM webhook_subscriptions;

-- ═══════════════════════════════════════════════════════════════════════
-- RESUMEN FINAL
-- ═══════════════════════════════════════════════════════════════════════
\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '  SEED DATA COMPLETADO'
\echo '════════════════════════════════════════════════════════════════'
\echo '  db_mesas:'
\echo '     - 20 mesas en 3 secciones (Terraza, Salon, VIP)'
\echo ''
\echo '  db_reservas:'
\echo '     - 25 reservaciones (varios estados)'
\echo '     - 3 webhook subscriptions para n8n'
\echo ''
\echo '  Secciones del restaurante:'
\echo '     - Terraza:         aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\echo '     - Salon Principal: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\echo '     - VIP/Privado:     cccccccc-cccc-cccc-cccc-cccccccccccc'
\echo ''
\echo '  Usuarios de prueba:'
\echo '     - Juan Garcia:     b0000001-0001-4001-8001-000000000001'
\echo '     - Maria Lopez:     b0000001-0001-4001-8001-000000000002'
\echo '     - Carlos Mendoza:  b0000001-0001-4001-8001-000000000003'
\echo '════════════════════════════════════════════════════════════════'
