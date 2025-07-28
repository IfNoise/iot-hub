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
//import { KeycloakAdminService } from '../../auth/services/keycloak-admin.service.js';
import { User, UserRole } from '@iot-hub/users';
import { TokenPayload } from '@iot-hub/auth';
import { User as DbUser } from '../../users/entities/user.entity.js';

@Injectable()
export class KeycloakOAuth2Middleware implements NestMiddleware {
  private jwks!: ReturnType<typeof createRemoteJWKSet>;
  private issuer!: string;
  private audience?: string;
  private frontEndUrl!: string;
  private realm?: string;
  private isEnabled = false;

  constructor(
    private readonly authConfigService: AuthConfigService,
    private readonly usersService: UsersService,
    //private readonly keycloakAdminService: KeycloakAdminService,
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
    this.frontEndUrl = cfg.frontEndUrl;
    this.realm = cfg.realm;
    const jwksUri = new URL(`${this.issuer}/protocol/openid-connect/certs`);
    this.jwks = createRemoteJWKSet(jwksUri);
    this.isEnabled = true;

    this.logger.debug(
      `KeycloakOAuth2Middleware инициализирован. Issuer: ${this.issuer}`
    );
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!this.isEnabled) {
      const devUser: User = this.createDevUser();
      req.user = devUser;
      this.logger.debug(`Dev mode: ${devUser.email} (${devUser.roles})`);
      return next();
    }

