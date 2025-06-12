// src/common/types/keycloak-user.interface.ts

/**
 * Интерфейс для пользователя из Keycloak JWT токена
 */
export interface KeycloakJwtPayload {
  sub: string; // Keycloak user ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string; // avatar URL
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
  scope?: string;
  iss: string; // issuer
  aud: string | string[]; // audience
  exp: number; // expiration time
  iat: number; // issued at
  auth_time?: number;
  session_state?: string;
  acr?: string;
}

/**
 * Обработанная информация о пользователе для использования в приложении
 */
export interface AuthenticatedUser {
  id: string; // Keycloak user ID (sub)
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
  isEmailVerified: boolean;
  sessionState?: string;

  // Дополнительные поля из локальной базы данных
  databaseId?: string; // ID записи в локальной БД
  balance?: number;
  plan?: 'free' | 'pro';
  planExpiresAt?: Date;
}

/**
 * Заголовки OAuth2 Proxy
 */
export interface OAuth2ProxyHeaders {
  user?: string;
  email?: string;
  preferredUsername?: string;
  accessToken?: string;
}
