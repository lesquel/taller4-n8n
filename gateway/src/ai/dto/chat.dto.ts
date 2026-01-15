/**
 * AI Chat DTO
 * Data Transfer Objects para el módulo de IA
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ChatMessageDto {
  @ApiProperty({
    description: "Rol del mensaje (user o assistant)",
    example: "user",
  })
  @IsString()
  @IsNotEmpty()
  role: "user" | "assistant" | "system";

  @ApiProperty({
    description: "Contenido del mensaje",
    example: "Quiero reservar una mesa para 4 personas mañana a las 8pm",
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class SendMessageDto {
  @ApiProperty({
    description: "Mensaje del usuario",
    example: "Quiero reservar una mesa para 4 personas mañana a las 8pm",
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: "Historial de conversación previo",
    type: [ChatMessageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @ApiPropertyOptional({
    description: "ID de sesión para mantener contexto",
    example: "session-123",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: "Respuesta generada por la IA",
  })
  response: string;

  @ApiProperty({
    description: "Indica si se ejecutaron herramientas",
  })
  toolsExecuted: boolean;

  @ApiPropertyOptional({
    description: "Detalles de las herramientas ejecutadas",
  })
  toolResults?: Array<{
    tool: string;
    success: boolean;
    data?: unknown;
  }>;

  @ApiProperty({
    description: "ID de sesión",
  })
  sessionId: string;
}
