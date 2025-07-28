// src/common/services/keycloak-user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersService } from '../../users/users.service.js';
import { User as DbUser } from '../../users/entities/user.entity.js';
import { User, UserBaseSchema } from '@iot-hub/users';
import { ZodTypeAny } from 'zod';
import { mapUserEntityToDto } from '../../users/mappers/entity-to-dto.mapper.js';

// Универсальная рекурсивная нормализация null → undefined по Zod-схеме
function normalizeNullToUndefined(obj: any, schema: ZodTypeAny): any {
  if (!schema || !schema._def) return obj;
  if (schema._def.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    const result: Record<string, unknown> = {};
    for (const key in shape) {
      const fieldSchema = shape[key];
      const value = obj[key];
      if (!fieldSchema) {
        result[key] = value;
        continue;
      }
      // Если поле допускает undefined, но не null — заменяем null на undefined
      if (value === null && typeof fieldSchema.isOptional === 'function' && fieldSchema.isOptional()) {
        result[key] = undefined;
      } else if (Array.isArray(value) && fieldSchema.element) {
        result[key] = value.map((item) => normalizeNullToUndefined(item, fieldSchema.element));
      } else if (typeof value === 'object' && value !== null && fieldSchema._def && fieldSchema._def.typeName === 'ZodObject') {
        result[key] = normalizeNullToUndefined(value, fieldSchema);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
}

@Injectable()
export class KeycloakUserService {
  constructor(
    private readonly usersService: UsersService,
    @InjectPinoLogger(KeycloakUserService.name)
    private readonly logger: PinoLogger
  ) {}

  /**
   * Синхронизирует пользователя из Keycloak с локальной базой данных
   */
  async syncUser(keycloakUser: User): Promise<DbUser> {
    try {
      // Универсальная нормализация null → undefined по схеме
      const normalizedInput = normalizeNullToUndefined(
        keycloakUser,
        UserBaseSchema
      );
      const parsed = UserBaseSchema.parse(normalizedInput);
      const userData = {
        userId: parsed.id,
        email: parsed.email,
        name: parsed.name,
        avatar: parsed.avatar,
        roles: parsed.roles,
        organizationId: parsed.organizationId,
        accountType: parsed.accountType,
        groups: parsed.groups,
        metadata: parsed.metadata,
      };
      const dbUser = await this.usersService.createOrUpdate(
        parsed.id,
        userData
      );
      // Маппируем, нормализуем и возвращаем
      const dto = mapUserEntityToDto(dbUser);
      const normalized = normalizeNullToUndefined(
        {
          id: dbUser.id,
          userId: dto.userId ?? dbUser.id,
          email: dto.email,
          name: dto.name,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          roles: dto.roles,
          accountType: dto.accountType,
          avatar: dto.avatar,
          groups: dto.groups,
          metadata: dto.metadata,
          planExpiresAt: dto.planExpiresAt,
          organizationId:
            typeof dto.organizationId === 'string'
              ? dto.organizationId
              : undefined,
          balance: typeof dto.balance === 'number' ? dto.balance : 0,
          plan:
            typeof dto.plan === 'string'
              ? (dto.plan as 'free' | 'pro' | 'enterprise')
              : 'free',
        },
        UserBaseSchema
      );
      if (normalized.planExpiresAt === undefined) {
        delete normalized.planExpiresAt;
      }
      UserBaseSchema.parse(normalized);
      this.logger.info(
        `Пользователь синхронизирован: ${normalized.email} (${normalized.id})`
      );
      return normalized;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Ошибка синхронизации пользователя: ${error.message}`,
          error.stack
        );
      } else {
        this.logger.error(
          'Неизвестная ошибка при синхронизации пользователя',
          String(error)
        );
      }
      throw error;
    }
  }

  /**
   * Получает расширенную информацию о пользователе для ответа API
   */
  async getEnrichedUserInfo(keycloakUser: User): Promise<{
    keycloak: User;
    database: DbUser;
  }> {
    // Сначала синхронизируем пользователя по полной схеме
    const dbUser = await this.syncUser(keycloakUser);

    // Возвращаем обе структуры: исходную и из базы
    return {
      keycloak: keycloakUser,
      database: dbUser,
    };
  }
}
