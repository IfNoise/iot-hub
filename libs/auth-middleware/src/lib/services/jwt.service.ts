import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { 
  TokenPayloadSchema, 
  BaseUserSchema, 
  type JWTConfig,
  type BaseUser,
} from '../schemas/index.js';

@Injectable()
export class JwtService {
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
    this.jwks = createRemoteJWKSet(new URL(this.config.jwksUri));
  }

  /**
   * Верификация JWT токена
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      return payload;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(`Invalid JWT token: ${errorMessage}`);
    }
  }

  /**
   * Извлечение пользователя из JWT payload
   */
  extractUserFromPayload(payload: JWTPayload): BaseUser {
    try {
      // Валидация payload через Zod схему
      const validatedPayload = TokenPayloadSchema.parse(payload);

      // Извлекаем роли из realm_access или role поля
      const roles = validatedPayload.realm_access?.roles || 
                   validatedPayload.role || 
                   ['personal-user']; // default role

      // Извлекаем organizationId из объекта organization
      let organizationId: string | undefined;
      if (validatedPayload.organization) {
        const orgKeys = Object.keys(validatedPayload.organization);
        if (orgKeys.length > 0) {
          organizationId = validatedPayload.organization[orgKeys[0]].id;
        }
      }

      // Создаем базового пользователя
      const baseUser = {
        id: validatedPayload.sub, // временно используем sub как id
        userId: validatedPayload.sub,
        email: validatedPayload.email,
        name: validatedPayload.preferred_username || validatedPayload.email,
        avatar: undefined, // будет заполнено из базы данных позже
        roles: roles,
        organizationId: organizationId,
        groupIds: validatedPayload.groups || [],
        sessionId: validatedPayload.sid,
        tokenExp: validatedPayload.exp || 0,
        metadata: {
          azp: validatedPayload.azp,
          scope: validatedPayload.scope,
          type: validatedPayload.type,
        },
      };

      // Валидация через Zod схему
      return BaseUserSchema.parse(baseUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(`Invalid token payload: ${errorMessage}`);
    }
  }

  /**
   * Проверка истечения токена
   */
  isTokenExpired(tokenExp: number): boolean {
    return Date.now() >= tokenExp * 1000;
  }
}
