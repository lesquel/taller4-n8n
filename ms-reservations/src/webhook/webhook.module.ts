// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK MODULE
// ═══════════════════════════════════════════════════════════════════════
// Taller 2: Módulo de webhooks con Bull Queue para retry
// ═══════════════════════════════════════════════════════════════════════

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { WebhookService } from "./webhook.service";
import { WebhookProcessor } from "./webhook.processor";
import { WebhookListener } from "./webhook.listener";
import { WebhookSubscription, WebhookEvent, WebhookDelivery } from "./entities";

@Module({
  imports: [
    // Entities
    TypeOrmModule.forFeature([
      WebhookSubscription,
      WebhookEvent,
      WebhookDelivery,
    ]),

    // Bull Queue para reintentos con exponential backoff
    BullModule.registerQueueAsync({
      name: "webhook-outbox",
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>("REDIS_HOST") || "localhost",
          port: config.get<number>("REDIS_PORT") || 6379,
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      }),
    }),
  ],
  providers: [WebhookService, WebhookProcessor, WebhookListener],
  exports: [WebhookService, WebhookListener],
})
export class WebhookModule {}
