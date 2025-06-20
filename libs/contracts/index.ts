/**
 * IoT Hub API Contracts
 *
 * Этот файл экспортирует все контракты для различных доменов приложения.
 * Контракты основаны на TS-REST и обеспечивают типобезопасность
 * между клиентом и сервером.
 */

// Users contracts
export * from '@iot-hub/users';

// Auth contracts
export * from '@iot-hub/auth';

// Devices contracts
export * from '@iot-hub/devices';

// MQTT contracts
export * from '@iot-hub/mqtt';

// Crypto contracts
export {
  CertificatesContract as CryptoCertificatesContract,
  CryptoContract,
} from '@iot-hub/crypto';
export * from '@iot-hub/crypto';
