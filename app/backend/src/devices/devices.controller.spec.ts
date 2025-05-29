import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { Certificate } from './entities/certificate.entity';
import { CryptoService } from '../crypto/crypto.service';
import { type CreateDeviceDto } from 'iot-core';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let deviceRepository: Repository<Device>;
  let certificateRepository: Repository<Certificate>;
  let cryptoService: CryptoService;

  const mockDevice = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    deviceId: 'test-device-001',
    model: 'TestModel',
    publicKey: 'mock-public-key',
    fingerprint: 'mock-fingerprint',
    ownerId: null,
    status: 'unbound',
    lastSeenAt: new Date(),
    firmwareVersion: null,
    createdAt: new Date(),
  };

  const mockCertificate = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    clientCert: 'mock-client-cert',
    caCert: 'mock-ca-cert',
    fingerprint: 'mock-fingerprint',
    deviceId: 'test-device-001',
    createdAt: new Date(),
  };

  const mockCryptoResult = {
    clientCert: 'mock-client-cert',
    caCert: 'mock-ca-cert',
    fingerprint: 'mock-fingerprint',
    publicKeyPem: 'mock-public-key',
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
    }).compile();

    app = module.createNestApplication();
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
        deviceId: 'test-device-001',
        csrPem: 'mock-csr-pem',
      };

      const response = await request(app.getHttpServer())
        .post('/devices')
        .send(createDeviceDto)
        .expect(201);

      expect(response.body).toEqual({
        device: expect.objectContaining({
          deviceId: 'test-device-001',
          status: 'unbound',
        }),
        certificate: {
          clientCert: 'mock-client-cert',
          caCert: 'mock-ca-cert',
          fingerprint: 'mock-fingerprint',
        },
      });

      expect(cryptoService.signCertificate).toHaveBeenCalledWith({
        deviceId: 'test-device-001',
        csrPem: 'mock-csr-pem',
      });
      expect(deviceRepository.create).toHaveBeenCalled();
      expect(deviceRepository.save).toHaveBeenCalled();
      expect(certificateRepository.create).toHaveBeenCalled();
      expect(certificateRepository.save).toHaveBeenCalled();
    });

    it('should return 400 for invalid request body', async () => {
      const invalidDto = {
        // отсутствует deviceId
        csrPem: 'mock-csr-pem',
      };

      await request(app.getHttpServer())
        .post('/devices')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /devices', () => {
    it('should return list of devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/devices')
        .expect(200);

      expect(response.body).toEqual([mockDevice]);
      expect(deviceRepository.find).toHaveBeenCalledWith({
        relations: ['certificate'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no devices exist', async () => {
      jest.spyOn(deviceRepository, 'find').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/devices')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
