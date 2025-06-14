import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    // Mock environment variables for tests
    process.env.DATABASE_PASSWORD = 'test-password';
    process.env.DATABASE_USER = 'test-user';
    process.env.DATABASE_NAME = 'test-db';
    process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters-long';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.PORT = '3000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_NAME;
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.PORT;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
