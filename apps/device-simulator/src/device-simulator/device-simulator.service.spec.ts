import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { DeviceSimulatorService } from './device-simulator.service';
import { CryptoChipService } from '../crypto-chip/crypto-chip.service';
import { MqttDeviceService } from '../mqtt/mqtt-device.service';
import { CertificateClientService } from '../mqtt/certificate-client.service';
import { MtlsConfigService } from '../mqtt/mtls-config.service';

// Mock HttpService
const mockHttpService = {
  post: jest.fn().mockReturnValue(
    of({
      data: { success: true, deviceId: 'test-device-001' },
    })
  ),
  put: jest.fn().mockReturnValue(of({ data: { success: true } })),
  get: jest.fn().mockReturnValue(of({ data: { success: true } })),
};

// Mock MqttDeviceService
const mockMqttDeviceService = {
  connectWithSsl: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  subscribe: jest.fn().mockResolvedValue(true),
  publish: jest.fn().mockResolvedValue(true),
  isConnected: jest.fn().mockReturnValue(false),
};

// Mock CertificateClientService
const mockCertificateClientService = {
  obtainCertificate: jest.fn().mockResolvedValue({
    certificate: 'mock-certificate',
    privateKey: 'mock-private-key',
    caCertificate: 'mock-ca-certificate',
  }),
  generateCsr: jest.fn().mockResolvedValue('mock-csr'),
};

// Mock MtlsConfigService
const mockMtlsConfigService = {
  generateMtlsConfig: jest.fn().mockReturnValue({
    cert: 'mock-cert-path',
    key: 'mock-key-path',
    ca: 'mock-ca-path',
  }),
  validateCertificates: jest.fn().mockReturnValue(true),
  getStandardCertPaths: jest.fn().mockReturnValue({
    cert: '/path/to/cert.pem',
    key: '/path/to/key.pem',
    ca: '/path/to/ca.pem',
  }),
  loadCertificatesFromFiles: jest.fn().mockReturnValue({
    cert: 'cert-content',
    key: 'key-content',
    ca: 'ca-content',
  }),
  validateMtlsConfig: jest.fn().mockReturnValue(true),
  saveCertificatesToFiles: jest.fn().mockResolvedValue(true),
};

describe('DeviceSimulatorService', () => {
  let service: DeviceSimulatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceSimulatorService,
        CryptoChipService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: MqttDeviceService,
          useValue: mockMqttDeviceService,
        },
        {
          provide: CertificateClientService,
          useValue: mockCertificateClientService,
        },
        {
          provide: MtlsConfigService,
          useValue: mockMtlsConfigService,
        },
      ],
    }).compile();

    service = module.get<DeviceSimulatorService>(DeviceSimulatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Дополнительный сброс для моков с возвращением дефолтных значений
    mockHttpService.post.mockReturnValue(
      of({
        data: { success: true, deviceId: 'test-device-001' },
      })
    );
    mockHttpService.put.mockReturnValue(of({ data: { success: true } }));
    mockHttpService.get.mockReturnValue(of({ data: { success: true } }));

    mockMqttDeviceService.connectWithSsl.mockResolvedValue(true);
    mockMqttDeviceService.disconnect.mockResolvedValue(true);
    mockMqttDeviceService.subscribe.mockResolvedValue(true);
    mockMqttDeviceService.publish.mockResolvedValue(true);
    mockMqttDeviceService.isConnected.mockReturnValue(false);

    mockCertificateClientService.obtainCertificate.mockResolvedValue({
      certificate: 'mock-certificate',
      privateKey: 'mock-private-key',
      caCertificate: 'mock-ca-certificate',
    });
    mockCertificateClientService.generateCsr.mockResolvedValue('mock-csr');

    mockMtlsConfigService.generateMtlsConfig.mockReturnValue({
      cert: 'mock-cert-path',
      key: 'mock-key-path',
      ca: 'mock-ca-path',
    });
    mockMtlsConfigService.validateCertificates.mockReturnValue(true);
    mockMtlsConfigService.getStandardCertPaths.mockReturnValue({
      cert: '/path/to/cert.pem',
      key: '/path/to/key.pem',
      ca: '/path/to/ca.pem',
    });
    mockMtlsConfigService.loadCertificatesFromFiles.mockReturnValue({
      cert: 'cert-content',
      key: 'key-content',
      ca: 'ca-content',
    });
    mockMtlsConfigService.validateMtlsConfig.mockReturnValue(true);
    mockMtlsConfigService.saveCertificatesToFiles.mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should configure device', async () => {
    const config = {
      deviceId: 'test-device-001',
      model: 'Test Device',
      firmwareVersion: '1.0.0',
      backendUrl: 'http://localhost:3000',
      autoRegister: false,
    };

    await service.configureDevice(config);

    const deviceState = service.getDeviceState();
    const deviceConfig = service.getDeviceConfig();

    expect(deviceState.id).toBe(config.deviceId);
    expect(deviceState.status).toBe('initialized');
    expect(deviceConfig).toEqual(config);
  });

  it('should get device state', () => {
    const state = service.getDeviceState();

    expect(state).toBeDefined();
    expect(state.id).toBe('');
    expect(state.status).toBe('uninitialized');
  });

  it('should get sensor data', () => {
    const sensorData = service.getSensorData();

    expect(sensorData).toBeDefined();
    expect(sensorData.temperature).toBeDefined();
    expect(sensorData.humidity).toBeDefined();
    expect(sensorData.pressure).toBeDefined();
    expect(sensorData.timestamp).toBeInstanceOf(Date);
  });

  it('should get crypto chip info', async () => {
    const config = {
      deviceId: 'test-device-002',
      model: 'Test Device',
      firmwareVersion: '1.0.0',
      backendUrl: 'http://localhost:3000',
      autoRegister: false,
    };

    await service.configureDevice(config);
    const cryptoInfo = service.getCryptoChipInfo();

    expect(cryptoInfo).toBeDefined();
    expect(cryptoInfo.deviceId).toBe(config.deviceId);
    expect(cryptoInfo.hasKeyPair).toBe(true);
  });

  it('should register device with auto register', async () => {
    const config = {
      deviceId: 'test-device-003',
      model: 'Test Device',
      firmwareVersion: '1.0.0',
      backendUrl: 'http://localhost:3000',
      autoRegister: true,
    };

    await service.configureDevice(config);

    // После конфигурирования с autoRegister=true, устройство должно быть зарегистрировано
    const deviceState = service.getDeviceState();
    expect(deviceState.status).toBe('registered');
  });

  it('should bind device to user', async () => {
    const config = {
      deviceId: 'test-device-004',
      model: 'Test Device',
      firmwareVersion: '1.0.0',
      backendUrl: 'http://localhost:3000',
      autoRegister: false,
    };
    const userId = 'test-user-123';

    await service.configureDevice(config);
    await service.bindToUser(userId);

    const deviceState = service.getDeviceState();
    expect(deviceState.status).toBe('bound');
    expect(deviceState.ownerId).toBe(userId);
  });

  it('should stop simulation', async () => {
    await service.stopSimulation();

    // Проверяем, что метод выполняется без ошибок
    expect(true).toBe(true);
  });
});
