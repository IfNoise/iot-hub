import { 
  AuthenticatedUserSchema, 
  BaseUserSchema, 
  JWTConfigSchema,
  AuthMiddlewareConfigSchema 
} from '../lib/schemas/index.js';

describe('Auth Middleware Schemas', () => {
  describe('JWTConfigSchema', () => {
    it('should validate valid JWT config', () => {
      const validConfig = {
        issuer: 'https://keycloak.example.com/realms/iot-hub',
        jwksUri: 'https://keycloak.example.com/realms/iot-hub/protocol/openid-connect/certs',
        audience: 'iot-hub-backend',
      };

      const result = JWTConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should reject invalid URLs', () => {
      const invalidConfig = {
        issuer: 'not-a-url',
        jwksUri: 'https://keycloak.example.com/realms/iot-hub/protocol/openid-connect/certs',
      };

      expect(() => JWTConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('BaseUserSchema', () => {
    it('should validate valid base user', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['personal-user'],
        tokenExp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = BaseUserSchema.parse(validUser);
      expect(result.id).toBe(validUser.id);
      expect(result.email).toBe(validUser.email);
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'not-an-email',
        name: 'Test User',
        roles: ['personal-user'],
        tokenExp: Math.floor(Date.now() / 1000) + 3600,
      };

      expect(() => BaseUserSchema.parse(invalidUser)).toThrow();
    });
  });

  describe('AuthenticatedUserSchema', () => {
    it('should validate authenticated user with permissions', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['personal-user'],
        permissions: ['users:read', 'devices:read'],
        tokenExp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = AuthenticatedUserSchema.parse(validUser);
      expect(result.permissions).toEqual(['users:read', 'devices:read']);
    });
  });

  describe('AuthMiddlewareConfigSchema', () => {
    it('should validate complete config', () => {
      const validConfig = {
        jwt: {
          issuer: 'https://keycloak.example.com/realms/iot-hub',
          jwksUri: 'https://keycloak.example.com/realms/iot-hub/protocol/openid-connect/certs',
        },
        acm: {
          baseUrl: 'http://localhost:3001',
          timeout: 5000,
          retryAttempts: 3,
        },
        cache: {
          enabled: true,
          ttl: 300,
        },
      };

      const result = AuthMiddlewareConfigSchema.parse(validConfig);
      expect(result.acm.timeout).toBe(5000);
      expect(result.cache?.enabled).toBe(true);
    });

    it('should apply defaults for optional fields', () => {
      const minimalConfig = {
        jwt: {
          issuer: 'https://keycloak.example.com/realms/iot-hub',
          jwksUri: 'https://keycloak.example.com/realms/iot-hub/protocol/openid-connect/certs',
        },
        acm: {
          baseUrl: 'http://localhost:3001',
        },
      };

      const result = AuthMiddlewareConfigSchema.parse(minimalConfig);
      expect(result.acm.timeout).toBe(5000); // default
      expect(result.acm.retryAttempts).toBe(3); // default
    });
  });
});
