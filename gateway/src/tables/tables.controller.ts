import {
  Controller,
  Get,
  Param,
  Inject,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProperty,
} from "@nestjs/swagger";
import { firstValueFrom, timeout } from "rxjs";

// ═══════════════════════════════════════════════════════════════════════
// DTOs DE RESPUESTA PARA SWAGGER
// ═══════════════════════════════════════════════════════════════════════

class TableDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID de la mesa",
  })
  id: string;

  @ApiProperty({ example: "Mesa 5", description: "Nombre o número de la mesa" })
  name: string;

  @ApiProperty({ example: 4, description: "Capacidad máxima de personas" })
  capacity: number;

  @ApiProperty({ example: "Terraza", description: "Sección del restaurante" })
  section: string;

  @ApiProperty({
    example: false,
    description: "Si la mesa está ocupada actualmente",
  })
  isOccupied: boolean;

  @ApiProperty({
    example: true,
    description: "Si la mesa está disponible para reservar",
  })
  isAvailable: boolean;
}

class TablesListResponseDto {
  @ApiProperty({ type: [TableDto] })
  tables: TableDto[];

  @ApiProperty({ example: 15 })
  total: number;
}

@ApiTags("🪑 Tables")
@Controller("tables")
export class TablesController {
  constructor(
    @Inject("TABLES_SERVICE") private readonly tablesClient: ClientProxy
  ) {}

  /**
   * GET /api/v1/tables
   * Lista todas las mesas disponibles.
   */
  @Get()
  @ApiOperation({
    summary: "Listar todas las mesas",
    description: `
## Obtener Lista de Mesas

Retorna todas las mesas del restaurante con su estado actual.

### 📋 Información Incluida:
- ID de la mesa (para usar en reservas)
- Capacidad de personas
- Sección del restaurante
- Estado (ocupada/disponible)

### 💡 Uso Típico:
Usa este endpoint para obtener los \`tableId\` necesarios para crear reservas.
    `,
  })
  @ApiResponse({
    status: 200,
    description: "✅ Lista de mesas obtenida",
    type: TablesListResponseDto,
  })
  async findAll() {
    try {
      const result = await firstValueFrom(
        this.tablesClient.send({ cmd: "list_tables" }, {}).pipe(timeout(10000))
      );
      return result;
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Error fetching tables",
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/tables/:id
   * Obtiene una mesa por ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de una mesa",
    description:
      "Retorna información detallada de una mesa específica por su UUID.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la mesa",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @ApiResponse({
    status: 200,
    description: "✅ Mesa encontrada",
    type: TableDto,
  })
  @ApiResponse({ status: 404, description: "❌ Mesa no encontrada" })
  async findOne(@Param("id") id: string) {
    try {
      const result = await firstValueFrom(
        this.tablesClient
          .send({ cmd: "find_table" }, { id })
          .pipe(timeout(10000))
      );
      return result;
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Table not found",
        error?.status || HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * GET /api/v1/tables/section/:sectionId
   * Lista mesas por sección.
   */
  @Get("section/:sectionId")
  @ApiOperation({ summary: "Listar mesas por sección" })
  async findBySection(@Param("sectionId") sectionId: string) {
    try {
      const result = await firstValueFrom(
        this.tablesClient
          .send({ cmd: "list_section_tables" }, { sectionId })
          .pipe(timeout(10000))
      );
      return result;
    } catch (error: any) {
      throw new HttpException(
        error?.message || "Error fetching tables",
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
