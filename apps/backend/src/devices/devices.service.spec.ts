import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoService } from '../crypto/crypto.service';

describe('DevicesService', () => {
  let service: DevicesService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
  };

  const mockCryptoService = {
    signCertificate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockRepository,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
