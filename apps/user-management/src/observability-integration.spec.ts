/**
 * Тест интеграции Observability в user-management сервисе
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ObservabilityModule } from '@iot-hub/observability';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';

describe('Observability Integration', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Создаем мок для UserService
    const mockUserService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should create observability module', () => {
    expect(module).toBeDefined();
  });

  it('should inject observability services into UserController', () => {
    const userController = module.get<UserController>(UserController);
    expect(userController).toBeDefined();
    // UserController должен иметь доступ к observability сервисам
    expect(userController['metricsService']).toBeDefined();
    expect(userController['telemetryService']).toBeDefined();
    expect(userController['loggingService']).toBeDefined();
  });
});
