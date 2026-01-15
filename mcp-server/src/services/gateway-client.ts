/**
 * Gateway Client Service
 * Cliente HTTP para comunicarse con el Gateway de MesaYa
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Table, Reservation } from "../types";

export class GatewayClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(gatewayUrl: string) {
    this.baseUrl = gatewayUrl;
    this.client = axios.create({
      baseURL: `${gatewayUrl}/api/v1`,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Configura el token JWT para las peticiones autenticadas
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Limpia el token de autenticación
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common["Authorization"];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Tables Endpoints
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene todas las mesas
   */
  async getAllTables(): Promise<Table[]> {
    try {
      const response = await this.client.get<Table[]>("/tables");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Error al obtener mesas");
    }
  }

  /**
   * Obtiene una mesa por ID
   */
  async getTableById(tableId: string): Promise<Table> {
    try {
      const response = await this.client.get<Table>(`/tables/${tableId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Error al obtener mesa ${tableId}`);
    }
  }

  /**
   * Obtiene mesas por sección
   */
  async getTablesBySection(section: string): Promise<Table[]> {
    try {
      const response = await this.client.get<Table[]>(
        `/tables/section/${section}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(
        error,
        `Error al obtener mesas de sección ${section}`
      );
    }
  }

  /**
   * Busca mesas según criterios
   */
  async searchTables(params: {
    capacidad?: number;
    seccion?: string;
  }): Promise<Table[]> {
    try {
      let tables: Table[];

      if (params.seccion) {
        tables = await this.getTablesBySection(params.seccion);
      } else {
        tables = await this.getAllTables();
      }

      // Filtrar por capacidad si se especifica
      if (params.capacidad) {
        tables = tables.filter((t) => t.capacity >= params.capacidad!);
      }

      return tables;
    } catch (error) {
      throw this.handleError(error, "Error al buscar mesas");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Reservations Endpoints
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Crea una nueva reserva (requiere JWT)
   */
  async createReservation(
    data: {
      tableId: string;
      restaurantId: string;
      reservationDate: string;
      reservationTime: string;
      numberOfGuests: number;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    },
    idempotencyKey: string,
    authToken?: string
  ): Promise<Reservation> {
    try {
      const headers: Record<string, string> = {};

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await this.client.post<Reservation>(
        "/reservations",
        {
          ...data,
          idempotencyKey,
        },
        { headers }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Error al crear reserva");
    }
  }

  /**
   * Obtiene reservas por mesa y fecha (para validar disponibilidad)
   * Nota: Este endpoint puede no existir, se simula la lógica
   */
  async checkAvailability(
    tableId: string,
    fecha: string,
    hora?: string
  ): Promise<{ available: boolean; conflictingReservations: Reservation[] }> {
    try {
      // Intentar obtener reservas existentes
      // Si el endpoint no existe, asumimos disponible
      const response = await this.client.get<Reservation[]>(
        `/reservations/table/${tableId}`,
        { params: { date: fecha } }
      );

      const reservations = response.data || [];

      // Filtrar por hora si se especifica
      let conflicting = reservations;
      if (hora) {
        conflicting = reservations.filter((r) => {
          const reservationHour = r.reservationTime.substring(0, 5);
          return Math.abs(this.hourDiff(reservationHour, hora)) < 2; // 2 horas de margen
        });
      }

      return {
        available: conflicting.length === 0,
        conflictingReservations: conflicting,
      };
    } catch (error) {
      // Si el endpoint no existe, asumimos disponible
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { available: true, conflictingReservations: [] };
      }
      throw this.handleError(error, "Error al verificar disponibilidad");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════════════════

  private hourDiff(time1: string, time2: string): number {
    const [h1, m1] = time1.split(":").map(Number);
    const [h2, m2] = time2.split(":").map(Number);
    return Math.abs(h1 * 60 + m1 - (h2 * 60 + m2)) / 60;
  }

  private handleError(error: unknown, context: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message;
      const status = axiosError.response?.status;
      return new Error(`${context}: ${message} (HTTP ${status || "N/A"})`);
    }
    return new Error(`${context}: ${String(error)}`);
  }
}

// Singleton para uso global
let gatewayClientInstance: GatewayClient | null = null;

export function getGatewayClient(gatewayUrl?: string): GatewayClient {
  if (!gatewayClientInstance && gatewayUrl) {
    gatewayClientInstance = new GatewayClient(gatewayUrl);
  }
  if (!gatewayClientInstance) {
    throw new Error("GatewayClient no inicializado. Proporcione gatewayUrl.");
  }
  return gatewayClientInstance;
}
