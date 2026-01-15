/**
 * MCP Tools Definitions
 * Define las herramientas disponibles para el protocolo MCP
 * Estas herramientas serán expuestas a Gemini para Function Calling
 */

import { McpTool } from "../types";

/**
 * Tool: search_tables
 * Busca mesas disponibles según criterios
 */
export const searchTablesTool: McpTool = {
  name: "search_tables",
  description:
    "Busca mesas disponibles en el restaurante. Puede filtrar por capacidad (número de personas) y/o sección del restaurante.",
  inputSchema: {
    type: "object",
    properties: {
      capacidad: {
        type: "number",
        description: "Número mínimo de personas que debe acomodar la mesa",
      },
      seccion: {
        type: "string",
        description:
          "Sección del restaurante donde buscar (ej: terraza, interior, vip)",
      },
    },
    required: [],
  },
};

/**
 * Tool: validate_availability
 * Verifica si una mesa está disponible para una fecha/hora específica
 */
export const validateAvailabilityTool: McpTool = {
  name: "validate_availability",
  description:
    "Verifica si una mesa específica está disponible para una fecha y hora determinada. Consulta las reservas existentes para detectar conflictos.",
  inputSchema: {
    type: "object",
    properties: {
      tableId: {
        type: "string",
        description: "ID único de la mesa a verificar (UUID)",
      },
      fecha: {
        type: "string",
        description: "Fecha de la reserva en formato YYYY-MM-DD",
      },
      hora: {
        type: "string",
        description: "Hora de la reserva en formato HH:mm (24 horas)",
      },
    },
    required: ["tableId", "fecha"],
  },
};

/**
 * Tool: create_reservation
 * Crea una nueva reserva en el sistema
 */
export const createReservationTool: McpTool = {
  name: "create_reservation",
  description:
    "Crea una nueva reserva para una mesa específica. Requiere autenticación JWT. La reserva pasa por validación de idempotencia con Redis.",
  inputSchema: {
    type: "object",
    properties: {
      tableId: {
        type: "string",
        description: "ID único de la mesa a reservar (UUID)",
      },
      restaurantId: {
        type: "string",
        description: "ID del restaurante (UUID)",
      },
      fecha: {
        type: "string",
        description: "Fecha de la reserva en formato YYYY-MM-DD",
      },
      hora: {
        type: "string",
        description: "Hora de la reserva en formato HH:mm (24 horas)",
      },
      numberOfGuests: {
        type: "number",
        description: "Número de personas para la reserva",
      },
      customerName: {
        type: "string",
        description: "Nombre del cliente (opcional)",
      },
      customerEmail: {
        type: "string",
        description: "Email del cliente (opcional)",
      },
      customerPhone: {
        type: "string",
        description: "Teléfono del cliente (opcional)",
      },
    },
    required: ["tableId", "restaurantId", "fecha", "hora", "numberOfGuests"],
  },
};

/**
 * Tool: get_table_info
 * Obtiene información detallada de una mesa específica
 */
export const getTableInfoTool: McpTool = {
  name: "get_table_info",
  description:
    "Obtiene información detallada de una mesa específica incluyendo su capacidad, sección y estado actual.",
  inputSchema: {
    type: "object",
    properties: {
      tableId: {
        type: "string",
        description: "ID único de la mesa (UUID)",
      },
    },
    required: ["tableId"],
  },
};

/**
 * Tool: list_sections
 * Lista las secciones disponibles en el restaurante
 */
export const listSectionsTool: McpTool = {
  name: "list_sections",
  description:
    "Lista todas las secciones disponibles en el restaurante para ayudar al usuario a elegir ubicación.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Export all tools
// ════════════════════════════════════════════════════════════════════════════

export const ALL_TOOLS: McpTool[] = [
  searchTablesTool,
  validateAvailabilityTool,
  createReservationTool,
  getTableInfoTool,
  listSectionsTool,
];

export const TOOLS_MAP: Record<string, McpTool> = {
  search_tables: searchTablesTool,
  validate_availability: validateAvailabilityTool,
  create_reservation: createReservationTool,
  get_table_info: getTableInfoTool,
  list_sections: listSectionsTool,
};
