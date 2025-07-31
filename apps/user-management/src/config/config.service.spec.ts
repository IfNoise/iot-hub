import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let configService: ConfigService;

  beforeEach(() => {
    // Set minimal required environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.DATABASE_PASSWORD = 'test-password-12345678';
    process.env.DATABASE_USER = 'testuser';
    process.env.DATABASE_NAME = 'testdb';
    process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long';

    configService = new ConfigService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_NAME;
    delete process.env.JWT_SECRET;
  });

  describe('Environment Detection', () => {
    it('should detect test environment', () => {
      expect(configService.isTest()).toBe(true);
      expect(configService.isDevelopment()).toBe(false);
      expect(configService.isProduction()).toBe(false);
    });
  });

  describe('Domain Services', () => {
    it('should have all domain config services', () => {
      expect(configService.common).toBeDefined();
      expect(configService.auth).toBeDefined();
      expect(configService.database).toBeDefined();
      expect(configService.telemetry).toBeDefined();
      expect(configService.kafka).toBeDefined();
    });
  });

  describe('Database Configuration', () => {
    it('should provide database connection options', () => {
      const dbOptions = configService.getDrizzleConnectionOptions();

      expect(dbOptions.user).toBe('testuser');
      expect(dbOptions.database).toBe('testdb');
      expect(dbOptions.host).toBe('localhost');
      expect(dbOptions.port).toBe(5432);
    });

    it('should provide database URL', () => {
      const dbUrl = configService.getDatabaseUrl();
      expect(dbUrl).toContain('postgresql://');
      expect(dbUrl).toContain('testuser');
      expect(dbUrl).toContain('testdb');
    });
  });

  describe('Configuration Getters', () => {
    it('should provide JWT configuration', () => {
      const jwtConfig = configService.getJwtConfig();
      expect(jwtConfig.secret).toBe('test-secret-key-that-is-32-chars-long');
      expect(jwtConfig.expiration).toBe('1h');
    });

    it('should provide Redis configuration', () => {
      const redisConfig = configService.getRedisConfig();
      expect(redisConfig.enabled).toBe(true);
      expect(redisConfig.retryAttempts).toBe(3);
    });

    it('should provide CORS configuration', () => {
      const corsConfig = configService.getCorsConfig();
      expect(corsConfig.origin).toBe('*');
      expect(corsConfig.credentials).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    it('should check feature flags correctly', () => {
      expect(configService.isRedisEnabled()).toBe(true);
      expect(configService.isOpenTelemetryEnabled()).toBe(true);
      expect(configService.isKafkaEnabled()).toBe(true);
      expect(configService.isKeycloakEnabled()).toBe(false); // No Keycloak config in test
    });
  });

  describe('Complete Configuration', () => {
    it('should provide complete configuration object', () => {
      const allConfig = configService.getAll();

      expect(allConfig.common).toBeDefined();
      expect(allConfig.auth).toBeDefined();
      expect(allConfig.database).toBeDefined();
      expect(allConfig.telemetry).toBeDefined();
      expect(allConfig.kafka).toBeDefined();

      expect(allConfig.common.nodeEnv).toBe('test');
      expect(allConfig.common.port).toBe(3001);
    });
  });
});
