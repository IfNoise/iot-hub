import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service.js';

describe('ConfigService (Decomposed)', () => {
  let service: ConfigService;

  beforeEach(async () => {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_PASSWORD = 'testpassword';
    process.env.DATABASE_USER = 'testuser';
    process.env.DATABASE_NAME = 'testdb';
    process.env.JWT_SECRET = 'testsecretthatislongenoughforvalidation';
    process.env.FRONT_END_URL = 'http://localhost:3000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_NAME;
    delete process.env.JWT_SECRET;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all domain services', () => {
    expect(service.common).toBeDefined();
    expect(service.auth).toBeDefined();
    expect(service.database).toBeDefined();
    expect(service.mqtt).toBeDefined();
    expect(service.telemetry).toBeDefined();
    expect(service.devices).toBeDefined();
    expect(service.users).toBeDefined();
  });

  it('should provide environment-aware methods', () => {
    expect(service.isDevelopment()).toBe(false);
    expect(service.isTest()).toBe(true);
    expect(service.isProduction()).toBe(false);
  });

  it('should provide domain-specific configurations', () => {
    const jwtConfig = service.auth.getJwtConfig();
    expect(jwtConfig.secret).toBe('testsecretthatislongenoughforvalidation');
    expect(jwtConfig.expiration).toBe('1h');

    const dbConfig = service.database.getConnectionInfo();
    expect(dbConfig.host).toBe('localhost');
    expect(dbConfig.port).toBe(5432);
    expect(dbConfig.database).toBe('testdb');

    const commonConfig = service.common.getAll();
    expect(commonConfig.nodeEnv).toBe('test');
    expect(commonConfig.port).toBe(3000);
  });

  it('should provide composed configuration', () => {
    const allConfig = service.getAll();
    expect(allConfig.common).toBeDefined();
    expect(allConfig.auth).toBeDefined();
    expect(allConfig.database).toBeDefined();
    expect(allConfig.mqtt).toBeDefined();
    expect(allConfig.telemetry).toBeDefined();
    expect(allConfig.devices).toBeDefined();
    expect(allConfig.users).toBeDefined();
  });

  it('should provide backward compatibility (deprecated methods)', () => {
    // Deprecated methods should still work but delegate to domain services
    expect(service.getJwtConfig()).toBeDefined();
    expect(service.getCorsConfig()).toBeDefined();
    expect(service.getLoggingConfig()).toBeDefined();
    expect(service.getMqttConfig()).toBeDefined();
  });

  it('should provide convenience methods', () => {
    expect(service.getDatabaseConfig()).toBeDefined();
    expect(service.getJwtConfig()).toBeDefined();
    expect(service.getCorsConfig()).toBeDefined();
    expect(service.getLoggingConfig()).toBeDefined();
  });

  it('should handle feature flags', () => {
    expect(typeof service.isKeycloakEnabled()).toBe('boolean');
    expect(typeof service.isRedisEnabled()).toBe('boolean');
    expect(typeof service.isOpenTelemetryEnabled()).toBe('boolean');
    expect(typeof service.isUserRegistrationEnabled()).toBe('boolean');
    expect(typeof service.isEmailVerificationRequired()).toBe('boolean');
  });
});
