import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import type { AuthenticatedUser } from '../common/types/keycloak-user.interface';

describe('DevicesController Role-based Access', () => {
  let controller: DevicesController;
  let devicesService: DevicesService;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    isEmailVerified: true,
  };

  const mockRegularUser: AuthenticatedUser = {
    id: 'user-456',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user',
    isEmailVerified: true,
  };

  const mockDevicesResult = {
    devices: [
      {
        id: 'device-1',
        model: 'Model-X',
        publicKey: 'key1',
        ownerId: 'user-456',
        status: 'bound',
        lastSeenAt: new Date(),
        firmwareVersion: '1.0.0',
        createdAt: new Date(),
      },
    ],
    meta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  };

  const mockUserDevicesResult = {
    devices: [
      {
        id: 'device-2',
        model: 'Model-Y',
        publicKey: 'key2',
        ownerId: 'user-456',
        status: 'bound',
        lastSeenAt: new Date(),
        firmwareVersion: '1.0.0',
        createdAt: new Date(),
      },
    ],
    meta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const mockDevicesService = {
      getDevices: jest.fn().mockResolvedValue(mockDevicesResult),
      getUserDevices: jest.fn().mockResolvedValue(mockUserDevicesResult),
      createDevice: jest.fn(),
      bindDevice: jest.fn(),
      unbindDevice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
    devicesService = module.get<DevicesService>(DevicesService);
  });

  describe('getDevices', () => {
    it('should return all devices for admin user', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getDevices(query, mockAdminUser);

      expect(devicesService.getDevices).toHaveBeenCalledWith(query);
      expect(devicesService.getUserDevices).not.toHaveBeenCalled();
      expect(result).toEqual(mockDevicesResult);
    });

    it('should return only user devices for regular user', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getDevices(query, mockRegularUser);

      expect(devicesService.getUserDevices).toHaveBeenCalledWith(
        'user-456',
        query
      );
      expect(devicesService.getDevices).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserDevicesResult);
    });
  });

  describe('getAllDevicesAdmin', () => {
    it('should return all devices for admin endpoint', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.getAllDevicesAdmin(query);

      expect(devicesService.getDevices).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockDevicesResult);
    });
  });
});
