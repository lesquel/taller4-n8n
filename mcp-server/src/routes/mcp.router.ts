/**
 * JSON-RPC 2.0 Router
 * Maneja las solicitudes JSON-RPC y las enruta a los handlers correspondientes
 */

import { Router, Request, Response } from "express";
import { JsonRpcRequest, JsonRpcResponse, JsonRpcErrorCode } from "../types";
import { ALL_TOOLS, TOOLS_MAP, TOOL_HANDLERS } from "../tools";

const router = Router();

/**
 * Crea una respuesta de error JSON-RPC
 */
function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id || 0,
    error: { code, message, data },
  };
}

/**
 * Crea una respuesta exitosa JSON-RPC
 */
function createSuccessResponse(
  id: string | number,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * Endpoint principal JSON-RPC
 * POST /mcp
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as JsonRpcRequest;

  // Validar estructura JSON-RPC básica
  if (!body || body.jsonrpc !== "2.0" || !body.method) {
    return res.json(
      createErrorResponse(
        body?.id || null,
        JsonRpcErrorCode.INVALID_REQUEST,
        "Invalid JSON-RPC 2.0 request"
      )
    );
  }

  const { id, method, params = {} } = body;

  // Extraer token de autorización del header (si existe)
  const authHeader = req.headers.authorization;
  const authToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : undefined;

  console.log(`[MCP] Received request: ${method}`, {
    id,
    params: JSON.stringify(params).substring(0, 100),
  });

  try {
    // Manejar métodos especiales del protocolo MCP
    switch (method) {
      case "initialize":
        return res.json(
          createSuccessResponse(id, {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "MesaYa MCP Server",
              version: "1.0.0",
            },
            capabilities: {
              tools: {},
            },
          })
        );

      case "tools/list":
        return res.json(
          createSuccessResponse(id, {
            tools: ALL_TOOLS,
          })
        );

      case "tools/call": {
        const toolName = (params as { name: string }).name;
        const toolArgs =
          (params as { arguments?: Record<string, unknown> }).arguments || {};

        if (!TOOLS_MAP[toolName]) {
          return res.json(
            createErrorResponse(
              id,
              JsonRpcErrorCode.METHOD_NOT_FOUND,
              `Tool not found: ${toolName}`
            )
          );
        }

        const handler = TOOL_HANDLERS[toolName];
        if (!handler) {
          return res.json(
            createErrorResponse(
              id,
              JsonRpcErrorCode.INTERNAL_ERROR,
              `Handler not implemented for tool: ${toolName}`
            )
          );
        }

        const result = await handler(toolArgs, authToken);

        return res.json(
          createSuccessResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: !result.success,
          })
        );
      }

      case "ping":
        return res.json(createSuccessResponse(id, { status: "pong" }));

      default:
        // Intentar ejecutar como llamada directa a herramienta (para compatibilidad)
        if (TOOL_HANDLERS[method]) {
          const result = await TOOL_HANDLERS[method](
            params as Record<string, unknown>,
            authToken
          );
          return res.json(createSuccessResponse(id, result));
        }

        return res.json(
          createErrorResponse(
            id,
            JsonRpcErrorCode.METHOD_NOT_FOUND,
            `Method not found: ${method}`
          )
        );
    }
  } catch (error) {
    console.error(`[MCP] Error processing ${method}:`, error);
    return res.json(
      createErrorResponse(
        id,
        JsonRpcErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : "Internal server error"
      )
    );
  }
});

/**
 * GET /mcp/tools
 * Endpoint de conveniencia para listar herramientas (no JSON-RPC)
 */
router.get("/tools", (_req: Request, res: Response) => {
  res.json({
    success: true,
    tools: ALL_TOOLS,
  });
});

/**
 * GET /mcp/health
 * Health check del servidor MCP
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "MesaYa MCP Server",
    timestamp: new Date().toISOString(),
  });
});

export default router;
