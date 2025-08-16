import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service.js';
import { AuthenticatedUserSchema, BaseUserSchema, type AuthMiddlewareConfig } from '../schemas/index.js';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private jwtService: JwtService;

  constructor(private readonly config: AuthMiddlewareConfig) {
    this.jwtService = new JwtService(this.config.jwt);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Development mode - использовать mock пользователя
      if (this.config.development?.enabled && this.config.development.mockUser) {
        const mockUser = AuthenticatedUserSchema.parse(this.config.development.mockUser);
        req.user = mockUser;
        return next();
      }

      const token = this.extractBearerToken(req);
      if (!token) {
        throw new UnauthorizedException('No Bearer token provided');
      }

      const payload = await this.jwtService.verifyToken(token);
      const user = this.jwtService.extractUserFromPayload(payload);

      // Проверка истечения токена
      if (this.jwtService.isTokenExpired(user.tokenExp)) {
        throw new UnauthorizedException('Token has expired');
      }

      // Валидация через Zod схему (без permissions, они будут добавлены в RBAC middleware)
      const validatedUser = BaseUserSchema.parse(user);

      // Добавляем базового пользователя с пустыми permissions
      req.user = { ...validatedUser, permissions: [] };
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(`Authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Извлечение Bearer токена из заголовка Authorization
   */
  private extractBearerToken(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (!auth) return null;
    
    const [type, token] = auth.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
