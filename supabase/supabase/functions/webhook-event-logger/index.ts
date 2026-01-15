// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK EVENT LOGGER - Supabase Edge Function
// ═══════════════════════════════════════════════════════════════════════
// Taller 2: Idempotent Consumer Pattern
//
// Este endpoint:
// 1. Valida la firma HMAC del webhook
// 2. Verifica idempotencia (processed_webhooks)
// 3. Guarda el evento en webhook_events
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

  // Comparación segura contra timing attacks
  const expected = `sha256=${expectedSignature}`;
  if (signature.length !== expected.length) return false;

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
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

    console.log("📨 Webhook received");
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
    // 4. Conectar a Supabase
    // ─────────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─────────────────────────────────────────────────────────────
    // 5. IDEMPOTENCIA: Verificar si ya fue procesado
    // ─────────────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("processed_webhooks")
      .select("id, processed_at")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) {
      console.log(
        `⚠️ DUPLICATE: ${idempotencyKey} already processed at ${existing.processed_at}`
      );
      return new Response(
        JSON.stringify({
          success: true,
          duplicate: true,
          message: "Event already processed",
          processed_at: existing.processed_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Guardar en webhook_events
    // ─────────────────────────────────────────────────────────────
    const { data: event, error: eventError } = await supabase
      .from("webhook_events")
      .insert({
        event_type: eventType,
        payload: payload,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (eventError) {
      // Si es violación de unique constraint, es un duplicado por race condition
      if (eventError.code === "23505") {
        console.log(`⚠️ Race condition duplicate: ${idempotencyKey}`);
        return new Response(
          JSON.stringify({
            success: true,
            duplicate: true,
            message: "Event already processed (race condition)",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw eventError;
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Marcar como procesado (idempotencia)
    // ─────────────────────────────────────────────────────────────
    const { error: processedError } = await supabase
      .from("processed_webhooks")
      .insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        response_data: { event_id: event.id },
      });

    if (processedError && processedError.code !== "23505") {
      console.error("Error marking as processed:", processedError);
    }

    console.log(`✅ Event logged: ${event.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        duplicate: false,
        event_id: event.id,
        event_type: eventType,
        idempotency_key: idempotencyKey,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
