import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import { ReservationEntity } from "./entities/reservation.entity";
import { WebhookModule } from "../webhook/webhook.module";
import { N8nWebhookEmitterService } from "../common/n8n-webhook-emitter.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ReservationEntity]),
    // Webhook module para publicar eventos externos
    forwardRef(() => WebhookModule),
    // Cliente para emitir eventos a ms-tables
    ClientsModule.registerAsync([
      {
        name: "TABLES_SERVICE",
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>("RABBITMQ_URL") ||
                "amqp://mesaya:mesaya_secret@localhost:5672",
            ],
            queue: "tables_queue",
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, N8nWebhookEmitterService],
  exports: [ReservationsService, N8nWebhookEmitterService],
})
export class ReservationsModule {}
