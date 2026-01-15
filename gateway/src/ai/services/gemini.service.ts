/**
 * Gemini AI Service
 * Servicio para interactuar con Google Gemini 2.0 Flash
 * Implementa Function Calling para orquestar herramientas MCP
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  FunctionDeclaration,
  Tool,
  Part,
  FunctionResponsePart,
} from "@google/generative-ai";
import { McpClientService } from "./mcp-client.service";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ToolExecution {
  tool: string;
  success: boolean;
  data?: unknown;
}

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private functionDeclarations: FunctionDeclaration[] = [];

  // System prompt para contextualizar a Gemini sobre MesaYa
  private readonly systemPrompt = `Eres un asistente virtual amigable para MesaYa, un sistema de reservas de restaurantes.

Tu rol es ayudar a los usuarios a:
1. Buscar mesas disponibles según sus necesidades (número de personas, sección preferida)
2. Verificar disponibilidad de mesas para fechas y horas específicas
3. Crear reservas cuando el usuario lo solicite
4. Proporcionar información sobre el restaurante

REGLAS IMPORTANTES:
- Siempre sé amable y profesional
- Si el usuario quiere hacer una reserva, primero busca mesas disponibles y muéstralas
- Antes de crear una reserva, confirma los detalles con el usuario
- Las fechas deben estar en formato YYYY-MM-DD
- Las horas deben estar en formato HH:mm (24 horas)
- Si necesitas información que el usuario no ha proporcionado, pregunta de forma natural

FORMATO DE RESPUESTA:
- Usa un tono conversacional y cálido
- Formatea listas y opciones de manera clara
- Incluye emojis moderadamente para hacer la conversación más amigable

HERRAMIENTAS DISPONIBLES:
- search_tables: Para buscar mesas según capacidad y sección
- validate_availability: Para verificar si una mesa específica está libre
- create_reservation: Para confirmar una reserva
- get_table_info: Para obtener detalles de una mesa
- list_sections: Para mostrar las áreas del restaurante`;

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpClient: McpClientService
  ) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");

    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      this.logger.warn(
        "⚠️ GEMINI_API_KEY no configurada. El servicio de IA no funcionará correctamente."
      );
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async onModuleInit() {
    await this.initializeModel();
  }

  /**
   * Inicializa el modelo de Gemini con las herramientas MCP
   */
  private async initializeModel() {
    try {
      // Obtener declaraciones de funciones del MCP Server
      const mcpFunctions = await this.mcpClient.getGeminiFunctionDeclarations();

      this.functionDeclarations = mcpFunctions.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters as FunctionDeclaration["parameters"],
      }));

      const modelName =
        this.configService.get<string>("GEMINI_MODEL") || "gemini-2.0-flash";

      // Configurar tools para Function Calling
      const tools: Tool[] = [
        {
          functionDeclarations: this.functionDeclarations,
        },
      ];

      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        tools,
        systemInstruction: this.systemPrompt,
      });

      this.logger.log(
        `✅ Gemini model initialized: ${modelName} with ${this.functionDeclarations.length} tools`
      );
    } catch (error) {
      this.logger.error("Failed to initialize Gemini model:", error);
      // Crear modelo sin tools como fallback
      this.model = this.genAI?.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: this.systemPrompt,
      });
    }
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   * Implementa el ciclo de Function Calling
   */
  async chat(
    userMessage: string,
    history: ChatMessage[] = [],
    authToken?: string
  ): Promise<{
    response: string;
    toolsExecuted: boolean;
    toolResults: ToolExecution[];
  }> {
    if (!this.model) {
      return {
        response:
          "⚠️ El servicio de IA no está disponible. Por favor, configura la GEMINI_API_KEY.",
        toolsExecuted: false,
        toolResults: [],
      };
    }

    const toolResults: ToolExecution[] = [];

    try {
      // Convertir historial al formato de Gemini
      let contents: Content[] = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Eliminar mensajes iniciales del modelo (Google AI requiere que el historial empiece con 'user')
      while (contents.length > 0 && contents[0].role === "model") {
        contents.shift();
      }

      // Agregar mensaje actual
      contents.push({
        role: "user",
        parts: [{ text: userMessage }],
      });

      // Iniciar chat con historial
      const chat = this.model.startChat({ history: contents.slice(0, -1) });

      // Enviar mensaje y obtener respuesta
      let result;
      try {
        result = await chat.sendMessage(userMessage);
      } catch (error) {
        this.logger.error("Error calling chat.sendMessage:", error);
        if (error.cause) this.logger.error("Cause:", error.cause);
        throw error;
      }
      let response = result.response;

      // Ciclo de Function Calling
      let iterations = 0;
      const maxIterations = 5; // Prevenir loops infinitos

      while (iterations < maxIterations) {
        const functionCalls = response.functionCalls();

        if (!functionCalls || functionCalls.length === 0) {
          // No hay más function calls, terminar
          break;
        }

        this.logger.log(
          `Function calls detected: ${functionCalls
            .map((fc: { name: string }) => fc.name)
            .join(", ")}`
        );

        // Ejecutar cada function call
        const functionResponses: Array<{ name: string; response: unknown }> =
          [];

        for (const call of functionCalls) {
          this.logger.log(`Executing tool: ${call.name}`);

          const toolResult = await this.mcpClient.callTool(
            call.name,
            call.args as Record<string, unknown>,
            authToken
          );

          toolResults.push({
            tool: call.name,
            success: toolResult.success,
            data: toolResult.data,
          });

          functionResponses.push({
            name: call.name,
            response: toolResult,
          });
        }

        // Enviar resultados de vuelta a Gemini como FunctionResponsePart
        const functionResponseParts: FunctionResponsePart[] =
          functionResponses.map((fr) => ({
            functionResponse: {
              name: fr.name,
              response: fr.response as object,
            },
          }));

        result = await chat.sendMessage(functionResponseParts);

        response = result.response;
        iterations++;
      }

      // Extraer texto de la respuesta final
      const responseText = response.text();

      return {
        response: responseText,
        toolsExecuted: toolResults.length > 0,
        toolResults,
      };
    } catch (error: any) {
      if (error.status === 429) {
        this.logger.warn(
          "⚠️ Cuota de Gemini excedida (429). Solicitando al usuario que espere."
        );
        return {
          response:
            "⏳ Has excedido la cuota gratuita de Gemini. Por favor espera unos 10-30 segundos antes de enviar otro mensaje.",
          toolsExecuted: toolResults.length > 0,
          toolResults,
        };
      }

      this.logger.error("Chat error:", error);

      return {
        response:
          "❌ Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.",
        toolsExecuted: toolResults.length > 0,
        toolResults,
      };
    }
  }

  /**
   * Verifica si el servicio está operativo
   */
  isAvailable(): boolean {
    return !!this.model;
  }

  /**
   * Obtiene información del modelo actual
   */
  getModelInfo(): { model: string; toolsCount: number; available: boolean } {
    return {
      model:
        this.configService.get<string>("GEMINI_MODEL") || "gemini-2.0-flash",
      toolsCount: this.functionDeclarations.length,
      available: this.isAvailable(),
    };
  }
}
