/**
 * Estrategia de autenticación JWT
 */

import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

export interface JwtPayload {
  sub?: string;
  userId?: string;
  email: string;
  roles?: string[];
  role?: string;
}

export interface ValidatedUser {
  userId: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET is missing");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Valida el payload del JWT y retorna el usuario validado.
   * El Gateway confía en el token y extrae userId para enviarlo
   * a los microservicios vía RabbitMQ.
   * Soporta tanto 'sub' (estándar JWT) como 'userId' (legacy)
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    // Soportar ambos formatos: 'sub' (estándar) y 'userId' (legacy)
    const userId = payload.sub || payload.userId;
    if (!userId) {
      throw new Error("JWT must contain sub or userId");
    }

    // Soportar 'roles' (array) o 'role' (string)
    const roles = payload.roles || (payload.role ? [payload.role] : []);

    return {
      userId,
      email: payload.email,
      roles,
    };
  }
}
