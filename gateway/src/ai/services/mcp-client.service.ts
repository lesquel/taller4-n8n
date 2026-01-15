/**
 * MCP Client Service
 * Cliente para comunicarse con el servidor MCP mediante JSON-RPC 2.0
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface McpToolCallResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError: boolean;
}

@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);
  private readonly mcpServerUrl: string;
  private requestId = 0;

  constructor(private readonly configService: ConfigService) {
    this.mcpServerUrl =
      this.configService.get<string>("MCP_SERVER_URL") ||
      "http://localhost:3005";
    this.logger.log(`MCP Client configured for: ${this.mcpServerUrl}`);
  }

  /**
   * Envía una solicitud JSON-RPC al servidor MCP
   */
  private async sendRequest(
    method: string,
    params?: Record<string, unknown>,
    authToken?: string
  ): Promise<JsonRpcResponse> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(`${this.mcpServerUrl}/mcp`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return (await response.json()) as JsonRpcResponse;
    } catch (error) {
      this.logger.error(`MCP request failed for ${method}:`, error);
      throw error;
    }
  }

  /**
   * Inicializa la conexión con el servidor MCP
   */
  async initialize(): Promise<{
    protocolVersion: string;
    serverInfo: { name: string; version: string };
  }> {
    const response = await this.sendRequest("initialize");

    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    return response.result as {
      protocolVersion: string;
      serverInfo: { name: string; version: string };
    };
  }

  /**
   * Obtiene la lista de herramientas disponibles
   */
  async listTools(): Promise<McpTool[]> {
    const response = await this.sendRequest("tools/list");

    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    const result = response.result as { tools: McpTool[] };
    return result.tools;
  }

  /**
   * Ejecuta una herramienta en el servidor MCP
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    authToken?: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    this.logger.log(
      `Calling MCP tool: ${toolName} with args: ${JSON.stringify(args)}`
    );

    const response = await this.sendRequest(
      "tools/call",
      { name: toolName, arguments: args },
      authToken
    );

    if (response.error) {
      this.logger.error(`Tool call failed: ${response.error.message}`);
      return { success: false, error: response.error.message };
    }

    const result = response.result as McpToolCallResult;

    // Parse el contenido de texto JSON
    try {
      const textContent = result.content.find((c) => c.type === "text");
      if (textContent) {
        const parsed = JSON.parse(textContent.text);
        return parsed;
      }
    } catch {
      this.logger.warn("Could not parse tool result as JSON");
    }

    return {
      success: !result.isError,
      data: result.content,
    };
  }

  /**
   * Verifica la salud del servidor MCP
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/mcp/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Convierte las herramientas MCP al formato de Function Declarations de Gemini
   */
  async getGeminiFunctionDeclarations(): Promise<
    Array<{
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
      };
    }>
  > {
    const tools = await this.listTools();

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: tool.inputSchema.type,
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required,
      },
    }));
  }
}
