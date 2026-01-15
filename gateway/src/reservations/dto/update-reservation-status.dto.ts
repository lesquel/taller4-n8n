import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsIn } from "class-validator";

/**
 * Estados posibles de una reserva
 */
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CHECKED_IN"
  | "REJECTED";

/**
 * DTO para actualizar el estado de una reserva
 */
export class UpdateReservationStatusDto {
  @ApiProperty({
    description: `**Nuevo estado de la reserva**

| Estado | Descripción |
|--------|-------------|
| PENDING | ⏳ Esperando confirmación |
| CONFIRMED | ✅ Reserva confirmada |
| CANCELLED | ❌ Cancelada por el cliente |
| COMPLETED | 🎉 Servicio completado |
| NO_SHOW | 👻 Cliente no se presentó |
| CHECKED_IN | 📍 Cliente llegó al restaurante |
| REJECTED | 🚫 Rechazada por el restaurante |`,
    enum: [
      "PENDING",
      "CONFIRMED",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW",
      "CHECKED_IN",
      "REJECTED",
    ],
    example: "CONFIRMED",
  })
  @IsNotEmpty()
  @IsIn([
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
    "CHECKED_IN",
    "REJECTED",
  ])
  status: ReservationStatus;
}
