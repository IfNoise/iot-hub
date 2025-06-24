import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoService } from '../crypto/crypto.service';

describe('DevicesController Simple Unit Tests', () => {
  let controller: DevicesController;
  let service: DevicesService;

  const mockDevicesService = {
    getDevices: jest.fn().mockResolvedValue({
      devices: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
    getUserDevices: jest.fn().mockResolvedValue({
      devices: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
    createDevice: jest.fn(),
    bindDevice: jest.fn(),
    unbindDevice: jest.fn(),
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

  describe('controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have access to devicesService', () => {
      expect(service).toBeDefined();
    });
  });

  describe('service methods availability', () => {
    it('should have getDevices method in service', () => {
      expect(service.getDevices).toBeDefined();
      expect(typeof service.getDevices).toBe('function');
    });

    it('should have getUserDevices method in service', () => {
      expect(service.getUserDevices).toBeDefined();
      expect(typeof service.getUserDevices).toBe('function');
    });
  });
});
