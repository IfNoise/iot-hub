// src/common/middleware/keycloak-oauth2.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ConfigService } from '../../config/config.service.js';
import { UsersService } from '../../users/users.service.js';
import {
  KeycloakJwtPayload,
  AuthenticatedUser,
  OAuth2ProxyHeaders,
} from '../types/keycloak-user.interface.js';

@Injectable()
export class KeycloakOAuth2Middleware implements NestMiddleware {
  private readonly logger = new Logger(KeycloakOAuth2Middleware.name);
  private jwksClient?: jwksClient.JwksClient;
  private isKeycloakEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');

    // Если Keycloak не настроен, выводим предупреждение и отключаем middleware
    if (
      !keycloakUrl ||
      !realm ||
      keycloakUrl.trim() === '' ||
      realm.trim() === ''
    ) {
      this.logger.warn(
        'Keycloak не настроен. Middleware отключен. Установите KEYCLOAK_URL и KEYCLOAK_REALM для включения.'
      );
      this.isKeycloakEnabled = false;
      return;
    }

    this.isKeycloakEnabled = true;
    this.jwksClient = jwksClient({
      jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxAge: 12 * 60 * 60 * 1000, // 12 hours
    });
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Если Keycloak отключен, создаем заглушку для разработки
    if (!this.isKeycloakEnabled) {
      this.logger.debug(
        'Keycloak отключен, используем заглушку для разработки'
      );

      // Создаем тестового пользователя для разработки с возможностью настройки
      const devUser: AuthenticatedUser = this.createDevUser();

      req.user = devUser;
      this.logger.debug(
        `Использована заглушка пользователя: ${devUser.email} (роль: ${devUser.role})`
      );

      next();
      return;
    }

