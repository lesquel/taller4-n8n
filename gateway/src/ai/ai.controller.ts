/**
 * AI Chat Controller
 * Endpoint para interacción con el asistente de IA
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
} from "@nestjs/swagger";
import { GeminiService } from "./services/gemini.service";
import { McpClientService, McpTool } from "./services/mcp-client.service";
import { SendMessageDto, ChatResponseDto } from "./dto";
import { v4 as uuidv4 } from "uuid";

@ApiTags("🤖 AI Chat")
@Controller("chat")
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly mcpClient: McpClientService
  ) {}

  /**
   * POST /api/chat
   * Envía un mensaje al asistente de IA
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Enviar mensaje al asistente de IA",
    description: `
## Chat con Asistente IA MesaYa

Interactúa con el asistente de IA potenciado por **Gemini** para gestionar reservas usando lenguaje natural.

### 🧠 Capacidades del Asistente:
- 🔍 Buscar mesas disponibles
- 📅 Verificar disponibilidad por fecha/hora
- ✨ Crear reservas automáticamente
- 📋 Listar secciones del restaurante

### 💬 Ejemplos de Mensajes:
- "Quiero una mesa para 4 personas mañana a las 8pm"
- "¿Hay mesas disponibles en la terraza?"
- "Reserva la mesa 5 para el viernes a las 20:00"
- "¿Cuáles son las secciones del restaurante?"

### 🔧 Herramientas MCP Disponibles:
El asistente usa el protocolo MCP para ejecutar acciones:
- \`search_tables\`: Busca mesas por capacidad/sección
- \`check_table_availability\`: Verifica disponibilidad
- \`create_reservation\`: Crea reservas
- \`get_table_info\`: Obtiene detalles de mesa

### 🔐 Autenticación Opcional:
Si envías un token JWT, las reservas se crearán a tu nombre.
    `,
  })
  @ApiBody({
    type: SendMessageDto,
    examples: {
      buscar: {
        summary: "🔍 Buscar mesas",
        value: {
          message: "Busca mesas para 4 personas en la terraza",
          sessionId: "session-demo-1",
        },
      },
      reservar: {
        summary: "📅 Hacer reserva",
        value: {
          message:
            "Quiero reservar una mesa para 6 personas el próximo viernes a las 20:00",
          sessionId: "session-demo-1",
        },
      },
      verificar: {
        summary: "✅ Verificar disponibilidad",
        value: {
          message: "¿La mesa 5 está libre mañana a las 19:00?",
          sessionId: "session-demo-1",
        },
      },
    },
  })
  @ApiHeader({
    name: "Authorization",
    description: "Token JWT (opcional) - Bearer {token}",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "✅ Respuesta del asistente",
    type: ChatResponseDto,
  })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Headers("authorization") authHeader?: string
  ): Promise<ChatResponseDto> {
    // Extraer token JWT si existe
    const authToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    // Generar o usar sessionId existente
    const sessionId = dto.sessionId || uuidv4();

    // Procesar mensaje con Gemini
    const result = await this.geminiService.chat(
      dto.message,
      dto.history || [],
      authToken
    );

    return {
      response: result.response,
      toolsExecuted: result.toolsExecuted,
      toolResults: result.toolResults,
      sessionId,
    };
  }

  /**
   * GET /api/chat/status
   * Verifica el estado del servicio de IA
   */
  @Get("status")
  @ApiOperation({
    summary: "Estado del servicio de IA",
    description:
      "Retorna información sobre la disponibilidad del servicio de IA y MCP.",
  })
  async getStatus() {
    const mcpHealthy = await this.mcpClient.healthCheck();
    const modelInfo = this.geminiService.getModelInfo();

    return {
      status: modelInfo.available && mcpHealthy ? "operational" : "degraded",
      gemini: {
        available: modelInfo.available,
        model: modelInfo.model,
        toolsCount: modelInfo.toolsCount,
      },
      mcp: {
        healthy: mcpHealthy,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/chat/tools
   * Lista las herramientas disponibles para la IA
   */
  @Get("tools")
  @ApiOperation({
    summary: "Listar herramientas de IA",
    description:
      "Retorna la lista de herramientas MCP disponibles para el asistente.",
  })
  async getTools(): Promise<{
    success: boolean;
    tools: McpTool[];
    count: number;
    error?: string;
  }> {
    try {
      const tools = await this.mcpClient.listTools();
      return {
        success: true,
        tools,
        count: tools.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener herramientas",
        tools: [],
        count: 0,
      };
    }
  }
}
