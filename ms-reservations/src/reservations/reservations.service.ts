import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import {
  ReservationEntity,
  ReservationStatus,
} from "./entities/reservation.entity";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { RedisService } from "../redis/redis.service";
import { WebhookListener } from "../webhook/webhook.listener";
import { N8nWebhookEmitterService } from "../common/n8n-webhook-emitter.service";

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
    @Inject("TABLES_SERVICE") private readonly tablesClient: ClientProxy,
    private readonly redisService: RedisService,
    private readonly webhookListener: WebhookListener,
    private readonly n8nEmitter: N8nWebhookEmitterService
  ) {}

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREAR RESERVA CON IDEMPOTENCIA AVANZADA
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Implementa el Patrón de Consumidor Idempotente (Opción B del taller):
   *
   * 1. Check-Lock-Check con Redis (evita race conditions)
   * 2. Guardar en Postgres
   * 3. Confirmar idempotency key en Redis
   * 4. Emitir evento a ms-tables
   *
   * En caso de error, se hace rollback del lock.
   */
  async create(dto: CreateReservationDto): Promise<ReservationEntity> {
    const {
      idempotencyKey,
      userId,
      restaurantId,
      tableId,
      reservationDate,
      reservationTime,
      numberOfGuests,
    } = dto;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`📨 Nueva solicitud de reserva`);
    console.log(`   IdempotencyKey: ${idempotencyKey}`);
    console.log(`   Usuario: ${userId}`);
    console.log(`   Mesa: ${tableId}`);
    console.log(`${"═".repeat(60)}\n`);

    // ─────────────────────────────────────────────────────────────
    // PASO 1: Verificar idempotencia con Lock Distribuido
    // ─────────────────────────────────────────────────────────────
    const idempotencyResult = await this.redisService.checkAndLock(
      idempotencyKey
    );

    if (idempotencyResult.isDuplicate) {
      console.log(`⚠️ DUPLICADO DETECTADO`);
      console.log(`   IdempotencyKey: ${idempotencyKey}`);
      console.log(
        `   ReservationId existente: ${idempotencyResult.existingReservationId}`
      );

      // Lanzar excepción RPC para que el Gateway la maneje
      throw new RpcException({
        status: 409,
        message: "Duplicate reservation: idempotencyKey already processed",
        idempotencyKey,
        existingReservationId: idempotencyResult.existingReservationId,
      });
    }

    // Lock adquirido, proceder con la creación
    console.log(`🔐 Lock adquirido, procediendo con la creación...`);

    let savedReservation: ReservationEntity;

    try {
      // ─────────────────────────────────────────────────────────────
      // PASO 2: Crear reserva en Postgres
      // ─────────────────────────────────────────────────────────────
      const reservation = this.reservationRepository.create({
        userId,
        restaurantId,
        tableId, // Solo es un string UUID, no una FK real
        reservationDate: new Date(reservationDate),
        reservationTime: new Date(reservationTime),
        numberOfGuests,
        status: "PENDING",
      });

      savedReservation = await this.reservationRepository.save(reservation);
      console.log(`✅ Reserva guardada en Postgres: ${savedReservation.id}`);

      // ─────────────────────────────────────────────────────────────
      // PASO 3: Confirmar idempotency key en Redis
      // ─────────────────────────────────────────────────────────────
      await this.redisService.confirmReservation(
        idempotencyKey,
        savedReservation.id
      );
    } catch (error) {
      // ─────────────────────────────────────────────────────────────
      // ROLLBACK: Liberar lock en caso de error
      // ─────────────────────────────────────────────────────────────
      console.error(`❌ Error al crear reserva, haciendo rollback del lock`);
      console.error(`   Detalle del error:`, error);
      await this.redisService.rollbackLock(idempotencyKey);

      throw new RpcException({
        status: 500,
        message: "Error creating reservation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 4: Emitir evento a ms-tables (fire and forget)
    // ─────────────────────────────────────────────────────────────
    try {
      this.tablesClient.emit("table.occupied", {
        tableId,
        reservationId: savedReservation.id,
        userId,
        timestamp: new Date().toISOString(),
      });
      console.log(`📤 Evento 'table.occupied' emitido para mesa ${tableId}`);
    } catch (eventError) {
      // El evento es best-effort, no debe fallar la reserva
      console.warn(`⚠️ Error emitiendo evento (no crítico):`, eventError);
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 5: Emitir webhook a Supabase (Taller 2)
    // ─────────────────────────────────────────────────────────────
    try {
      await this.webhookListener.onReservationCreated(savedReservation);
      console.log(`🔗 Webhook 'reservation.created' publicado`);
    } catch (webhookError) {
      // El webhook es best-effort, no debe fallar la reserva
      console.warn(`⚠️ Error publicando webhook (no crítico):`, webhookError);
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 6: Emitir evento a n8n (Taller 4 - Automatización)
    // FIRE-AND-FORGET: No bloquea la respuesta
    // ─────────────────────────────────────────────────────────────
    try {
      this.n8nEmitter.onReservationCreated({
        reservation_id: savedReservation.id,
        user_id: savedReservation.userId,
        user_name: `Usuario ${savedReservation.userId.substring(0, 8)}`,
        table_id: savedReservation.tableId,
        restaurant_id: savedReservation.restaurantId,
        reservation_date: savedReservation.reservationDate,
        reservation_time: savedReservation.reservationTime,
        number_of_guests: savedReservation.numberOfGuests,
        status: savedReservation.status,
      });
      console.log(`🤖 Evento 'reserva.creada' emitido a n8n (fire-and-forget)`);
    } catch (n8nError) {
      // n8n es fire-and-forget, no debe fallar la reserva
      console.warn(`⚠️ Error emitiendo a n8n (no crítico):`, n8nError);
    }

    console.log(`\n${"─".repeat(60)}`);
    console.log(`🎉 RESERVA COMPLETADA EXITOSAMENTE`);
    console.log(`   ID: ${savedReservation.id}`);
    console.log(`   IdempotencyKey: ${idempotencyKey}`);
    console.log(`${"─".repeat(60)}\n`);

    return savedReservation;
  }

  async findByUser(userId: string): Promise<ReservationEntity[]> {
    return this.reservationRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async findByTable(
    tableId: string,
    date: string
  ): Promise<ReservationEntity[]> {
    // Buscar reservas para esa mesa en esa fecha (ignorando hora exacta para traer todo el día)
    // Asumimos que date viene en formato YYYY-MM-DD
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reservationRepository
      .createQueryBuilder("reservation")
      .where("reservation.tableId = :tableId", { tableId })
      .andWhere("reservation.reservationDate BETWEEN :start AND :end", {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere("reservation.status NOT IN (:...statuses)", {
        statuses: ["CANCELLED", "REJECTED"],
      })
      .getMany();
  }

  async findOne(id: string, userId: string): Promise<ReservationEntity> {
    const reservation = await this.reservationRepository.findOne({
      where: { id, userId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async updateStatus(
    id: string,
    status: ReservationStatus
  ): Promise<ReservationEntity> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    reservation.status = status;
    const updated = await this.reservationRepository.save(reservation);

    // Si la reserva se completa o cancela, liberar la mesa
    if (status === "COMPLETED" || status === "CANCELLED") {
      this.tablesClient.emit("table.released", {
        tableId: reservation.tableId,
      });
      console.log(
        `📤 Evento table.released emitido para mesa ${reservation.tableId}`
      );

      // Emitir webhook de cancelación (Taller 2)
      if (status === "CANCELLED") {
        try {
          await this.webhookListener.onReservationCancelled(updated);
          console.log(`🔗 Webhook 'reservation.cancelled' publicado`);
        } catch (webhookError) {
          console.warn(`⚠️ Error publicando webhook:`, webhookError);
        }

        // Emitir a n8n (Taller 4) - FIRE-AND-FORGET
        try {
          this.n8nEmitter.onReservationCancelled({
            reservation_id: updated.id,
            user_id: updated.userId,
            table_id: updated.tableId,
            reservation_date: updated.reservationDate,
            cancellation_reason: "Cancelada por el usuario",
          });
          console.log(`🤖 Evento 'reserva.cancelada' emitido a n8n`);
        } catch (n8nError) {
          console.warn(`⚠️ Error emitiendo a n8n:`, n8nError);
        }
      }
    }

    // Si la reserva se confirma, emitir webhook (Taller 2)
    if (status === "CONFIRMED") {
      try {
        await this.webhookListener.onReservationConfirmed(updated);
        console.log(`🔗 Webhook 'reservation.confirmed' publicado`);
      } catch (webhookError) {
        console.warn(`⚠️ Error publicando webhook:`, webhookError);
      }

      // Emitir a n8n (Taller 4) - FIRE-AND-FORGET
      try {
        this.n8nEmitter.onReservationConfirmed({
          reservation_id: updated.id,
          user_id: updated.userId,
          table_id: updated.tableId,
          reservation_date: updated.reservationDate,
          reservation_time: updated.reservationTime,
        });
        console.log(`🤖 Evento 'reserva.confirmada' emitido a n8n`);
      } catch (n8nError) {
        console.warn(`⚠️ Error emitiendo a n8n:`, n8nError);
      }
    }

    return updated;
  }
}
