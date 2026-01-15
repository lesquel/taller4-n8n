/**
 * MCP Server - Tools Type Definitions
 * Define las interfaces para las herramientas del protocolo MCP
 */

// ════════════════════════════════════════════════════════════════════════════
// JSON-RPC 2.0 Types
// ════════════════════════════════════════════════════════════════════════════

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Error codes estándar JSON-RPC
export enum JsonRpcErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
}

// ════════════════════════════════════════════════════════════════════════════
// MCP Tool Definitions
// ════════════════════════════════════════════════════════════════════════════

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Tool-Specific Input Types
// ════════════════════════════════════════════════════════════════════════════

export interface SearchTablesInput {
  capacidad?: number;
  seccion?: string;
}

export interface ValidateAvailabilityInput {
  tableId: string;
  fecha: string;
  hora?: string;
}

export interface CreateReservationInput {
  tableId: string;
  userId: string;
  restaurantId: string;
  fecha: string;
  hora: string;
  numberOfGuests: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Gateway API Response Types
// ════════════════════════════════════════════════════════════════════════════

export interface Table {
  id: string;
  number: number;
  capacity: number;
  section: string;
  status: "available" | "occupied" | "reserved";
  restaurantId: string;
}

export interface Reservation {
  id: string;
  tableId: string;
  userId: string;
  restaurantId: string;
  reservationDate: string;
  reservationTime: string;
  numberOfGuests: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MCP Server Configuration
// ════════════════════════════════════════════════════════════════════════════

export interface McpServerConfig {
  port: number;
  gatewayUrl: string;
  corsOrigins: string[];
}
