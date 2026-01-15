/**
 * Chat Component
 * Componente principal del chat con el asistente de IA
 */

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { ChatService, ChatMessage } from "../../services/chat.service";
import { AuthService, User } from "../../services/auth.service";

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./chat.component.html",
  styleUrl: "./chat.component.css",
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild("messagesContainer") private messagesContainer!: ElementRef;
  @ViewChild("messageInput") private messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = "";
  isLoading = false;
  isConnected = false;

  // Auth state
  currentUser: User | null = null;
  showLoginForm = false;
  loginEmail = "";
  loginPassword = "";
  loginError = "";
  isLoggingIn = false;

  private subscriptions = new Subscription();
  private shouldScrollToBottom = true;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Suscribirse a mensajes
    this.subscriptions.add(
      this.chatService.messages$.subscribe((messages) => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      })
    );

    // Suscribirse a estado de carga
    this.subscriptions.add(
      this.chatService.loading$.subscribe((loading) => {
        this.isLoading = loading;
      })
    );

    // Suscribirse al usuario actual
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        if (user) {
          // Actualizar token en el servicio de chat
          const token = this.authService.getToken();
          if (token) {
            this.chatService.setAuthToken(token);
          }
        }
      })
    );

    // Verificar estado del servidor
    this.checkConnection();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Verifica la conexión con el servidor
   */
  checkConnection(): void {
    this.chatService.getStatus().subscribe({
      next: (status) => {
        this.isConnected =
          status.status === "operational" || status.status === "degraded";
      },
      error: () => {
        this.isConnected = false;
      },
    });
  }

  /**
   * Envía un mensaje al asistente
   */
  sendMessage(): void {
    const message = this.newMessage.trim();
    if (!message || this.isLoading) return;

    this.newMessage = "";
    this.chatService.sendMessage(message).subscribe({
      error: (err) => console.error("Error sending message:", err),
    });

    // Mantener focus en el input
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }

  /**
   * Maneja tecla Enter para enviar
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Limpia el historial de chat
   */
  clearChat(): void {
    if (confirm("¿Estás seguro de que deseas borrar el historial de chat?")) {
      this.chatService.clearHistory();
    }
  }

  /**
   * Muestra/oculta el formulario de login
   */
  toggleLoginForm(): void {
    this.showLoginForm = !this.showLoginForm;
    this.loginError = "";
  }

  /**
   * Inicia sesión con credenciales
   */
  login(): void {
    if (!this.loginEmail || !this.loginPassword) {
      this.loginError = "Por favor, ingresa email y contraseña";
      return;
    }

    this.isLoggingIn = true;
    this.loginError = "";

    this.authService
      .login({
        email: this.loginEmail,
        password: this.loginPassword,
      })
      .subscribe({
        next: () => {
          this.showLoginForm = false;
          this.loginEmail = "";
          this.loginPassword = "";
          this.isLoggingIn = false;
        },
        error: (err) => {
          this.loginError = err.error?.message || "Error al iniciar sesión";
          this.isLoggingIn = false;
        },
      });
  }

  /**
   * Inicia sesión con cuenta demo
   */
  loginDemo(): void {
    this.isLoggingIn = true;
    this.loginError = "";

    this.authService.getDemoToken().subscribe({
      next: () => {
        this.showLoginForm = false;
        this.isLoggingIn = false;
      },
      error: (err) => {
        this.loginError = err.error?.message || "Error al obtener token demo";
        this.isLoggingIn = false;
      },
    });
  }

  /**
   * Cierra la sesión
   */
  logout(): void {
    this.authService.logout();
    this.chatService.clearAuthToken();
  }

  /**
   * Hace scroll al final de los mensajes
   */
  private scrollToBottom(): void {
    try {
      const element = this.messagesContainer?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error("Error scrolling:", err);
    }
  }

  /**
   * Formatea el timestamp de un mensaje
   */
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Procesa el contenido Markdown básico
   */
  formatContent(content: string): string {
    // Convertir **texto** a <strong>texto</strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Convertir saltos de línea a <br>
    formatted = formatted.replace(/\n/g, "<br>");

    // Convertir listas con - a elementos de lista
    formatted = formatted.replace(/^- (.+)$/gm, "• $1");

    return formatted;
  }
}
