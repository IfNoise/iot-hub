import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { MqttRpcService } from './mqtt-rpc.service.js';
import { MqttRpcController } from './mqtt-rpc.controller.js';

/**
 * MQTT модуль для работы с IoT устройствами
 *
 * Предоставляет функционал для отправки RPC команд устройствам
 * через MQTT брокер и REST API для взаимодействия с клиентскими приложениями.
 *
 * Включает в себя:
 * - MqttRpcService: сервис для управления MQTT подключением и отправки команд
 * - MqttRpcController: REST контроллер для API endpoints
 *
 * @example
 * ```typescript
 * // Импорт в основной модуль приложения
 * @Module({
 *   imports: [MqttModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [ConfigModule],
  controllers: [MqttRpcController],
  providers: [MqttRpcService],
  exports: [MqttRpcService],
})
export class MqttModule {}
