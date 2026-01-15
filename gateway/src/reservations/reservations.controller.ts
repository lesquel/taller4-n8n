import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiProperty,
} from "@nestjs/swagger";
import { firstValueFrom, timeout, catchError, throwError } from "rxjs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ValidatedUser } from "../auth/strategies/jwt.strategy";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { UpdateReservationStatusDto } from "./dto/update-reservation-status.dto";

// ═══════════════════════════════════════════════════════════════════════
// DTOs DE RESPUESTA PARA SWAGGER
// ═══════════════════════════════════════════════════════════════════════

class ReservationResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440099" })
  id: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  tableId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440003" })
  userId: string;

  @ApiProperty({ example: "2026-01-20" })
  reservationDate: string;

  @ApiProperty({ example: "20:00" })
  reservationTime: string;

  @ApiProperty({ example: 4 })
  numberOfGuests: number;

  @ApiProperty({ example: "CONFIRMED" })
  status: string;

  @ApiProperty({ example: "2026-01-13T22:00:00.000Z" })
  createdAt: string;
}

class CreateReservationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ReservationResponseDto })
  data: ReservationResponseDto;

  @ApiProperty({
    example: {
      processingTime: "150ms",
      idempotencyKey: "res-2026-01-15-table5",
    },
  })
  meta: { processingTime: string; idempotencyKey: string };
}

class ConflictErrorDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({
    example: "Reservation with this idempotencyKey already exists",
  })
  message: string;

  @ApiProperty({ example: "DUPLICATE_IDEMPOTENCY_KEY" })
  error: string;

  @ApiProperty({ example: "res-2026-01-15-table5" })
  idempotencyKey: string;
}

@ApiTags("🍽️ Reservations")
@Controller("reservations")
export class ReservationsController {
  private readonly logger = new Logger(ReservationsController.name);

