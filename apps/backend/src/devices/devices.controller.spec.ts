import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { Device } from './entities/device.entity.js';
import { Certificate } from './entities/certificate.entity.js';
import { RolesGuard } from '../common/guard/roles-guard.guard.js';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let deviceRepository: Repository<Device>;

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

  // Мок для администраторского пользователя
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    isEmailVerified: true,
  };

  const mockCertificate = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    clientCert: 'mock-client-cert',
    caCert: 'mock-ca-cert',
    fingerprint: 'mock-fingerprint',
    createdAt: new Date(),
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
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();

    // Mock the request user for RBAC tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((req: any, res: any, next: any) => {
      req.user = mockAdminUser;
      next();
    });

    await app.init();

    deviceRepository = module.get<Repository<Device>>(
      getRepositoryToken(Device)
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /manufacturing/generate-device-qr', () => {
    it('should register a new device', async () => {
      const createDeviceDto = {
        deviceId: 'test-device-001',
        publicKeyPem: 'mock-public-key',
        model: 'ESP32',
        firmwareVersion: '1.0.0',
        qrType: 'token' as const,
      };

      const response = await request(app.getHttpServer())
        .post('/manufacturing/generate-device-qr')
        .send(createDeviceDto)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Устройство успешно зарегистрировано',
          data: expect.objectContaining({
            deviceId: 'test-device-001',
            qrData: expect.objectContaining({
              deviceId: 'test-device-001',
              v: 1,
            }),
            estimatedQRSize: expect.any(Number),
          }),
        })
      );
    });

    it('should handle missing required fields', async () => {
      const invalidDto = {
        // отсутствует обязательные поля id и publicKey
        model: 'ESP32',
      };

      await request(app.getHttpServer())
        .post('/manufacturing/generate-device-qr')
        .send(invalidDto)
        .expect(400); // Ожидаем ошибку валидации
    });
  });

  describe('GET /devices/my', () => {
    it('should return list of user devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/devices/my')
        .expect(200);

      expect(response.body.devices).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBeDefined();
      expect(response.body.limit).toBeDefined();
    });

    it('should return empty array when no devices exist', async () => {
      jest.spyOn(deviceRepository, 'findAndCount').mockResolvedValue([[], 0]);

      const response = await request(app.getHttpServer())
        .get('/devices/my')
        .expect(200);

      expect(response.body.devices).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });
});
