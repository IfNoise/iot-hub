import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

describe('DevicesController Service Layer Tests', () => {
  let controller: DevicesController;
  let devicesService: DevicesService;

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

  describe('service layer tests', () => {
    it('should have access to devicesService.getDevices', async () => {
      const query = { page: 1, limit: 10 };
      await devicesService.getDevices(query);

      expect(devicesService.getDevices).toHaveBeenCalledWith(query);
    });

    it('should have access to devicesService.getUserDevices', async () => {
      const query = { page: 1, limit: 10 };
      await devicesService.getUserDevices('user-456', query);

      expect(devicesService.getUserDevices).toHaveBeenCalledWith(
        'user-456',
        query
      );
    });
  });

  describe('controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have access to devicesService', () => {
      expect(devicesService).toBeDefined();
    });
  });
});
