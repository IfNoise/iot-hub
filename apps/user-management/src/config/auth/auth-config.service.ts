import { Injectable } from '@nestjs/common';
import { authConfigSchema, AuthConfig } from './auth-config.schema.js';

@Injectable()
export class AuthConfigService {
  private readonly config: AuthConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = authConfigSchema.parse({
      jwtSecret: env.JWT_SECRET,
      jwtExpiration: env.JWT_EXPIRATION,
      keycloakEnabled:
        !!env.KEYCLOAK_URL && !!env.KEYCLOAK_REALM && !!env.KEYCLOAK_CLIENT_ID,
      keycloakUrl: env.KEYCLOAK_URL,
      keycloakRealm: env.KEYCLOAK_REALM,
      keycloakClientId: env.KEYCLOAK_CLIENT_ID,
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

  getKeycloakConfig() {
    return {
      enabled: this.config.keycloakEnabled,
      url: this.config.keycloakUrl,
      realm: this.config.keycloakRealm,
      clientId: this.config.keycloakClientId,
    };
  }

  isKeycloakEnabled(): boolean {
    return this.config.keycloakEnabled;
  }
}