    try {
      // Проверяем наличие токена в заголовке Authorization
      const authToken = this.extractBearerToken(req);

      // Проверяем заголовки OAuth2 Proxy
      const proxyHeaders = this.extractOAuth2ProxyHeaders(req);

      if (!authToken && !proxyHeaders.accessToken) {
        throw new UnauthorizedException('Токен аутентификации не найден');
      }

      // Используем токен из заголовка Authorization или из OAuth2 Proxy
      const token = authToken || (proxyHeaders.accessToken as string);

      // Верифицируем и декодируем JWT токен
      const user = await this.verifyAndExtractUser(token, proxyHeaders);

      // Создаем или обновляем пользователя в базе данных
      const enrichedUser = await this.ensureUserExists(user);

      // Добавляем пользователя в request
      req.user = enrichedUser;

      this.logger.debug(
        `Пользователь аутентифицирован: ${enrichedUser.email} (${enrichedUser.id})`
      );

      next();
    } catch (error) {
      this.logger.error('Ошибка аутентификации:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Недействительный токен аутентификации');
    }
  }

  /**
   * Извлекает Bearer токен из заголовка Authorization
   */
  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }

  /**
   * Извлекает заголовки OAuth2 Proxy
   */
  private extractOAuth2ProxyHeaders(request: Request): OAuth2ProxyHeaders {
    const userHeader = this.configService.get('OAUTH2_PROXY_USER_HEADER');
    const emailHeader = this.configService.get('OAUTH2_PROXY_EMAIL_HEADER');
    const usernameHeader = this.configService.get(
      'OAUTH2_PROXY_PREFERRED_USERNAME_HEADER'
    );
    const tokenHeader = this.configService.get(
      'OAUTH2_PROXY_ACCESS_TOKEN_HEADER'
    );

    return {
      user: request.headers[userHeader.toLowerCase()] as string,
      email: request.headers[emailHeader.toLowerCase()] as string,
      preferredUsername: request.headers[
        usernameHeader.toLowerCase()
      ] as string,
      accessToken: request.headers[tokenHeader.toLowerCase()] as string,
    };
  }

  /**
   * Верифицирует JWT токен и извлекает информацию о пользователе
   */
  private async verifyAndExtractUser(
    token: string,
    proxyHeaders: OAuth2ProxyHeaders
  ): Promise<AuthenticatedUser> {
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');
    const clientId = this.configService.get('KEYCLOAK_CLIENT_ID');

    if (!keycloakUrl || !realm) {
      throw new UnauthorizedException('Keycloak не настроен');
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getSigningKey.bind(this),
        {
          algorithms: ['RS256'],
          issuer: `${keycloakUrl}/realms/${realm}`,
          audience: clientId || undefined,
        },
        (err, decoded) => {
          if (err) {
            this.logger.error('JWT verification failed:', err);
            reject(new UnauthorizedException('Недействительный JWT токен'));
            return;
          }

          try {
            const payload = decoded as KeycloakJwtPayload;
            const user = this.extractUserFromPayload(payload, proxyHeaders);
            resolve(user);
          } catch (error) {
            this.logger.error('Error extracting user from payload:', error);
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Получает публичный ключ для верификации JWT
   */
  private getSigningKey(
    header: jwt.JwtHeader,
    callback: jwt.SigningKeyCallback
  ): void {
    if (!this.jwksClient) {
      callback(new Error('JWKS client not initialized'));
      return;
    }

    this.jwksClient.getSigningKey(
      header.kid,
      (err: Error | null, key: jwksClient.SigningKey | undefined) => {
        if (err) {
          this.logger.error('Error getting signing key:', err);
          callback(err);
          return;
        }

        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
      }
    );
  }

  /**
   * Извлекает данные пользователя из JWT payload
   */
  private extractUserFromPayload(
    payload: KeycloakJwtPayload,
    proxyHeaders: OAuth2ProxyHeaders
  ): AuthenticatedUser {
    // ID пользователя из Keycloak (sub claim)
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Отсутствует идентификатор пользователя в токене'
      );
    }

    // Email пользователя (приоритет: JWT payload -> OAuth2 Proxy headers)
    const email = payload.email || proxyHeaders.email;
    if (!email) {
      throw new UnauthorizedException('Отсутствует email пользователя');
    }

    // Имя пользователя (приоритет: name -> preferred_username -> given_name + family_name)
    const name = this.extractUserName(payload, proxyHeaders);

    // Avatar из picture claim
    const avatar = payload.picture;

    // Определение роли пользователя
    const role = this.extractUserRole(payload);

    // Проверка верификации email
    const isEmailVerified = payload.email_verified ?? false;

    return {
      id: payload.sub,
      email,
      name,
      avatar,
      role,
      isEmailVerified,
      sessionState: payload.session_state,
    };
  }

  /**
   * Извлекает имя пользователя из различных полей
   */
  private extractUserName(
    payload: KeycloakJwtPayload,
    proxyHeaders: OAuth2ProxyHeaders
  ): string {
    // Приоритет: name -> preferred_username -> given_name + family_name -> email
    if (payload.name) return payload.name;

    if (payload.preferred_username) return payload.preferred_username;

    if (proxyHeaders.preferredUsername) return proxyHeaders.preferredUsername;

    if (payload.given_name && payload.family_name) {
      return `${payload.given_name} ${payload.family_name}`;
    }

    if (payload.given_name) return payload.given_name;

    // В крайнем случае используем часть email до @
    const email = payload.email || proxyHeaders.email;
    if (email) {
      return email.split('@')[0];
    }

    throw new UnauthorizedException('Не удалось определить имя пользователя');
  }

  /**
   * Определяет роль пользователя из токена
   */
  private extractUserRole(payload: KeycloakJwtPayload): 'admin' | 'user' {
    const clientId = this.configService.get('KEYCLOAK_CLIENT_ID');

    // Проверяем роли в realm_access (общие роли realm)
    if (payload.realm_access?.roles) {
      if (payload.realm_access.roles.includes('admin')) return 'admin';
      if (payload.realm_access.roles.includes('user')) return 'user';
    }

    // Проверяем роли в resource_access для конкретного клиента
    if (clientId && payload.resource_access?.[clientId]?.roles) {
      const clientRoles = payload.resource_access[clientId].roles;
      if (clientRoles.includes('admin')) return 'admin';
      if (clientRoles.includes('user')) return 'user';
    }

    // По умолчанию назначаем роль user
    return 'user';
  }

  /**
   * Создает настраиваемого development пользователя
   */
  private createDevUser(): AuthenticatedUser {
    // Возможность настройки через переменные окружения
    const devUserId =
      process.env.DEV_USER_ID || '550e8400-e29b-41d4-a716-446655440000';
    const devUserEmail = process.env.DEV_USER_EMAIL || 'dev@example.com';
    const devUserName = process.env.DEV_USER_NAME || 'Dev User';
    const devUserRole =
      (process.env.DEV_USER_ROLE as 'admin' | 'user') || 'admin';
    const devUserAvatar = process.env.DEV_USER_AVATAR || undefined;
    const devUserEmailVerified =
      process.env.DEV_USER_EMAIL_VERIFIED !== 'false';

    return {
      id: devUserId,
      email: devUserEmail,
      name: devUserName,
      avatar: devUserAvatar,
      role: devUserRole,
      isEmailVerified: devUserEmailVerified,
      sessionState: 'dev-session',
    };
  }

  /**
   * Создает или обновляет пользователя в базе данных на основе данных Keycloak
   */
  private async ensureUserExists(
    keycloakUser: AuthenticatedUser
  ): Promise<AuthenticatedUser> {
    try {
      // Проверяем, существует ли пользователь в базе данных по Keycloak ID
      let dbUser = await this.usersService.findByKeycloakId(keycloakUser.id);

      if (!dbUser) {
        // Проверяем по email на случай, если пользователь был создан ранее
        dbUser = await this.usersService.findByEmail(keycloakUser.email);

        if (dbUser) {
          // Обновляем userId если пользователь найден по email
          dbUser = await this.usersService.update(dbUser.id, {
            userId: keycloakUser.id,
            name: keycloakUser.name,
            avatar: keycloakUser.avatar,
            role: keycloakUser.role,
          });
          this.logger.log(
            `Обновлен существующий пользователь: ${keycloakUser.email} (ID: ${keycloakUser.id})`
          );
        } else {
          // Создаем нового пользователя
          dbUser = await this.usersService.create({
            userId: keycloakUser.id,
            email: keycloakUser.email,
            name: keycloakUser.name,
            avatar: keycloakUser.avatar,
            role: keycloakUser.role,
            balance: 0,
            plan: 'free',
          });
          this.logger.log(
            `Создан новый пользователь: ${keycloakUser.email} (ID: ${keycloakUser.id})`
          );
        }
      } else {
        // Обновляем данные существующего пользователя из Keycloak
        dbUser = await this.usersService.update(dbUser.id, {
          name: keycloakUser.name,
          avatar: keycloakUser.avatar,
          role: keycloakUser.role,
        });
        this.logger.debug(
          `Обновлены данные пользователя: ${keycloakUser.email}`
        );
      }

      // Возвращаем обновленную информацию о пользователе
      return {
        ...keycloakUser,
        databaseId: dbUser.id, // Добавляем ID из базы данных
        balance: dbUser.balance,
        plan: dbUser.plan,
        planExpiresAt: dbUser.planExpiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при создании/обновлении пользователя ${keycloakUser.email}:`,
        error
      );
      // В случае ошибки возвращаем пользователя без данных из БД
      return keycloakUser;
    }
  }
}
