/**
 * Tool Handlers
 * Implementación de la lógica de cada herramienta MCP
 */

import { v4 as uuidv4 } from "uuid";
import { getGatewayClient } from "../services/gateway-client";
import {
  McpToolResult,
  SearchTablesInput,
  ValidateAvailabilityInput,
  CreateReservationInput,
} from "../types";

/**
 * Handler para search_tables
 * Busca mesas según criterios de capacidad y sección
 */
export async function handleSearchTables(
  params: SearchTablesInput
): Promise<McpToolResult> {
  try {
    const client = getGatewayClient();
    const tables = await client.searchTables({
      capacidad: params.capacidad,
      seccion: params.seccion,
    });

    if (tables.length === 0) {
      return {
        success: true,
        data: {
          message: "No se encontraron mesas con los criterios especificados.",
          tables: [],
          count: 0,
        },
      };
    }

    // Formatear respuesta amigable para la IA
    const formattedTables = tables.map((t) => ({
      id: t.id,
      numero: t.number,
      capacidad: t.capacity,
      seccion: t.section,
      estado:
        t.status === "available"
          ? "Disponible"
          : t.status === "occupied"
          ? "Ocupada"
          : "Reservada",
    }));

    return {
      success: true,
      data: {
        message: `Se encontraron ${tables.length} mesa(s) disponibles.`,
        tables: formattedTables,
        count: tables.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al buscar mesas",
    };
  }
}

/**
 * Handler para validate_availability
 * Verifica disponibilidad de una mesa para fecha/hora específica
 */
export async function handleValidateAvailability(
  params: ValidateAvailabilityInput
): Promise<McpToolResult> {
  try {
    const client = getGatewayClient();

    // Primero verificar que la mesa existe
    const table = await client.getTableById(params.tableId);

    // Luego verificar disponibilidad
    const availability = await client.checkAvailability(
      params.tableId,
      params.fecha,
      params.hora
    );

    if (availability.available) {
      return {
        success: true,
        data: {
          available: true,
          message: `La mesa #${table.number} (${
            table.section
          }) está disponible para el ${params.fecha}${
            params.hora ? ` a las ${params.hora}` : ""
          }.`,
          table: {
            id: table.id,
            numero: table.number,
            capacidad: table.capacity,
            seccion: table.section,
          },
        },
      };
    } else {
      return {
        success: true,
        data: {
          available: false,
          message: `La mesa #${table.number} NO está disponible para esa fecha/hora. Ya tiene ${availability.conflictingReservations.length} reserva(s) conflictiva(s).`,
          conflictos: availability.conflictingReservations.map((r) => ({
            fecha: r.reservationDate,
            hora: r.reservationTime,
            personas: r.numberOfGuests,
          })),
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al validar disponibilidad",
    };
  }
}

/**
 * Handler para create_reservation
 * Crea una nueva reserva (requiere JWT)
 */
export async function handleCreateReservation(
  params: CreateReservationInput,
  authToken?: string
): Promise<McpToolResult> {
  try {
    if (!authToken) {
      return {
        success: false,
        error:
          "Se requiere autenticación (JWT) para crear reservas. Por favor, inicia sesión primero.",
      };
    }

    const client = getGatewayClient();

    // Generar clave de idempotencia única
    const idempotencyKey = uuidv4();

    // Construir fecha/hora en formato ISO
    const reservationTime = new Date(
      `${params.fecha}T${params.hora}:00`
    ).toISOString();

    const reservation = await client.createReservation(
      {
        tableId: params.tableId,
        restaurantId: params.restaurantId,
        reservationDate: params.fecha,
        reservationTime: reservationTime,
        numberOfGuests: params.numberOfGuests,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
      },
      idempotencyKey,
      authToken
    );

    return {
      success: true,
      data: {
        message: "¡Reserva creada exitosamente!",
        reservation: {
          id: reservation.id,
          mesa: params.tableId,
          fecha: params.fecha,
          hora: params.hora,
          personas: params.numberOfGuests,
          estado: reservation.status,
        },
        idempotencyKey,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al crear la reserva",
    };
  }
}

/**
 * Handler para get_table_info
 * Obtiene información detallada de una mesa
 */
export async function handleGetTableInfo(params: {
  tableId: string;
}): Promise<McpToolResult> {
  try {
    const client = getGatewayClient();
    const table = await client.getTableById(params.tableId);

    return {
      success: true,
      data: {
        message: `Información de la mesa #${table.number}`,
        table: {
          id: table.id,
          numero: table.number,
          capacidad: table.capacity,
          seccion: table.section,
          estado:
            table.status === "available"
              ? "Disponible"
              : table.status === "occupied"
              ? "Ocupada"
              : "Reservada",
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener información de la mesa",
    };
  }
}

/**
 * Handler para list_sections
 * Lista las secciones únicas del restaurante
 */
export async function handleListSections(): Promise<McpToolResult> {
  try {
    const client = getGatewayClient();
    const tables = await client.getAllTables();

    // Extraer secciones únicas
    const sections = [...new Set(tables.map((t) => t.section))];

    // Contar mesas por sección
    const sectionInfo = sections.map((section) => {
      const sectionTables = tables.filter((t) => t.section === section);
      return {
        nombre: section,
        totalMesas: sectionTables.length,
        mesasDisponibles: sectionTables.filter((t) => t.status === "available")
          .length,
      };
    });

    return {
      success: true,
      data: {
        message: `El restaurante tiene ${sections.length} secciones.`,
        sections: sectionInfo,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al listar secciones",
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Handler Registry
// ════════════════════════════════════════════════════════════════════════════

export type ToolHandler = (
  params: Record<string, unknown>,
  authToken?: string
) => Promise<McpToolResult>;

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_tables: (params) =>
    handleSearchTables(params as unknown as SearchTablesInput),
  validate_availability: (params) =>
    handleValidateAvailability(params as unknown as ValidateAvailabilityInput),
  create_reservation: (params, authToken) =>
    handleCreateReservation(
      params as unknown as CreateReservationInput,
      authToken
    ),
  get_table_info: (params) =>
    handleGetTableInfo(params as unknown as { tableId: string }),
  list_sections: () => handleListSections(),
};
