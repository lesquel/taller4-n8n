// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK LISTENER - Domain Event Handler
// ═══════════════════════════════════════════════════════════════════════
// Taller 2: Escucha eventos de dominio y los publica como webhooks
// ═══════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from "@nestjs/common";
import { WebhookService } from "./webhook.service";
import { ReservationEntity } from "../reservations/entities/reservation.entity";

@Injectable()
export class WebhookListener {
  private readonly logger = new Logger(WebhookListener.name);

  constructor(private readonly webhookService: WebhookService) {}

  // ─────────────────────────────────────────────────────────────
  // Reservation Events
  // ─────────────────────────────────────────────────────────────

  async onReservationCreated(reservation: ReservationEntity): Promise<void> {
    this.logger.log(`🎯 Event: reservation.created (${reservation.id})`);

    await this.webhookService.publish(
      "reservation.created",
      {
        reservation_id: reservation.id,
        user_id: reservation.userId,
        restaurant_id: reservation.restaurantId,
        table_id: reservation.tableId,
        reservation_date: reservation.reservationDate,
        reservation_time: reservation.reservationTime,
        number_of_guests: reservation.numberOfGuests,
        status: reservation.status,
      },
      `reservation:${reservation.id}:created`
    );
  }

  async onReservationConfirmed(reservation: ReservationEntity): Promise<void> {
    this.logger.log(`🎯 Event: reservation.confirmed (${reservation.id})`);

    await this.webhookService.publish(
      "reservation.confirmed",
      {
        reservation_id: reservation.id,
        user_id: reservation.userId,
        table_id: reservation.tableId,
        reservation_date: reservation.reservationDate,
        reservation_time: reservation.reservationTime,
        status: reservation.status,
      },
      `reservation:${reservation.id}:confirmed`
    );
  }

  async onReservationCancelled(
    reservation: ReservationEntity,
    reason?: string
  ): Promise<void> {
    this.logger.log(`🎯 Event: reservation.cancelled (${reservation.id})`);

    await this.webhookService.publish(
      "reservation.cancelled",
      {
        reservation_id: reservation.id,
        user_id: reservation.userId,
        table_id: reservation.tableId,
        reservation_date: reservation.reservationDate,
        cancellation_reason: reason || "Not specified",
        status: reservation.status,
      },
      `reservation:${reservation.id}:cancelled`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Table Events (triggered by reservation status changes)
  // ─────────────────────────────────────────────────────────────

  async onTableOccupied(
    tableId: string,
    restaurantId: string,
    reservationId: string
  ): Promise<void> {
    this.logger.log(`🎯 Event: table.occupied (${tableId})`);

    await this.webhookService.publish(
      "table.occupied",
      {
        table_id: tableId,
        restaurant_id: restaurantId,
        reservation_id: reservationId,
        occupied_at: new Date().toISOString(),
      },
      `table:${tableId}:occupied:${reservationId}`
    );
  }

  async onTableReleased(tableId: string, restaurantId: string): Promise<void> {
    this.logger.log(`🎯 Event: table.released (${tableId})`);

    await this.webhookService.publish(
      "table.released",
      {
        table_id: tableId,
        restaurant_id: restaurantId,
        released_at: new Date().toISOString(),
      },
      `table:${tableId}:released:${Date.now()}`
    );
  }
}
