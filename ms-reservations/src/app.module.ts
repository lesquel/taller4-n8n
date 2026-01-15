import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { BullModule } from "@nestjs/bull";
import { ReservationsModule } from "./reservations/reservations.module";
import { RedisModule } from "./redis/redis.module";
import { WebhookModule } from "./webhook/webhook.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),

    // Bull Queue global configuration (for webhooks)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>("REDIS_HOST") || "localhost",
          port: config.get<number>("REDIS_PORT") || 6379,
        },
      }),
    }),

    // Conexión a db_reservas (Base de datos independiente)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbConfig = {
          type: "postgres" as const,
          host:
            config.get<string>("DB_HOST") ||
            config.get<string>("MS_RESERVATIONS_DB_HOST") ||
            "localhost",
          port: parseInt(
            config.get<string>("DB_PORT") ||
              config.get<string>("MS_RESERVATIONS_DB_PORT") ||
              "5432",
            10
          ),
          username: config.get<string>("MS_RESERVATIONS_DB_USER") || "mesaya",
          password:
            config.get<string>("MS_RESERVATIONS_DB_PASSWORD") ||
            "mesaya_secret",
          database:
            config.get<string>("MS_RESERVATIONS_DB_NAME") || "db_reservas",
          autoLoadEntities: true,
          synchronize: true, // Solo en desarrollo
        };
        console.log("DB Config:", {
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          database: dbConfig.database,
          passwordLength: dbConfig.password?.length,
        });
        return dbConfig;
      },
    }),

    // Cliente RabbitMQ para emitir eventos a ms-tables
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

    RedisModule,
    ReservationsModule,
    WebhookModule,
  ],
})
export class AppModule {}
