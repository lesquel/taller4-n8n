/**
 * MCP Server - Entry Point
 * Servidor Express que implementa el protocolo MCP (Model Context Protocol)
 * para MesaYa - Sistema de Reservas de Restaurantes
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mcpRouter from "./routes/mcp.router";
import { getGatewayClient } from "./services/gateway-client";

// Cargar variables de entorno
dotenv.config(); // Intenta cargar .env local
dotenv.config({ path: "../.env" }); // Fallback al .env raíz si hace falta

const app: Express = express();
const PORT = process.env.MCP_SERVER_PORT || 3005;
const GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  process.env.GATEWAY_URL ||
  "http://localhost:3000";

// ════════════════════════════════════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════════════════════════════════════

// CORS - Permitir orígenes del frontend y gateway
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Gateway
      "http://localhost:4200", // Angular dev
      "http://localhost:80", // Frontend Docker
      "http://gateway:3000", // Gateway Docker
      "*", // Allow all for development
    ],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ════════════════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════════════════

// Health check principal
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "MesaYa MCP Server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    gatewayUrl: GATEWAY_URL,
  });
});

// MCP Router (JSON-RPC endpoint)
app.use("/mcp", mcpRouter);

// Root info
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "MesaYa MCP Server",
    description: "Model Context Protocol Server para sistema de reservas",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      mcpJsonRpc: "POST /mcp",
      mcpTools: "GET /mcp/tools",
      mcpHealth: "GET /mcp/health",
    },
    documentation: {
      protocol: "JSON-RPC 2.0",
      mcpVersion: "2024-11-05",
      tools: [
        "search_tables",
        "validate_availability",
        "create_reservation",
        "get_table_info",
        "list_sections",
      ],
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Error Handling
// ════════════════════════════════════════════════════════════════════════════

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message:
      "El endpoint solicitado no existe. Consulte GET / para la documentación.",
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[MCP Server Error]", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Error interno del servidor",
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Server Startup
// ════════════════════════════════════════════════════════════════════════════

async function bootstrap() {
  try {
    // Inicializar cliente del Gateway
    console.log(`[MCP] Configurando Gateway Client: ${GATEWAY_URL}`);
    getGatewayClient(GATEWAY_URL);

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log("═".repeat(60));
      console.log("   MesaYa MCP Server");
      console.log("═".repeat(60));
      console.log(`   🚀 Server running on port ${PORT}`);
      console.log(`   🔗 Gateway URL: ${GATEWAY_URL}`);
      console.log(`   📡 JSON-RPC endpoint: POST /mcp`);
      console.log(`   🛠️  Tools endpoint: GET /mcp/tools`);
      console.log("═".repeat(60));
    });
  } catch (error) {
    console.error("[MCP] Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
