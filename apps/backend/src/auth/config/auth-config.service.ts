import { Injectable } from '@nestjs/common';
import { authConfigSchema, AuthConfig } from './auth-config.schema';

@Injectable()
export class AuthConfigService {
  private readonly config: AuthConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = authConfigSchema.parse({
      jwtSecret: env.JWT_SECRET,
      jwtExpiration: env.JWT_EXPIRATION,
      keycloakUrl: env.KEYCLOAK_URL,
      keycloakRealm: env.KEYCLOAK_REALM,
      keycloakClientId: env.KEYCLOAK_CLIENT_ID,
      oauth2ProxyUserHeader: env.OAUTH2_PROXY_USER_HEADER,
      oauth2ProxyEmailHeader: env.OAUTH2_PROXY_EMAIL_HEADER,
      oauth2ProxyPreferredUsernameHeader: env.OAUTH2_PROXY_PREFERRED_USERNAME_HEADER,
      oauth2ProxyAccessTokenHeader: env.OAUTH2_PROXY_ACCESS_TOKEN_HEADER,
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
    return !!(this.config.keycloakUrl && this.config.keycloakRealm && this.config.keycloakClientId);
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
      realm: this.config.keycloakRealm,
      clientId: this.config.keycloakClientId,
    };
  }

  getOAuth2ProxyHeaders() {
    return {
      user: this.config.oauth2ProxyUserHeader,
      email: this.config.oauth2ProxyEmailHeader,
      preferredUsername: this.config.oauth2ProxyPreferredUsernameHeader,
      accessToken: this.config.oauth2ProxyAccessTokenHeader,
    };
  }

  getDevUserConfig() {
    return {
      id: this.config.devUserId,
      email: this.config.devUserEmail,
      name: this.config.devUserName,
      role: this.config.devUserRole,
      avatar: this.config.devUserAvatar,
      emailVerified: this.config.devUserEmailVerified,
    };
  }
}
