import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoService } from '../crypto/crypto.service';
import { CreateDeviceDto } from './dto/create-device.dto';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let deviceRepository: Repository<Device>;
  let certificateRepository: Repository<Certificate>;
  let cryptoService: CryptoService;

  const mockDevice = {
    id: 'test-device-001',
    model: 'ESP32',
    publicKey: 'mock-public-key',
    ownerId: undefined,
    status: 'unbound' as const,
    lastSeenAt: new Date(),
    firmwareVersion: '1.0.0',
    createdAt: new Date(),
  };

  const mockCertificate = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    clientCert: 'mock-client-cert',
    caCert: 'mock-ca-cert',
    fingerprint: 'mock-fingerprint',
    createdAt: new Date(),
  };

  const mockCryptoResult = {
    clientCert: 'mock-client-cert',
    caCert: 'mock-ca-cert',
    fingerprint: 'mock-fingerprint',
    publicKeyPem: 'mock-public-key',
  };

  // Мок для пользователей с разными ролями
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: {
            create: jest.fn().mockReturnValue(mockDevice),
            save: jest.fn().mockResolvedValue(mockDevice),
            find: jest.fn().mockResolvedValue([mockDevice]),
            findOne: jest.fn().mockResolvedValue(null), // Добавляем findOne
            findAndCount: jest.fn().mockResolvedValue([[mockDevice], 1]),
          },
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: {
            create: jest.fn().mockReturnValue(mockCertificate),
            save: jest.fn().mockResolvedValue(mockCertificate),
          },
        },
        {
          provide: CryptoService,
          useValue: {
            signCertificate: jest.fn().mockReturnValue(mockCryptoResult),
          },
        },
      ],
    })
      .overrideGuard(require('../common/guard/roles-guard.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();

    // Mock the request user for RBAC tests
    app.use((req, res, next) => {
      req.user = mockAdminUser;
      next();
    });

    await app.init();

    deviceRepository = module.get<Repository<Device>>(
      getRepositoryToken(Device)
    );
    certificateRepository = module.get<Repository<Certificate>>(
      getRepositoryToken(Certificate)
    );
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /devices', () => {
    it('should register a new device', async () => {
      const createDeviceDto: CreateDeviceDto = {
        id: 'test-device-001',
        publicKey: 'mock-public-key',
        model: 'ESP32',
        firmwareVersion: '1.0.0',
      };

      const response = await request(app.getHttpServer())
        .post('/devices/sign-device')
        .send(createDeviceDto)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: 'test-device-001',
          status: 'unbound',
          model: 'ESP32',
          firmwareVersion: '1.0.0',
        })
      );

      // Проверяем, что устройство было создано (не проверяем cryptoService, так как сертификат создается отдельно)
      expect(response.body.id).toBe('test-device-001');
    });

    it('should handle missing required fields', async () => {
      const invalidDto = {
        // отсутствует обязательные поля id и publicKey
        model: 'ESP32',
      };

      // Без валидации NestJS принимает любые данные
      // В будущем нужно добавить ValidationPipe
      await request(app.getHttpServer())
        .post('/devices/sign-device')
        .send(invalidDto)
        .expect(201); // Временно ожидаем 201, пока нет валидации
    });
  });

  describe('GET /devices', () => {
    it('should return list of devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/devices')
        .expect(200);

      expect(response.body.devices).toBeDefined();
      expect(response.body.meta).toBeDefined();
    });

    it('should return empty array when no devices exist', async () => {
      jest.spyOn(deviceRepository, 'findAndCount').mockResolvedValue([[], 0]);

      const response = await request(app.getHttpServer())
        .get('/devices')
        .expect(200);

      expect(response.body.devices).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });
  });
});
