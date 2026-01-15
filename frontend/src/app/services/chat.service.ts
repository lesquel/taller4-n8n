/**
 * Chat Service
 * Servicio para comunicarse con el API de chat del Gateway
 */

import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, BehaviorSubject } from "rxjs";
import { environment } from "../../environments/environment";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolsExecuted?: boolean;
  toolResults?: Array<{
    tool: string;
    success: boolean;
    data?: unknown;
  }>;
}

export interface ChatResponse {
  response: string;
  toolsExecuted: boolean;
  toolResults?: Array<{
    tool: string;
    success: boolean;
    data?: unknown;
  }>;
  sessionId: string;
}

export interface ChatStatus {
  status: string;
  gemini: {
    available: boolean;
    model: string;
    toolsCount: number;
  };
  mcp: {
    healthy: boolean;
  };
  timestamp: string;
}

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  private sessionId: string | null = null;
  private authToken: string | null = null;

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    // Cargar mensajes de localStorage si existen
    this.loadMessages();
  }

  /**
   * Establece el token de autenticación
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem("auth_token", token);
  }

  /**
   * Obtiene el token almacenado
   */
  getAuthToken(): string | null {
    if (!this.authToken) {
      this.authToken = localStorage.getItem("auth_token");
    }
    return this.authToken;
  }

  /**
   * Limpia el token de autenticación
   */
  clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem("auth_token");
  }

  /**
   * Envía un mensaje al asistente de IA
   */
  sendMessage(message: string): Observable<ChatResponse> {
    this.loadingSubject.next(true);

    // Agregar mensaje del usuario a la lista
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    this.addMessage(userMessage);

    // Preparar historial para el API
    const history = this.messagesSubject.value
      .slice(0, -1) // Excluir el último mensaje que acabamos de agregar
      .map((m) => ({ role: m.role, content: m.content }));

    const headers = this.getHeaders();
    const body = {
      message,
      history,
      sessionId: this.sessionId,
    };

    return new Observable((observer) => {
      this.http
        .post<ChatResponse>(`${this.apiUrl}/api/v1/chat`, body, { headers })
        .subscribe({
          next: (response) => {
            this.sessionId = response.sessionId;

            // Agregar respuesta del asistente
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: response.response,
              timestamp: new Date(),
              toolsExecuted: response.toolsExecuted,
              toolResults: response.toolResults,
            };
            this.addMessage(assistantMessage);

            this.loadingSubject.next(false);
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            this.loadingSubject.next(false);

            // Agregar mensaje de error
            const errorMessage: ChatMessage = {
              role: "assistant",
              content:
                "❌ Error de conexión. Por favor, verifica que el servidor esté activo.",
              timestamp: new Date(),
            };
            this.addMessage(errorMessage);

            observer.error(error);
          },
        });
    });
  }

  /**
   * Obtiene el estado del servicio de chat
   */
  getStatus(): Observable<ChatStatus> {
    return this.http.get<ChatStatus>(`${this.apiUrl}/api/v1/chat/status`);
  }

  /**
   * Limpia el historial de chat
   */
  clearHistory(): void {
    this.messagesSubject.next([]);
    this.sessionId = null;
    localStorage.removeItem("chat_messages");

    // Agregar mensaje de bienvenida
    this.addWelcomeMessage();
  }

  /**
   * Agrega un mensaje a la lista
   */
  private addMessage(message: ChatMessage): void {
    const messages = [...this.messagesSubject.value, message];
    this.messagesSubject.next(messages);
    this.saveMessages();
  }

  /**
   * Guarda mensajes en localStorage
   */
  private saveMessages(): void {
    const messages = this.messagesSubject.value;
    localStorage.setItem("chat_messages", JSON.stringify(messages));
  }

  /**
   * Carga mensajes de localStorage
   */
  private loadMessages(): void {
    const saved = localStorage.getItem("chat_messages");
    if (saved) {
      try {
        const messages = JSON.parse(saved).map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        this.messagesSubject.next(messages);
      } catch {
        this.addWelcomeMessage();
      }
    } else {
      this.addWelcomeMessage();
    }
  }

  /**
   * Agrega mensaje de bienvenida
   */
  private addWelcomeMessage(): void {
    const welcome: ChatMessage = {
      role: "assistant",
      content: `¡Hola! 👋 Soy el asistente de **MesaYa**.

Puedo ayudarte a:
- 🔍 Buscar mesas disponibles
- 📅 Verificar disponibilidad para fechas específicas
- ✅ Hacer reservas

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
    };
    this.addMessage(welcome);
  }

  /**
   * Obtiene headers con autenticación
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      "Content-Type": "application/json",
    });

    const token = this.getAuthToken();
    if (token) {
      headers = headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }
}