    try {
      const token = this.extractBearerToken(req);
      if (!token) throw new UnauthorizedException('Нет Bearer токена');

      const payload = await this.verifyToken(token);
      const user = this.extractUserFromPayload(payload) as User;
      const enriched = await this.ensureUserExists(user);

      req.user = enriched;
      this.logger.debug(`Аутентификация успешна: ${JSON.stringify(req.user)}`);
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
      issuer: `${this.frontEndUrl}/realms/${this.realm}`,
      audience: this.audience,
    });
    return payload.payload;
  }

  private extractUserFromPayload(payload: JWTPayload): Partial<User> {
    if (!payload.sub || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Невалидный JWT payload');
    }
    let organizationId = '';

    const name =
      (payload.name as string) || (payload.preferred_username as string);

    // Новая схема: role — массив ролей, type — тип пользователя, organization — массив объектов

    const role: UserRole = this.extractUserRole(payload as TokenPayload);

    // organizationId: берем первый id из массива organization

    if (payload.organization && typeof payload.organization === 'object') {
      // Пример: { DDWEED: { id: "uuid" } }
      const orgObjMap = payload.organization as Record<string, { id: string }>;
      const orgKeys = Object.keys(orgObjMap);
      if (orgKeys.length > 0) {
        const orgKey: string = orgKeys[0];
        const orgObj = orgObjMap[orgKey];
        if (
          orgObj &&
          typeof orgObj === 'object' &&
          typeof orgObj.id === 'string'
        ) {
          organizationId = orgObj.id;
        } else {
          this.logger.error(
            `Невалидный organizationId в JWT: ${JSON.stringify(orgObj)}`
          );
          organizationId = '';
          throw new UnauthorizedException('Невалидный organizationId в JWT');
        }
      } else {
        organizationId = '';
      }
    }

    // groups: только uuid-строки (иначе не передавать)
    let groupIds: string[] | undefined = undefined;
    if (Array.isArray(payload.groups)) {
      // uuid v4: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      groupIds = payload.groups.filter(
        (g) =>
          typeof g === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            g
          )
      );
      if (groupIds.length === 0) groupIds = undefined;
    }

    const user: Partial<User> = {
      id: payload.sub, // обязательно для схемы
      userId: payload.sub,
      email: payload.email,
      name,
      avatar: payload.picture as string,
      roles: role ? [role] : [],
      organizationId: organizationId ?? undefined,
      accountType:
        (payload.type as 'individual' | 'organization') || 'individual',
      createdAt: new Date(),
      updatedAt: new Date(),
      balance: 0,
      plan: 'free',
      metadata: {},
    };
    if (groupIds) user.groups = groupIds;
    // planExpiresAt не передавать, если нет даты
    return user;
  }

  private extractUserRole(payload: TokenPayload): UserRole {
    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.role || [];

    if (realmRoles.includes('admin') || clientRoles.includes('admin')) {
      return 'admin';
    }
    return 'personal-user';
  }

  private createDevUser(): User {
    const dev = this.authConfigService.getDevUserConfig();
    return {
      id: 'dev-userId',
      userId: dev.userId,
      email: dev.email,
      name: dev.name,
      avatar: dev.avatar,
      roles: [dev.role],
      accountType: 'individual',
      balance: 0,
      plan: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
      groups: [],
      metadata: {},
      // добавьте другие обязательные поля, если они есть в типе User
    };
  }

  private async ensureUserExists(keycloakUser: User): Promise<User> {
    const logger = this.logger;
    try {
      if (!keycloakUser.userId || !keycloakUser.email) {
        logger.error(
          'Keycloak user не содержит обязательных полей userId или email'
        );
        throw new UnauthorizedException('Невалидный Keycloak user');
      }
      logger.debug(
        `Проверка существования пользователя Keycloak: ${keycloakUser.email}`
      );
      let dbUser = (await this.usersService.findByKeycloakId(
        keycloakUser.userId
      )) as DbUser | null;
      const userDataToUpdate = {
        name: keycloakUser.name,
        avatar: keycloakUser.avatar,
        roles: keycloakUser.roles,
        organizationId: keycloakUser.organizationId ?? undefined,
      };
      if (!dbUser) {
        dbUser = (await this.usersService.findByEmail(
          keycloakUser.email
        )) as DbUser | null;
        if (dbUser) {
          dbUser = (await this.usersService.update(dbUser.id, {
            userId: keycloakUser.userId,
            ...userDataToUpdate,
          })) as DbUser; // Обновляем существующего пользователя
        } else {
          dbUser = await this.usersService.create({
            userId: keycloakUser.userId,
            email: keycloakUser.email,
            ...userDataToUpdate,
            balance: 0,
            plan: 'free',
            accountType: keycloakUser.accountType, // или другой дефолт, если требуется
          });
        }
      } else {
        dbUser = (await this.usersService.update(
          dbUser.id,
          userDataToUpdate
        )) as DbUser; // Обновляем существующего пользователя
      }

      const getDefined = <T>(
        ...values: (T | null | undefined)[]
      ): T | undefined => {
        for (const v of values) {
          if (v !== null && v !== undefined) return v;
        }
        return undefined;
      };

      const avatar = getDefined<string>(dbUser.avatar, keycloakUser.avatar);
      const organizationId = getDefined<string>(
        dbUser.organizationId,
        keycloakUser.organizationId
      );
      let groups = getDefined<unknown>(dbUser.groups, keycloakUser.groups);
      if (groups === null) groups = undefined;
      if (groups !== undefined && !Array.isArray(groups)) groups = undefined;
      let metadata = getDefined<unknown>(
        dbUser.metadata,
        keycloakUser.metadata
      );
      if (metadata === null) metadata = undefined;
      if (
        metadata !== undefined &&
        (typeof metadata !== 'object' || Array.isArray(metadata))
      )
        metadata = undefined;

      const result: Record<string, unknown> = {
        ...keycloakUser,
        userId: dbUser.id,
        balance:
          typeof dbUser.balance === 'string'
            ? Number(dbUser.balance)
            : dbUser.balance,
        plan: dbUser.plan,
        avatar,
        organizationId,
        groups,
        metadata,
      };
      if (dbUser.planExpiresAt instanceof Date) {
        result.planExpiresAt = dbUser.planExpiresAt;
      }
      delete result.keycloakOrganizationId;
      return result as User;
    } catch (err) {
      logger.error(
        err,
        `Ошибка при ensureUserExists для ${keycloakUser.email}`
      );
      return keycloakUser;
    }
  }
  // private async enrichWithOrganizationAndGroups(
  //   user: AuthenticatedUser
  // ): Promise<AuthenticatedUser> {
  //   // Если organizationId и groupIds уже есть — возвращаем как есть
  //   if (user.organizationId ) {
  //     return user;
  //   }
  //   try {
  //     const orgs= this.keycloakAdminService.getUserOrganizations(user.id),
  //     ]);

  //     const groupIds =
  //       groups
  //         .map((g) => g.id)
  //         .filter((id): id is string => typeof id === 'string') || [];
  //     let organizationId: string | undefined = undefined;
  //     if (orgs[0]?.id && typeof orgs[0].id === 'string') {
  //       organizationId = orgs[0].id;
  //     }

  //     return {
  //       ...user,
  //       organizationId,
  //       groupIds,
  //     };
  //   } catch (err) {
  //     this.logger.error({ err }, 'Ошибка при получении орг. и групп');
  //     return user;
  //   }
  // }
}
