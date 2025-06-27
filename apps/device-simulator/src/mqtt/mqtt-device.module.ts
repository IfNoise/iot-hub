import { Module } from '@nestjs/common';
import { MqttDeviceService } from './mqtt-device.service';
import { MtlsConfigService } from './mtls-config.service';
import { CertificateClientService } from './certificate-client.service';
import { CryptoChipModule } from '../crypto-chip/crypto-chip.module';

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
  imports: [CryptoChipModule],
  providers: [MqttDeviceService, MtlsConfigService, CertificateClientService],
  exports: [MqttDeviceService, MtlsConfigService, CertificateClientService],
})
export class MqttDeviceModule {}
