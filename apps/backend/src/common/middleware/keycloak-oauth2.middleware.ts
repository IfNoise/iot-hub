// src/common/middleware/keycloak-oauth2.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { AuthConfigService } from '../../auth/config/auth-config.service.js';
import { UsersService } from '../../users/users.service.js';
import {
  KeycloakJwtPayload,
  AuthenticatedUser,
} from '../types/keycloak-user.interface.js';

@Injectable()
export class KeycloakOAuth2Middleware implements NestMiddleware {
  private jwks!: ReturnType<typeof createRemoteJWKSet>;
  private issuer!: string;
  private audience?: string;
  private isEnabled = false;

  constructor(
    private readonly authConfigService: AuthConfigService,
    private readonly usersService: UsersService,
    @InjectPinoLogger(KeycloakOAuth2Middleware.name)
    private readonly logger: PinoLogger
  ) {
    const cfg = this.authConfigService.getKeycloakConfig();

    if (!cfg.url || !cfg.realm) {
      this.logger.warn('Keycloak не настроен, middleware отключен.');
      return;
    }

    this.issuer = `${cfg.url}/realms/${cfg.realm}`;
    this.audience = cfg.clientId;
    const jwksUri = new URL(`${this.issuer}/protocol/openid-connect/certs`);
    this.jwks = createRemoteJWKSet(jwksUri);
    this.isEnabled = true;

    this.logger.debug(
      `KeycloakOAuth2Middleware инициализирован. Issuer: ${this.issuer}`
    );
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!this.isEnabled) {
      const devUser: AuthenticatedUser = this.createDevUser();
      req.user = devUser;
      this.logger.debug(`Dev mode: ${devUser.email} (${devUser.role})`);
      return next();
    }

    try {
      const token = this.extractBearerToken(req);
      if (!token) throw new UnauthorizedException('Нет Bearer токена');

      const payload = await this.verifyToken(token);
      const user = this.extractUserFromPayload(payload);
      const enriched = await this.ensureUserExists(user);

      req.user = enriched;
      this.logger.debug(
        `Аутентификация успешна: ${enriched.email} (${enriched.id})`
      );
      return next();
    } catch (err) {
      this.logger.error({ err }, 'Ошибка аутентификации');
      throw new UnauthorizedException('Ошибка аутентификации');
    }
  }

  private extractBearerToken(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' && token ? token : null;
  }

  private async verifyToken(token: string): Promise<JWTPayload> {
    const payload = await jwtVerify(token, this.jwks, {
      //TODO :  Косяк с iss
      issuer: 'http://localhost:8080/realms/iot-hub',
      audience: this.audience,
    });
    return payload.payload;
  }

  private extractUserFromPayload(payload: JWTPayload): AuthenticatedUser {
    if (!payload.sub || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Невалидный JWT payload');
    }

    const name =
      (payload.name as string) ||
      (payload.preferred_username as string) ||
      (payload.email as string).split('@')[0];

    const role = this.extractUserRole(payload as KeycloakJwtPayload);

    return {
      id: payload.sub,
      email: payload.email,
      name,
      avatar: payload.picture as string,
      role,
      isEmailVerified:
        typeof payload.email_verified === 'boolean'
          ? payload.email_verified
          : false,
      sessionState: payload.session_state as string,
    };
  }

  private extractUserRole(payload: KeycloakJwtPayload): 'admin' | 'user' {
    const cfg = this.authConfigService.getKeycloakConfig();

    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles =
      payload.resource_access?.[cfg.clientId || '']?.roles || [];

    if (realmRoles.includes('admin') || clientRoles.includes('admin')) {
      return 'admin';
    }
    return 'user';
  }

  private createDevUser(): AuthenticatedUser {
    const dev = this.authConfigService.getDevUserConfig();
    return {
      id: dev.id,
      email: dev.email,
      name: dev.name,
      avatar: dev.avatar,
      role: dev.role,
      isEmailVerified: dev.emailVerified,
      sessionState: 'dev-session',
    };
  }

  private async ensureUserExists(
    keycloakUser: AuthenticatedUser
  ): Promise<AuthenticatedUser> {
    const logger = this.logger;
    try {
      let dbUser = await this.usersService.findByKeycloakId(keycloakUser.id);
      if (!dbUser) {
        dbUser = await this.usersService.findByEmail(keycloakUser.email);
        if (dbUser) {
          dbUser = await this.usersService.update(dbUser.id, {
            userId: keycloakUser.id,
            name: keycloakUser.name,
            avatar: keycloakUser.avatar,
            role: keycloakUser.role,
          });
        } else {
          dbUser = await this.usersService.create({
            userId: keycloakUser.id,
            email: keycloakUser.email,
            name: keycloakUser.name,
            avatar: keycloakUser.avatar,
            role: keycloakUser.role,
            balance: 0,
            plan: 'free',
            userType: 'individual',
          });
        }
      } else {
        dbUser = await this.usersService.update(dbUser.id, {
          name: keycloakUser.name,
          avatar: keycloakUser.avatar,
          role: keycloakUser.role,
        });
      }

      return {
        ...keycloakUser,
        databaseId: dbUser.id,
        balance: dbUser.balance,
        plan: dbUser.plan,
        planExpiresAt: dbUser.planExpiresAt,
      };
    } catch (err) {
      logger.error(
        err,
        `Ошибка при ensureUserExists для ${keycloakUser.email}`
      );
      return keycloakUser;
    }
  }
}
