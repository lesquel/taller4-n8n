/**
 * Auth Service
 * Servicio de autenticación para el frontend
 */

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = "auth_token";
  private userKey = "auth_user";

  constructor(private http: HttpClient) {
    // Restaurar sesión si existe
    this.loadStoredSession();
  }

  /**
   * Verifica si el usuario está autenticado
   */
  get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Obtiene el usuario actual
   */
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtiene el token almacenado
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Inicia sesión con credenciales
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/api/v1/auth/login`, credentials)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Obtiene un token demo sin credenciales
   */
  getDemoToken(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/api/v1/auth/demo-token`, {})
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  /**
   * Cierra la sesión
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  /**
   * Maneja el éxito de autenticación
   */
  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  /**
   * Carga la sesión almacenada
   */
  private loadStoredSession(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userJson = localStorage.getItem(this.userKey);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
      } catch {
        this.logout();
      }
    }
  }
}
