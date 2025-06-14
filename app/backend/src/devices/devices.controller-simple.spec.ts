import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoService } from '../crypto/crypto.service';

describe('DevicesController RBAC Simple', () => {
  let controller: DevicesController;
  let service: DevicesService;

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    isEmailVerified: true,
  };

  const mockRegularUser = {
    id: 'user-456',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user' as const,
    isEmailVerified: true,
  };

  const mockDevicesService = {
    getDevices: jest.fn().mockResolvedValue({
      devices: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
    getUserDevices: jest.fn().mockResolvedValue({
      devices: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: {},
        },
        {
          provide: CryptoService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get<DevicesService>(DevicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDevices', () => {
    it('should call getDevices for admin users', async () => {
      const query = { page: 1, limit: 10 };

      await controller.getDevices(query, mockAdminUser);

      expect(service.getDevices).toHaveBeenCalledWith(query);
      expect(service.getUserDevices).not.toHaveBeenCalled();
    });

    it('should call getUserDevices for regular users', async () => {
      const query = { page: 1, limit: 10 };

      await controller.getDevices(query, mockRegularUser);

      expect(service.getUserDevices).toHaveBeenCalledWith(
        mockRegularUser.id,
        query
      );
      expect(service.getDevices).not.toHaveBeenCalled();
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