  constructor(
    @Inject("RESERVATIONS_SERVICE")
    private readonly reservationsClient: ClientProxy
  ) {}

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * POST /api/v1/reservations
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Crea una nueva reserva con idempotencia.
   *
   * Flujo:
   * 1. Gateway valida JWT y extrae userId
   * 2. Gateway envía mensaje a ms-reservations vía RabbitMQ
   * 3. ms-reservations verifica idempotencyKey en Redis
   * 4. Si es duplicado → retorna 409
   * 5. Si es nuevo → guarda en Postgres, confirma en Redis, emite evento a ms-tables
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Crear una nueva reserva",
    description: `
## Crear Reserva con Idempotencia

Crea una nueva reserva para una mesa específica. Este endpoint usa el **patrón de idempotencia** para evitar reservas duplicadas.

### 🔐 Requiere Autenticación
Debes estar logueado y usar el token JWT en el header Authorization.

### ⚡ Flujo del Proceso:
1. Gateway valida tu JWT y extrae el userId
2. Se verifica si el \`idempotencyKey\` ya fue usado
3. Si es nuevo → se crea la reserva y se notifica a n8n
4. Si es duplicado → retorna error 409

### 📧 Webhooks Automáticos:
Cuando se crea la reserva, se disparan webhooks a n8n que:
- 🤖 Generan mensaje con Gemini AI
- 📱 Envían notificación a Telegram
- 📊 Registran en Google Sheets
    `,
  })
  @ApiBody({
    type: CreateReservationDto,
    examples: {
      ejemplo1: {
        summary: "🍽️ Reserva para 4 personas",
        value: {
          idempotencyKey: "res-2026-01-20-mesa5-" + Date.now(),
          restaurantId: "550e8400-e29b-41d4-a716-446655440000",
          tableId: "550e8400-e29b-41d4-a716-446655440001",
          reservationDate: "2026-01-20",
          reservationTime: "2026-01-20T20:00:00Z",
          numberOfGuests: 4,
          notes: "Mesa cerca de la ventana",
        },
      },
      ejemplo2: {
        summary: "🎂 Reserva de cumpleaños (8 personas)",
        value: {
          idempotencyKey: "birthday-party-" + Date.now(),
          restaurantId: "550e8400-e29b-41d4-a716-446655440000",
          tableId: "550e8400-e29b-41d4-a716-446655440002",
          reservationDate: "2026-01-25",
          reservationTime: "2026-01-25T19:30:00Z",
          numberOfGuests: 8,
          notes: "Cumpleaños - traer pastel",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "✅ Reserva creada exitosamente",
    type: CreateReservationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "❌ No autorizado - Token JWT inválido o faltante",
  })
  @ApiResponse({
    status: 409,
    description:
      "⚠️ Conflicto - idempotencyKey ya fue procesada (reserva duplicada)",
    type: ConflictErrorDto,
  })
  @ApiResponse({ status: 500, description: "🔥 Error interno del servidor" })
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: ValidatedUser
  ) {
    const startTime = Date.now();

    // Log de entrada
    this.logger.log(`📨 [Gateway] Nueva solicitud de reserva`);
    this.logger.log(`   Usuario: ${user.userId}`);
    this.logger.log(
      `   IdempotencyKey: ${createReservationDto.idempotencyKey}`
    );

    // Construir payload con el userId validado del JWT
    const payload = {
      ...createReservationDto,
      userId: user.userId,
    };

    try {
      // Enviar mensaje al microservicio de reservas y esperar respuesta
      const result = await firstValueFrom(
        this.reservationsClient
          .send({ cmd: "create_reservation" }, payload)
          .pipe(
            timeout(15000), // 15 segundos de timeout
            catchError((err) => {
              this.logger.error(`❌ [Gateway] Error del microservicio:`, err);
              return throwError(() => err);
            })
          )
      );

      const duration = Date.now() - startTime;
      this.logger.log(`✅ [Gateway] Reserva creada en ${duration}ms`);
      this.logger.log(`   ReservationId: ${result.id}`);

      return {
        success: true,
        data: result,
        meta: {
          processingTime: `${duration}ms`,
          idempotencyKey: createReservationDto.idempotencyKey,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Extraer información del error RPC
      // El error puede venir como objeto directamente o como string JSON
      let errorData: any;
      if (typeof error === "object" && error !== null) {
        // El error viene como objeto (RpcException)
        errorData = error;
      } else if (typeof error?.message === "string") {
        try {
          errorData = JSON.parse(error.message);
        } catch {
          errorData = { message: error.message };
        }
      }

      // Manejar errores de duplicado (idempotencia)
      if (
        errorData?.status === 409 ||
        errorData?.message?.includes("Duplicate")
      ) {
        this.logger.warn(`⚠️ [Gateway] Duplicado detectado en ${duration}ms`);
        this.logger.warn(
          `   IdempotencyKey: ${createReservationDto.idempotencyKey}`
        );

        throw new HttpException(
          {
            success: false,
            statusCode: HttpStatus.CONFLICT,
            message: "Reservation with this idempotencyKey already exists",
            error: "DUPLICATE_IDEMPOTENCY_KEY",
            idempotencyKey: createReservationDto.idempotencyKey,
            existingReservationId: errorData?.existingReservationId,
            meta: {
              processingTime: `${duration}ms`,
            },
          },
          HttpStatus.CONFLICT
        );
      }

      this.logger.error(`❌ [Gateway] Error en ${duration}ms:`, error?.message);

      throw new HttpException(
        {
          success: false,
          statusCode: errorData?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            errorData?.message ||
            error?.message ||
            "Error creating reservation",
          meta: {
            processingTime: `${duration}ms`,
          },
        },
        errorData?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/reservations/table/:tableId
   * Lista las reservas de una mesa específica en una fecha (Query param 'date')
   * Usado por el MCP y el Frontend para verificar disponibilidad
   */
  @Get("table/:tableId")
  @ApiOperation({ summary: "Listar reservas de una mesa" })
  async findByTable(
    @Param("tableId") tableId: string,
    @Query("date") date: string
  ) {
    this.logger.log(
      `📅 [Gateway] Verificando disponibilidad mesa ${tableId} para fecha ${date}`
    );

    try {
      const result = await firstValueFrom(
        this.reservationsClient
          .send({ cmd: "find_by_table" }, { tableId, date })
          .pipe(timeout(10000))
      );
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [Gateway] Error verificando mesa:`, error);
      throw new HttpException(
        {
          success: false,
          message: error?.message || "Error checking table availability",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar mis reservas" })
  async findAll(@CurrentUser() user: ValidatedUser) {
    this.logger.log(
      `📋 [Gateway] Listando reservas para usuario: ${user.userId}`
    );

    try {
      const result = await firstValueFrom(
        this.reservationsClient
          .send({ cmd: "list_reservations" }, { userId: user.userId })
          .pipe(timeout(10000))
      );
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error?.message || "Error fetching reservations",
        },
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/reservations/:id
   * Obtiene una reserva por ID.
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener detalle de una reserva" })
  async findOne(@Param("id") id: string, @CurrentUser() user: ValidatedUser) {
    this.logger.log(`🔍 [Gateway] Buscando reserva: ${id}`);

    try {
      const result = await firstValueFrom(
        this.reservationsClient
          .send({ cmd: "find_reservation" }, { id, userId: user.userId })
          .pipe(timeout(10000))
      );
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error?.message || "Reservation not found",
        },
        error?.status || HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * PATCH /api/v1/reservations/:id/status
   * Actualiza el estado de una reserva.
   */
  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar estado de una reserva" })
  @ApiBody({ type: UpdateReservationStatusDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateReservationStatusDto,
    @CurrentUser() user: ValidatedUser
  ) {
    this.logger.log(
      `🔄 [Gateway] Actualizando estado de reserva: ${id} -> ${updateStatusDto.status}`
    );

    try {
      const result = await firstValueFrom(
        this.reservationsClient
          .send(
            { cmd: "update_reservation_status" },
            {
              id,
              status: updateStatusDto.status,
              userId: user.userId,
            }
          )
          .pipe(timeout(10000))
      );
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error?.message || "Error updating reservation status",
        },
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
