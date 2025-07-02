import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MqttDeviceService } from './mqtt-device.service.js';
import { MtlsConfigService } from './mtls-config.service.js';
import { CertificateClientService } from './certificate-client.service.js';
import { CryptoChipModule } from '../crypto-chip/crypto-chip.module.js';

/**
 * MQTT модуль для симулятора устройства
 *
 * Предоставляет функционал для:
 * - Подключения к MQTT брокеру с поддержкой mTLS
 * - Обработки RPC команд от backend
 * - Отправки ответов устройства
 * - Управления mTLS сертификатами
 * - Получения сертификатов через CSR процесс
 */
@Module({
  imports: [CryptoChipModule, HttpModule],
  providers: [MqttDeviceService, MtlsConfigService, CertificateClientService],
  exports: [MqttDeviceService, MtlsConfigService, CertificateClientService],
})
export class MqttDeviceModule {}
