import { Injectable } from '@nestjs/common';
import { authConfigSchema, AuthConfig } from './auth-config.schema.js';

@Injectable()
export class AuthConfigService {
  private readonly config: AuthConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = authConfigSchema.parse({
      jwtSecret: env.JWT_SECRET,
      jwtExpiration: env.JWT_EXPIRATION,
      frontEndUrl: env.FRONT_END_URL,
      keycloakUrl: env.KEYCLOAK_URL,
      keycloakRealm: env.KEYCLOAK_REALM,
      keycloakClientId: env.KEYCLOAK_CLIENT_ID,
      keycloakClientSecret: env.KEYCLOAK_CLIENT_SECRET,
      keycloakAdminUsername: env.KEYCLOAK_ADMIN_USERNAME,
      keycloakAdminPassword: env.KEYCLOAK_ADMIN_PASSWORD,
      devUserId: env.DEV_USER_ID,
      devUserEmail: env.DEV_USER_EMAIL,
      devUserName: env.DEV_USER_NAME,
      devUserRole: env.DEV_USER_ROLE,
      devUserAvatar: env.DEV_USER_AVATAR,
      devUserEmailVerified: env.DEV_USER_EMAIL_VERIFIED,
    });
  }

  get<T extends keyof AuthConfig>(key: T): AuthConfig[T] {
    return this.config[key];
  }

  getAll(): AuthConfig {
    return this.config;
  }

  // Convenience methods
  isKeycloakEnabled(): boolean {
    return !!(
      this.config.keycloakUrl &&
      this.config.keycloakRealm &&
      this.config.keycloakClientId
    );
  }

  getJwtConfig() {
    return {
      secret: this.config.jwtSecret,
      expiration: this.config.jwtExpiration,
    };
  }

  getKeycloakConfig() {
    return {
      url: this.config.keycloakUrl,
      frontEndUrl: this.config.frontEndUrl,
      realm: this.config.keycloakRealm,
      clientId: this.config.keycloakClientId,
      clientSecret: this.config.keycloakClientSecret,
      adminUsername: this.config.keycloakAdminUsername,
      adminPassword: this.config.keycloakAdminPassword,
    };
  }

  getDevUserConfig() {
    return {
      userId: this.config.devUserId,
      email: this.config.devUserEmail,
      name: this.config.devUserName,
      role: this.config.devUserRole,
      avatar: this.config.devUserAvatar,
      emailVerified: this.config.devUserEmailVerified,
    };
  }
}
