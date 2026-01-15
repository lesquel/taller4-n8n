// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK EXTERNAL NOTIFIER - Supabase Edge Function
// ═══════════════════════════════════════════════════════════════════════
// Taller 2: Notificaciones externas vía Telegram
//
// Este endpoint:
// 1. Valida la firma HMAC del webhook
// 2. Verifica idempotencia (processed_webhooks)
// 3. Envía notificación a Telegram
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// HMAC Signature Validation
// ─────────────────────────────────────────────────────────────
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expected = `sha256=${expectedSignature}`;
  if (signature.length !== expected.length) return false;

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// ─────────────────────────────────────────────────────────────
// Telegram Bot API
// ─────────────────────────────────────────────────────────────
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Telegram API error:", error);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// Format message for Telegram
// ─────────────────────────────────────────────────────────────
function formatTelegramMessage(eventType: string, payload: any): string {
  const timestamp = new Date().toISOString();

  // Extract data from nested 'data' field or root payload
  const data = payload.data || payload;

  switch (eventType) {
    case "reservation.created":
      return `🍽️ <b>Nueva Reserva Creada</b>

📋 <b>Detalles:</b>
• ID: <code>${data.reservation_id || data.id || "N/A"}</code>
• Mesa: ${data.table_id || data.tableId || "N/A"}
• Restaurante: ${data.restaurant_id || data.restaurantId || "N/A"}
• Fecha: ${data.reservation_date || data.reservationDate || "N/A"}
• Hora: ${data.reservation_time || data.reservationTime || "N/A"}
• Personas: ${data.number_of_guests || data.numberOfGuests || "N/A"}

⏰ Recibido: ${timestamp}`;

    case "reservation.confirmed":
      return `✅ <b>Reserva Confirmada</b>

📋 ID: <code>${data.reservation_id || data.id || "N/A"}</code>
📅 Fecha: ${data.reservation_date || data.reservationDate || "N/A"}
🪑 Mesa: ${data.table_id || data.tableId || "N/A"}

⏰ ${timestamp}`;

    case "reservation.cancelled":
      return `❌ <b>Reserva Cancelada</b>

📋 ID: <code>${data.reservation_id || data.id || "N/A"}</code>
📅 Fecha: ${data.reservation_date || data.reservationDate || "N/A"}
💬 Motivo: ${
        data.cancellation_reason || data.cancellationReason || "No especificado"
      }

⏰ ${timestamp}`;

    case "table.occupied":
      return `🔴 <b>Mesa Ocupada</b>

🪑 Mesa ID: <code>${data.table_id || data.tableId || "N/A"}</code>
🏪 Restaurante: ${data.restaurant_id || data.restaurantId || "N/A"}
📋 Reserva: ${data.reservation_id || data.reservationId || "N/A"}

⏰ ${timestamp}`;

    case "table.released":
      return `🟢 <b>Mesa Liberada</b>

🪑 Mesa ID: <code>${data.table_id || data.tableId || "N/A"}</code>
🏪 Restaurante: ${data.restaurant_id || data.restaurantId || "N/A"}

⏰ ${timestamp}`;

    default:
      return `📢 <b>Evento: ${eventType}</b>

📦 Payload:
<pre>${JSON.stringify(payload, null, 2).substring(0, 500)}</pre>

⏰ ${timestamp}`;
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-Webhook-Signature, X-Idempotency-Key",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Extraer headers y body
    // ─────────────────────────────────────────────────────────────
    const signature = req.headers.get("X-Webhook-Signature") || "";
    const idempotencyKey = req.headers.get("X-Idempotency-Key") || "";
    const rawBody = await req.text();

    console.log("📨 Webhook notification received");
    console.log("   Idempotency Key:", idempotencyKey);

    if (!signature || !idempotencyKey) {
      return new Response(
        JSON.stringify({ error: "Missing required headers" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Validar firma HMAC
    // ─────────────────────────────────────────────────────────────
    const secret = Deno.env.get("WEBHOOK_SECRET") || "";
    const isValid = await verifyHmacSignature(rawBody, signature, secret);

    if (!isValid) {
      console.log("❌ Invalid HMAC signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("✅ HMAC signature valid");

    // ─────────────────────────────────────────────────────────────
    // 3. Parse payload
    // ─────────────────────────────────────────────────────────────
    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type || payload.eventType || "unknown";

    // ─────────────────────────────────────────────────────────────
    // 4. Conectar a Supabase para verificar idempotencia
    // ─────────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clave de idempotencia específica para notifier
    const notifierKey = `notifier:${idempotencyKey}`;

    const { data: existing } = await supabase
      .from("processed_webhooks")
      .select("id, processed_at")
      .eq("idempotency_key", notifierKey)
      .single();

    if (existing) {
      console.log(`⚠️ DUPLICATE notification: ${idempotencyKey}`);
      return new Response(
        JSON.stringify({
          success: true,
          duplicate: true,
          message: "Notification already sent",
          processed_at: existing.processed_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Enviar a Telegram
    // ─────────────────────────────────────────────────────────────
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";

    if (!botToken || !chatId) {
      console.error("❌ Telegram configuration missing");
      return new Response(
        JSON.stringify({ error: "Telegram not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const message = formatTelegramMessage(eventType, payload);
    const telegramSent = await sendTelegramMessage(botToken, chatId, message);

    if (!telegramSent) {
      return new Response(
        JSON.stringify({ error: "Failed to send Telegram notification" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Telegram notification sent");

    // ─────────────────────────────────────────────────────────────
    // 6. Marcar como procesado (idempotencia)
    // ─────────────────────────────────────────────────────────────
    await supabase.from("processed_webhooks").insert({
      idempotency_key: notifierKey,
      event_type: eventType,
      response_data: { telegram_sent: true },
    });

    return new Response(
      JSON.stringify({
        success: true,
        duplicate: false,
        telegram_sent: true,
        event_type: eventType,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error processing notification:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
