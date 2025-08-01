import { Test, TestingModule } from '@nestjs/testing';
import { AutoUserSyncMiddleware } from './auto-user-sync.middleware.js';
import { KeycloakUserService } from '../services/keycloak-user.service.js';
import { Request, Response, NextFunction } from 'express';
import { User as DbUser } from '../../users/entities/user.entity.js';
import { User } from '@iot-hub/users';

describe('AutoUserSyncMiddleware', () => {
  let middleware: AutoUserSyncMiddleware;
  let keycloakUserService: jest.Mocked<KeycloakUserService>;
  const mockUser: User = {
    id: 'keycloak-user-id',
    email: 'test@example.com',
    userId: 'keycloak-user-id',
    name: 'Test User',
    avatar: 'avatar-url',
    roles: ['personal-user'],
    accountType: 'individual',
    balance: 0,
    plan: 'free',
    planExpiresAt: undefined,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDbUser: DbUser = {
    id: 'db-user-id',
    userId: 'keycloak-user-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'avatar-url',
    roles: ['personal-user'],
    accountType: 'individual',
    balance: 0,
    plan: 'free',
    planExpiresAt: undefined,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: mockUser,
  } as Request;

  const mockResponse = {} as Response;
  const mockNext = jest.fn() as NextFunction;
  beforeEach(async () => {
    const mockKeycloakUserService = {
      syncUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoUserSyncMiddleware,
        {
          provide: KeycloakUserService,
          useValue: mockKeycloakUserService,
        },
      ],
    }).compile();

    middleware = module.get<AutoUserSyncMiddleware>(AutoUserSyncMiddleware);
    keycloakUserService = module.get(KeycloakUserService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call syncUser when user is present in request', async () => {
    // Arrange

    keycloakUserService.syncUser.mockResolvedValue(mockDbUser);

    // Act
    await middleware.use(mockRequest, mockResponse, mockNext);

    // Assert
    expect(keycloakUserService.syncUser).toHaveBeenCalledWith(mockUser);
    expect(keycloakUserService.syncUser).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should call next() without syncing when no user in request', async () => {
    // Arrange
    const mockRequest = {} as Request;
    const mockResponse = {} as Response;
    const mockNext = jest.fn() as NextFunction;

    // Act
    await middleware.use(mockRequest, mockResponse, mockNext);

    // Assert
    expect(keycloakUserService.syncUser).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should continue execution even if syncUser throws error', async () => {
    // Arrange

    const mockRequest = {
      user: mockUser,
    } as Request;

    const mockResponse = {} as Response;
    const mockNext = jest.fn() as NextFunction;

    keycloakUserService.syncUser.mockRejectedValue(new Error('Database error'));

    // Act
    await middleware.use(mockRequest, mockResponse, mockNext);

    // Assert
    expect(keycloakUserService.syncUser).toHaveBeenCalledWith(mockUser);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should log debug messages during sync process', async () => {
    // Arrange
    const loggerSpy = jest.spyOn(middleware['logger'], 'debug');

    const mockNext = jest.fn() as NextFunction;

    keycloakUserService.syncUser.mockResolvedValue(mockDbUser);

    // Act
    await middleware.use(mockRequest, mockResponse, mockNext);

    // Assert
    expect(loggerSpy).toHaveBeenCalledWith(
      'Синхронизация пользователя: test@example.com'
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      'Пользователь синхронизирован: test@example.com'
    );
  });
});
