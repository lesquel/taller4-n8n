// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK QUEUE PROCESSOR - Bull Queue Handler
// ═══════════════════════════════════════════════════════════════════════
// Taller 2: Retry con exponential backoff
// ═══════════════════════════════════════════════════════════════════════

import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
} from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { WebhookService, WebhookPayload } from "./webhook.service";

export interface WebhookJobData {
  deliveryId: string;
  subscriptionId: string;
  eventId: string;
  targetUrl: string;
  secret: string;
  payload: WebhookPayload;
}

@Processor("webhook-outbox")
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Process("send")
  async handleSend(job: Job<WebhookJobData>): Promise<void> {
    const { deliveryId, targetUrl, secret, payload } = job.data;

    this.logger.log(
      `📬 Processing job ${job.id} (attempt ${job.attemptsMade + 1})`
    );
    this.logger.log(`   Delivery: ${deliveryId}`);
    this.logger.log(`   Target: ${targetUrl}`);

    const result = await this.webhookService.sendWebhook(
      deliveryId,
      targetUrl,
      secret,
      payload
    );

    if (!result.success) {
      // Lanzar error para que Bull reintente
      throw new Error(result.error || `HTTP ${result.statusCode || "unknown"}`);
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<WebhookJobData>): void {
    this.logger.log(
      `✅ Job ${job.id} completed for delivery ${job.data.deliveryId}`
    );
  }

  @OnQueueFailed()
  async onFailed(job: Job<WebhookJobData>, error: Error): Promise<void> {
    this.logger.warn(
      `⚠️ Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${error.message}`
    );

    // Si se agotaron los reintentos, marcar como fallido permanentemente
    if (job.attemptsMade >= (job.opts.attempts || 5)) {
      this.logger.error(`💀 Job ${job.id} exhausted all retries`);
      await this.webhookService.markDeliveryFailed(
        job.data.deliveryId,
        `Exhausted ${job.attemptsMade} retries. Last error: ${error.message}`
      );
    }
  }
}
