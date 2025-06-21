import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSimulatorService } from './device-simulator.service';
import { CryptoChipService } from '../crypto-chip/crypto-chip.service';

// Mock HttpService
const mockHttpService = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
};

describe('DeviceSimulatorService', () => {
  let service: DeviceSimulatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceSimulatorService,
        CryptoChipService,
        {
          provide: 'HttpService',
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<DeviceSimulatorService>(DeviceSimulatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
