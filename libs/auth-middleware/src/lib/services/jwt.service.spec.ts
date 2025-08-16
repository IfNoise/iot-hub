import { JwtService } from './jwt.service.js';
import { UnauthorizedException } from '@nestjs/common';

// Mock для jose библиотеки
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks'),
  jwtVerify: jest.fn(),
}));

describe('JwtService', () => {
  let service: JwtService;
  const mockConfig = {
    issuer: 'https://keycloak.example.com/realms/iot-hub',
    jwksUri: 'https://keycloak.example.com/realms/iot-hub/protocol/openid-connect/certs',
    audience: 'iot-hub-backend',
  };

  beforeEach(() => {
    service = new JwtService(mockConfig);
  });

  describe('extractUserFromPayload', () => {
    it('should extract user from valid payload', () => {
      const payload = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        preferred_username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        realm_access: {
          roles: ['personal-user'],
        },
      };

      const user = service.extractUserFromPayload(payload);
      
      expect(user.userId).toBe(payload.sub);
      expect(user.email).toBe(payload.email);
      expect(user.name).toBe(payload.preferred_username);
      expect(user.roles).toEqual(['personal-user']);
      expect(user.tokenExp).toBe(payload.exp);
    });

    it('should handle payload without preferred_username', () => {
      const payload = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const user = service.extractUserFromPayload(payload);
      
      expect(user.name).toBe(payload.email); // fallback to email
      expect(user.roles).toEqual(['personal-user']); // default role
    });

    it('should extract organizationId from organization object', () => {
      const payload = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        organization: {
          'test-org': {
            id: '456e7890-e89b-12d3-a456-426614174001',
          },
        },
      };

      const user = service.extractUserFromPayload(payload);
      
      expect(user.organizationId).toBe('456e7890-e89b-12d3-a456-426614174001');
    });

    it('should throw UnauthorizedException for invalid payload', () => {
      const invalidPayload = {
        sub: 'not-a-uuid',
        email: 'not-an-email',
      };

      expect(() => service.extractUserFromPayload(invalidPayload)).toThrow(UnauthorizedException);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(service.isTokenExpired(futureExp)).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(service.isTokenExpired(pastExp)).toBe(true);
    });
  });
});
