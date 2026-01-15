/**
 * ═══════════════════════════════════════════════════════════════════════
 * MesaYa - n8n HMAC Validation Helper
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Este código se usa en los nodos "Code" de n8n para validar la firma HMAC
 * de los webhooks enviados desde ms-reservations.
 *
 * Uso en n8n:
 * 1. Crear nodo "Code" después del nodo Webhook
 * 2. Copiar el contenido de validateWebhook()
 * 3. Ajustar según necesidades del workflow
 */

// ───────────────────────────────────────────────────────────────
// FUNCIÓN: Validación básica de webhook
// ───────────────────────────────────────────────────────────────
function validateWebhook(input, env) {
  const crypto = require("crypto");

  const SECRET = env.WEBHOOK_SECRET || "mesaya_webhook_secret_2024";
  const signature = input.headers["x-webhook-signature"];
  const payload = JSON.stringify(input.body);

  // Calcular firma esperada
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

  // Validar
  if (signature !== expectedSignature) {
    return { valid: false, error: "Firma HMAC inválida" };
  }

  return {
    valid: true,
    body: input.body,
    idempotencyKey: input.headers["x-idempotency-key"],
  };
}

// ───────────────────────────────────────────────────────────────
// CÓDIGO PARA COPIAR EN n8n (Nodo Code - Validación Completa)
// ───────────────────────────────────────────────────────────────
const N8N_CODE_TEMPLATE = `
// Validación HMAC-SHA256 del Webhook MesaYa
const crypto = require('crypto');

const SECRET = $env.WEBHOOK_SECRET || 'mesaya_webhook_secret_2024';
const signature = $input.first().headers['x-webhook-signature'];
const payload = JSON.stringify($input.first().body);

// Calcular firma esperada
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', SECRET)
  .update(payload)
  .digest('hex');

// Validar
if (signature !== expectedSignature) {
  throw new Error('❌ Firma HMAC inválida - webhook rechazado');
}

// Extraer datos del evento
const body = $input.first().body;
const eventType = body.event_type || body.eventType;
const data = body.data || body.payload || body;

return [{
  json: {
    valid: true,
    eventType,
    reservationId: data.id,
    tableId: data.tableId,
    numberOfGuests: data.numberOfGuests,
    customerName: data.customerName || 'Cliente',
    reservationDate: data.reservationDate,
    reservationTime: data.reservationTime,
    status: data.status,
    idempotencyKey: $input.first().headers['x-idempotency-key'] || 'N/A',
    rawData: data
  }
}];
`;

// ───────────────────────────────────────────────────────────────
// TEST LOCAL: Simular validación
// ───────────────────────────────────────────────────────────────
function testHMAC() {
  const crypto = require("crypto");
  const SECRET = "mesaya_webhook_secret_2024";

  const payload = JSON.stringify({
    event_type: "reservation.created",
    data: {
      id: 123,
      tableId: 5,
      numberOfGuests: 4,
      customerName: "Juan Pérez",
    },
  });

  const signature =
    "sha256=" +
    crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

  console.log("=== Test HMAC Signature ===");
  console.log("Secret:", SECRET);
  console.log("Payload:", payload);
  console.log("Signature:", signature);
  console.log("===========================");

  return signature;
}

// Ejecutar test si se corre directamente
if (require.main === module) {
  testHMAC();
}

module.exports = { validateWebhook, testHMAC };
