/**
 * Auth Controller
 * Endpoints de autenticación para el Gateway
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
  ApiExtraModels,
} from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEmail } from "class-validator";

// ═══════════════════════════════════════════════════════════════════════
// DTOs CON DOCUMENTACIÓN SWAGGER COMPLETA
// ═══════════════════════════════════════════════════════════════════════

/**
 * DTO para iniciar sesión
 */
export class LoginDto {
  @ApiProperty({
    description: "Email del usuario registrado",
    example: "demo@mesaya.com",
    format: "email",
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del usuario",
    example: "demo",
    minLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * DTO para registro de nuevo usuario
 */
export class RegisterDto {
  @ApiProperty({
    description: "Nombre completo del usuario",
    example: "Carlos Mendoza",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Email único del usuario",
    example: "carlos@gmail.com",
    format: "email",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña segura",
    example: "miPassword123",
    minLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Información del usuario autenticado
 */
export class UserInfoDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440003" })
  id: string;

  @ApiProperty({ example: "Demo User" })
  name: string;

  @ApiProperty({ example: "demo@mesaya.com" })
  email: string;
}

/**
 * Respuesta de autenticación exitosa
 */
export class AuthResponseDto {
  @ApiProperty({
    description: "Token JWT para autorización",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Información del usuario autenticado",
    type: UserInfoDto,
  })
  user: UserInfoDto;
}

/**
 * Respuesta de error de autenticación
 */
export class AuthErrorDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: "Credenciales inválidas" })
  message: string;

  @ApiProperty({ example: "Unauthorized" })
  error: string;
}

// Usuarios demo (en producción esto vendría de una base de datos)
const DEMO_USERS = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Juan Pérez",
    email: "juan@mesaya.com",
    password: "password123",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "María García",
    email: "maria@mesaya.com",
    password: "password123",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Demo User",
    email: "demo@mesaya.com",
    password: "demo",
  },
];

@ApiTags("🔐 Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * POST /api/v1/auth/login
   * Autentica un usuario y devuelve JWT
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Iniciar sesión",
    description: `
## Autenticación de Usuario

Valida las credenciales y retorna un token JWT válido por 24 horas.

### Usuarios de Prueba Disponibles:
| Email | Password | Rol |
|-------|----------|-----|
| demo@mesaya.com | demo | Demo User |
| juan@mesaya.com | password123 | Usuario Regular |
| maria@mesaya.com | password123 | Usuario Regular |

### Uso del Token:
1. Copia el \`accessToken\` de la respuesta
2. Click en el botón **Authorize** 🔒 (arriba)
3. Pega el token en el campo
4. Ahora puedes usar endpoints protegidos
    `,
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      demo: {
        summary: "👤 Usuario Demo (recomendado)",
        value: { email: "demo@mesaya.com", password: "demo" },
      },
      juan: {
        summary: "👨 Juan Pérez",
        value: { email: "juan@mesaya.com", password: "password123" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "✅ Login exitoso - Token JWT generado",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "❌ Credenciales inválidas",
    type: AuthErrorDto,
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    // Buscar usuario (en producción, consultar BD)
    const user = DEMO_USERS.find(
      (u) => u.email === dto.email && u.password === dto.password
    );

    if (!user) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // Generar JWT
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * POST /api/v1/auth/register
   * Registra un nuevo usuario (demo - solo en memoria)
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar usuario",
    description:
      "Registra un nuevo usuario (demo - solo persiste en memoria durante la sesión)",
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "Registro exitoso",
    type: AuthResponseDto,
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    // Verificar si el email ya existe
    const existingUser = DEMO_USERS.find((u) => u.email === dto.email);
    if (existingUser) {
      throw new UnauthorizedException("El email ya está registrado");
    }

    // Crear nuevo usuario
    const newUser = {
      id: `550e8400-e29b-41d4-a716-${Date.now()}`,
      name: dto.name,
      email: dto.email,
      password: dto.password,
    };

    DEMO_USERS.push(newUser);

    // Generar JWT
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    };
  }

  /**
   * POST /api/v1/auth/demo-token
   * Genera un token demo sin necesidad de credenciales
   */
  @Post("demo-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Obtener token demo",
    description:
      "Genera un token JWT demo para pruebas rápidas sin necesidad de login",
  })
  @ApiResponse({
    status: 200,
    description: "Token demo generado",
    type: AuthResponseDto,
  })
  async getDemoToken(): Promise<AuthResponseDto> {
    const demoUser = DEMO_USERS[2]; // Demo User

    const payload = {
      sub: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
      },
    };
  }
}
