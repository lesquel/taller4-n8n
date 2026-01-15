// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK SERVICE - HMAC Signing & HTTP Dispatch
// ═══════════════════════════════════════════════════════════════════════
// Taller 2: Publisher de Webhooks con firma HMAC-SHA256
// ═══════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import * as crypto from "node:crypto";
import axios, { AxiosError } from "axios";

import {
  WebhookSubscription,
  WebhookEvent,
  WebhookDelivery,
  DeliveryStatus,
} from "./entities";

export interface WebhookPayload {
  event_type: string;
  idempotency_key: string;
  timestamp: string;
  data: Record<string, any>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
    @InjectRepository(WebhookEvent)
    private readonly eventRepo: Repository<WebhookEvent>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectQueue("webhook-outbox")
    private readonly webhookQueue: Queue,
    private readonly config: ConfigService
  ) {}

  // ─────────────────────────────────────────────────────────────
  // HMAC-SHA256 Signature
  // ─────────────────────────────────────────────────────────────
  signPayload(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Publish Event to all matching subscribers
  // ─────────────────────────────────────────────────────────────
  async publish(
    eventType: string,
    data: Record<string, any>,
    idempotencyKey: string
  ): Promise<void> {
    this.logger.log(`📤 Publishing webhook: ${eventType}`);
    this.logger.log(`   Idempotency Key: ${idempotencyKey}`);

    // 1. Buscar suscriptores activos para este tipo de evento
    const subscriptions = await this.subscriptionRepo
      .createQueryBuilder("sub")
      .where("sub.is_active = :active", { active: true })
      .andWhere(":eventType = ANY(sub.event_types)", { eventType })
      .getMany();

    if (subscriptions.length === 0) {
      this.logger.warn(`⚠️ No active subscriptions for event: ${eventType}`);
      return;
    }

    this.logger.log(`   Found ${subscriptions.length} subscriber(s)`);

    // 2. Crear el payload
    const payload: WebhookPayload = {
      event_type: eventType,
      idempotency_key: idempotencyKey,
      timestamp: new Date().toISOString(),
      data,
    };

    // 3. Guardar el evento en la DB (con manejo de duplicados)
    let webhookEvent;
    try {
      webhookEvent = await this.eventRepo.save({
        event_type: eventType,
        payload,
        idempotency_key: idempotencyKey,
      });
      this.logger.log(`   Event saved: ${webhookEvent.id}`);
    } catch (error) {
      // Si el evento ya existe (duplicate key), lo buscamos
      if (error.code === "23505") {
        this.logger.warn(
          `⚠️ Event already exists for idempotency key: ${idempotencyKey}`
        );
        webhookEvent = await this.eventRepo.findOne({
          where: { idempotency_key: idempotencyKey },
        });
        if (!webhookEvent) {
          this.logger.error(
            `❌ Could not find existing event for key: ${idempotencyKey}`
          );
          return;
        }
        this.logger.log(`   Using existing event: ${webhookEvent.id}`);
        // Ya fue procesado, no volver a encolar
        return;
      }
      throw error;
    }

    // 4. Crear deliveries y encolar
    for (const subscription of subscriptions) {
      const delivery = await this.deliveryRepo.save({
        event_id: webhookEvent.id,
        subscription_id: subscription.id,
        status: DeliveryStatus.PENDING,
        attempt_count: 0,
      });

      // Encolar para envío con Bull
      await this.webhookQueue.add(
        "send",
        {
          deliveryId: delivery.id,
          subscriptionId: subscription.id,
          eventId: webhookEvent.id,
          targetUrl: subscription.target_url,
          secret: subscription.secret,
          payload,
        },
        {
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 1000, // 1s, 2s, 4s, 8s, 16s
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      this.logger.log(
        `   Queued delivery ${delivery.id} to ${subscription.name}`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Send webhook HTTP request (called by Bull processor)
  // ─────────────────────────────────────────────────────────────
  async sendWebhook(
    deliveryId: string,
    targetUrl: string,
    secret: string,
    payload: WebhookPayload
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const payloadString = JSON.stringify(payload);
    const signature = this.signPayload(payloadString, secret);

    this.logger.log(`🚀 Sending webhook to ${targetUrl}`);

    try {
      const response = await axios.post(targetUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Idempotency-Key": payload.idempotency_key,
        },
        timeout: 10000, // 10 segundos
        validateStatus: () => true, // No lanzar error en status codes
      });

      // Actualizar delivery
      await this.deliveryRepo.update(deliveryId, {
        last_attempt_at: new Date(),
        response_status: response.status,
        response_body:
          typeof response.data === "string"
            ? response.data.substring(0, 1000)
            : JSON.stringify(response.data).substring(0, 1000),
        status:
          response.status >= 200 && response.status < 300
            ? DeliveryStatus.SUCCESS
            : DeliveryStatus.RETRYING,
        attempt_count: () => "attempt_count + 1",
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(
          `✅ Webhook delivered successfully: ${response.status}`
        );

        // Log si fue duplicado (para demos)
        if (response.data?.duplicate) {
          this.logger.log(`   ⚠️ Consumer reported duplicate (idempotent)`);
        }

        return { success: true, statusCode: response.status };
      } else {
        this.logger.warn(`⚠️ Webhook failed: ${response.status}`);
        return { success: false, statusCode: response.status };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.message || "Unknown error";

      this.logger.error(`❌ Webhook error: ${errorMessage}`);

      await this.deliveryRepo.update(deliveryId, {
        last_attempt_at: new Date(),
        error_message: errorMessage,
        status: DeliveryStatus.RETRYING,
        attempt_count: () => "attempt_count + 1",
      });

      return { success: false, error: errorMessage };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Mark delivery as permanently failed
  // ─────────────────────────────────────────────────────────────
  async markDeliveryFailed(deliveryId: string, error: string): Promise<void> {
    await this.deliveryRepo.update(deliveryId, {
      status: DeliveryStatus.FAILED,
      error_message: error,
    });
    this.logger.error(`💀 Delivery ${deliveryId} permanently failed: ${error}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Get delivery stats (for monitoring)
  // ─────────────────────────────────────────────────────────────
  async getDeliveryStats(): Promise<{
    pending: number;
    success: number;
    failed: number;
    retrying: number;
  }> {
    const stats = await this.deliveryRepo
      .createQueryBuilder("d")
      .select("d.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("d.status")
      .getRawMany();

    const result = {
      pending: 0,
      success: 0,
      failed: 0,
      retrying: 0,
    };

    for (const stat of stats) {
      result[stat.status as keyof typeof result] = Number.parseInt(
        stat.count,
        10
      );
    }

    return result;
  }
}
