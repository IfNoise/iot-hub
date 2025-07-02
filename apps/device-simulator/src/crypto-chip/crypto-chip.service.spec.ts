import { Test, TestingModule } from '@nestjs/testing';
import { CryptoChipService } from './crypto-chip.service.js';

describe('CryptoChipService', () => {
  let service: CryptoChipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoChipService],
    }).compile();

    service = module.get<CryptoChipService>(CryptoChipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize chip with device ID', async () => {
    const deviceId = 'test-device-001';
    await service.initializeChip(deviceId);

    const chipInfo = service.getChipInfo();
    expect(chipInfo.deviceId).toBe(deviceId);
    expect(chipInfo.hasKeyPair).toBe(true);
    expect(chipInfo.keyType).toBe('RSA');
    expect(chipInfo.keySize).toBe(2048);
  });

  it('should generate RSA key pair', async () => {
    const keyPair = await service.generateKeyPair(2048);

    expect(keyPair).toBeDefined();
    expect(keyPair.keyType).toBe('RSA');
    expect(keyPair.keySize).toBe(2048);
    expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
  });

  it('should get public key after initialization', async () => {
    await service.initializeChip('test-device');
    const publicKey = service.getPublicKey();

    expect(publicKey).toBeDefined();
    expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('should generate CSR', async () => {
    const deviceId = 'test-device-002';
    await service.initializeChip(deviceId);

    const csrData = await service.generateCSR(deviceId);

    expect(csrData).toBeDefined();
    expect(csrData.deviceId).toBe(deviceId);
    expect(csrData.csr).toContain('-----BEGIN CERTIFICATE REQUEST-----');
    expect(csrData.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('should sign and verify data', async () => {
    await service.initializeChip('test-device');
    const testData = 'Hello, World!';

    const signature = service.signData(testData);
    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(0);

    const isValid = service.verifySignature(testData, signature);
    expect(isValid).toBe(true);

    const isInvalid = service.verifySignature('tampered data', signature);
    expect(isInvalid).toBe(false);
  });

  it('should throw error when key pair not initialized', () => {
    expect(() => service.getPublicKey()).toThrow(
      'Ключевая пара не инициализирована'
    );
    expect(() => service.signData('test')).toThrow(
      'Ключевая пара не инициализирована'
    );
  });
});
