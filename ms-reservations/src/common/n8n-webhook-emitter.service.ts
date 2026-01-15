// ═══════════════════════════════════════════════════════════════════════
// N8N WEBHOOK EMITTER SERVICE - Taller 4: Event-Driven Automation
// ═══════════════════════════════════════════════════════════════════════
// Este servicio emite eventos HTTP a n8n para automatización de workflows.
// Es independiente y no afecta la lógica existente del sistema.
// ═══════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface N8nEventPayload {
  event: string;
  id: string;
  timestamp: string;
  data: Record<string, any>;
  metadata: {
    source: string;
    correlation_id: string;
    version: string;
  };
}

@Injectable()
export class N8nWebhookEmitterService {
  private readonly logger = new Logger(N8nWebhookEmitterService.name);
  private readonly n8nBaseUrl: string;
  private readonly isEnabled: boolean;

  // URLs de los workflows de n8n (configurables)
  private readonly webhookPaths = {
    notification: "/webhook/reserva-notificacion",
    sheets: "/webhook/reserva-sheets-sync",
    alerts: "/webhook/reserva-alertas",
  };

  constructor(private readonly config: ConfigService) {
    this.n8nBaseUrl =
      config.get<string>("N8N_WEBHOOK_URL") || "http://n8n:5678";
    this.isEnabled = config.get<string>("N8N_ENABLED") !== "false";

    if (this.isEnabled) {
      this.logger.log(
        `🔗 N8n Webhook Emitter inicializado: ${this.n8nBaseUrl}`
      );
    } else {
      this.logger.warn("⚠️ N8n Webhook Emitter deshabilitado");
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Emitir evento genérico a n8n (FIRE-AND-FORGET)
  // No bloquea la respuesta al cliente - emite en background
  // ─────────────────────────────────────────────────────────────
  emit(event: string, data: Record<string, any>, correlationId?: string): void {
    if (!this.isEnabled) {
      this.logger.debug(`📵 N8n deshabilitado, evento ignorado: ${event}`);
      return;
    }

    const payload: N8nEventPayload = {
      event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source: "ms-reservations",
        correlation_id: correlationId || this.generateCorrelationId(),
        version: "1.0.0",
      },
    };

    // Emitir a todos los workflows configurados (FIRE-AND-FORGET, no await)
    this.logger.log(`🚀 Emitiendo evento ${event} a n8n (fire-and-forget)`);

    // Ejecutar en background sin bloquear
    setImmediate(() => {
      Promise.allSettled([
        this.sendToWorkflow("notification", payload),
        this.sendToWorkflow("sheets", payload),
        this.sendToWorkflow("alerts", payload),
      ])
        .then(() => {
          this.logger.log(
            `✅ Evento ${event} emitido a todos los workflows n8n`
          );
        })
        .catch((error) => {
          this.logger.warn(
            `⚠️ Error parcial emitiendo evento ${event}:`,
            error instanceof Error ? error.message : error
          );
        });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Emitir a un workflow específico
  // ─────────────────────────────────────────────────────────────
  async emitToWorkflow(
    workflow: "notification" | "sheets" | "alerts",
    event: string,
    data: Record<string, any>,
    correlationId?: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    const payload: N8nEventPayload = {
      event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source: "ms-reservations",
        correlation_id: correlationId || this.generateCorrelationId(),
        version: "1.0.0",
      },
    };

    await this.sendToWorkflow(workflow, payload);
  }

  // ─────────────────────────────────────────────────────────────
  // Enviar HTTP POST al webhook de n8n
  // ─────────────────────────────────────────────────────────────
  private async sendToWorkflow(
    workflow: keyof typeof this.webhookPaths,
    payload: N8nEventPayload
  ): Promise<void> {
    const url = `${this.n8nBaseUrl}${this.webhookPaths[workflow]}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8n-Event": payload.event,
          "X-Correlation-ID": payload.metadata.correlation_id,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.logger.debug(
          `📤 [${workflow}] Evento ${payload.event} enviado correctamente`
        );
      } else {
        this.logger.warn(
          `⚠️ [${workflow}] n8n respondió con status ${response.status}`
        );
      }
    } catch (error) {
      // Es "fire-and-forget", no debe bloquear la operación principal
      this.logger.warn(
        `⚠️ [${workflow}] Error enviando a n8n (no crítico):`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Eventos específicos del dominio de Reservas
  // Todos son fire-and-forget (no async, no bloquean)
  // ─────────────────────────────────────────────────────────────

  onReservationCreated(reservationData: {
    reservation_id: string;
    user_id: string;
    user_name?: string;
    table_id: string;
    table_number?: number;
    restaurant_id: string;
    reservation_date: Date | string;
    reservation_time: Date | string;
    number_of_guests: number;
    status: string;
  }): void {
    this.emit("reserva.creada", {
      reserva_id: reservationData.reservation_id,
      usuario_id: reservationData.user_id,
      usuario_nombre: reservationData.user_name || "Cliente",
      mesa_id: reservationData.table_id,
      mesa_numero: reservationData.table_number || 0,
      restaurante_id: reservationData.restaurant_id,
      fecha_reserva: reservationData.reservation_date,
      hora_reserva: reservationData.reservation_time,
      num_personas: reservationData.number_of_guests,
      estado: reservationData.status,
    });
  }

  onReservationConfirmed(reservationData: {
    reservation_id: string;
    user_id: string;
    user_name?: string;
    table_id: string;
    table_number?: number;
    reservation_date: Date | string;
    reservation_time: Date | string;
  }): void {
    this.emit("reserva.confirmada", {
      reserva_id: reservationData.reservation_id,
      usuario_id: reservationData.user_id,
      usuario_nombre: reservationData.user_name || "Cliente",
      mesa_id: reservationData.table_id,
      mesa_numero: reservationData.table_number || 0,
      fecha_reserva: reservationData.reservation_date,
      hora_reserva: reservationData.reservation_time,
      estado: "CONFIRMED",
    });
  }

  onReservationCancelled(reservationData: {
    reservation_id: string;
    user_id: string;
    user_name?: string;
    table_id: string;
    reservation_date: Date | string;
    cancellation_reason?: string;
  }): void {
    this.emit("reserva.cancelada", {
      reserva_id: reservationData.reservation_id,
      usuario_id: reservationData.user_id,
      usuario_nombre: reservationData.user_name || "Cliente",
      mesa_id: reservationData.table_id,
      fecha_reserva: reservationData.reservation_date,
      motivo_cancelacion:
        reservationData.cancellation_reason || "No especificado",
      estado: "CANCELLED",
    });
  }

  onCheckinRealized(reservationData: {
    reservation_id: string;
    user_id: string;
    user_name?: string;
    table_id: string;
    table_number?: number;
    checkin_time: Date | string;
  }): void {
    this.emit("checkin.realizado", {
      reserva_id: reservationData.reservation_id,
      usuario_id: reservationData.user_id,
      usuario_nombre: reservationData.user_name || "Cliente",
      mesa_id: reservationData.table_id,
      mesa_numero: reservationData.table_number || 0,
      hora_checkin: reservationData.checkin_time,
      estado: "CHECKED_IN",
    });
  }
}
