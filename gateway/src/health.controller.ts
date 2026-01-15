import { Controller, Get } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from "@nestjs/swagger";

class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status: string;

  @ApiProperty({ example: "MesaYa Gateway" })
  service: string;

  @ApiProperty({ example: "2026-01-13T22:00:00.000Z" })
  timestamp: string;
}

@ApiTags("❤️ Health")
@Controller()
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Health check del Gateway",
    description: "Verifica que el Gateway API esté funcionando correctamente.",
  })
  @ApiResponse({
    status: 200,
    description: "✅ Servicio operativo",
    type: HealthResponseDto,
  })
  health(): HealthResponseDto {
    return {
      status: "ok",
      service: "MesaYa Gateway",
      timestamp: new Date().toISOString(),
    };
  }
}
