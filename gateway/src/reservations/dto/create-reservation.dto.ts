import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
} from "class-validator";

/**
 * DTO para crear una nueva reserva
 *
 * @example
 * {
 *   "idempotencyKey": "res-2026-01-15-user123",
 *   "restaurantId": "550e8400-e29b-41d4-a716-446655440000",
 *   "tableId": "550e8400-e29b-41d4-a716-446655440001",
 *   "reservationDate": "2026-01-20",
 *   "reservationTime": "2026-01-20T20:00:00Z",
 *   "numberOfGuests": 4
 * }
 */
export class CreateReservationDto {
  @ApiProperty({
    description: `**Clave de idempotencia única** para evitar reservas duplicadas.
    
⚠️ Si envías la misma clave 2 veces, la segunda petición retornará error 409.

**Formato recomendado:** \`reservation-{fecha}-{tableId}-{timestamp}\``,
    example: "res-2026-01-15-table5-1704067200",
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;

  @ApiProperty({
    description: "UUID del restaurante donde se hace la reserva",
    example: "550e8400-e29b-41d4-a716-446655440000",
    format: "uuid",
  })
  @IsNotEmpty()
  @IsUUID()
  restaurantId: string;

  @ApiProperty({
    description: "UUID de la mesa a reservar (obtenla de GET /tables)",
    example: "550e8400-e29b-41d4-a716-446655440001",
    format: "uuid",
  })
  @IsNotEmpty()
  @IsUUID()
  tableId: string;

  @ApiProperty({
    description: "Fecha de la reserva en formato ISO (YYYY-MM-DD)",
    example: "2026-01-20",
    format: "date",
  })
  @IsNotEmpty()
  @IsDateString()
  reservationDate: string;

  @ApiProperty({
    description: "Hora de la reserva en formato ISO 8601",
    example: "2026-01-20T20:00:00Z",
    format: "date-time",
  })
  @IsNotEmpty()
  @IsDateString()
  reservationTime: string;

  @ApiProperty({
    description: "Número de comensales (1-20 personas)",
    example: 4,
    minimum: 1,
    maximum: 20,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfGuests: number;

  @ApiPropertyOptional({
    description: "Nombre del cliente (opcional, se obtiene del JWT)",
    example: "Carlos Mendoza",
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    description: "Notas especiales para la reserva",
    example: "Mesa cerca de la ventana, cumpleaños",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
