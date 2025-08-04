import { Injectable } from '@nestjs/common';
import { authConfigSchema, AuthConfig } from './auth-config.schema.js';

@Injectable()
export class AuthConfigService {
  private readonly config: AuthConfig;

  constructor(env: Record<string, string | undefined>) {
    // Keycloak конфигурация только если указаны обязательные поля
    const keycloakConfig =
      env.KEYCLOAK_URL &&
      env.KEYCLOAK_REALM &&
      env.KEYCLOAK_SERVICE_CLIENT_ID &&
      env.KEYCLOAK_SERVICE_CLIENT_SECRET
        ? {
            enabled: true,
            baseUrl: env.KEYCLOAK_URL,
            realm: env.KEYCLOAK_REALM,
            timeout: env.KEYCLOAK_TIMEOUT
              ? parseInt(env.KEYCLOAK_TIMEOUT)
              : 10000,
            serviceAccount: {
              clientId: env.KEYCLOAK_SERVICE_CLIENT_ID,
              clientSecret: env.KEYCLOAK_SERVICE_CLIENT_SECRET,
            },
            publicClient: env.KEYCLOAK_PUBLIC_CLIENT_ID
              ? {
                  clientId: env.KEYCLOAK_PUBLIC_CLIENT_ID,
                }
              : undefined,
          }
        : undefined;

    this.config = authConfigSchema.parse({
      jwtSecret: env.JWT_SECRET,
      jwtExpiration: env.JWT_EXPIRATION,
      keycloak: keycloakConfig,
    });
  }

  get<T extends keyof AuthConfig>(key: T): AuthConfig[T] {
    return this.config[key];
  }

  getAll(): AuthConfig {
    return this.config;
  }

  // Convenience methods
  getJwtConfig() {
    return {
      secret: this.config.jwtSecret,
      expiration: this.config.jwtExpiration,
    };
  }

  get keycloak() {
    return this.config.keycloak;
  }

  isKeycloakEnabled(): boolean {
    return this.config.keycloak?.enabled ?? false;
  }
}
