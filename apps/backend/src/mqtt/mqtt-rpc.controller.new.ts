import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { MqttRpcService } from './mqtt-rpc.service';
import { mqttContract } from '@iot-hub/mqtt';

/**
 * Контроллер для отправки RPC команд устройствам через MQTT
 *
 * Предоставляет REST API для отправки команд IoT устройствам
 * с использованием MQTT брокера и RPC протокола.
 */
@ApiTags('MQTT RPC')
@Controller()
export class MqttRpcController {
  private readonly logger = new Logger(MqttRpcController.name);

  constructor(private readonly mqttRpcService: MqttRpcService) {}

  @TsRestHandler(mqttContract.sendDeviceCommand)
  async sendDeviceCommand() {
    return tsRestHandler(mqttContract.sendDeviceCommand, async ({ body }) => {
      const startTime = Date.now();
      const sentAt = new Date().toISOString();

      try {
        this.logger.log(
          `Отправка команды ${body.method} к устройству ${body.deviceId} пользователя ${body.userId}`
        );

        // Отправляем команду через MQTT
        const response = await this.mqttRpcService.sendDeviceCommand(
          body.userId,
          body.deviceId,
          body.method,
          body.params,
          body.timeout
        );

        const executionTime = Date.now() - startTime;
        const receivedAt = new Date().toISOString();

        // Формируем ответ с метаданными
        const result = {
          ...response,
          metadata: {
            executionTime,
            sentAt,
            receivedAt,
          },
        };

        this.logger.log(
          `Получен ответ от устройства ${body.deviceId} за ${executionTime}мс`
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.logger.error(
          `Ошибка при отправке команды к устройству ${body.deviceId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        if (error instanceof Error && error.message.includes('timeout')) {
          return {
            status: 408 as const,
            body: {
              statusCode: 408,
              message: 'Device response timeout',
              error: 'Request Timeout',
            },
          };
        }

        if (error instanceof Error && error.message.includes('MQTT')) {
          return {
            status: 503 as const,
            body: {
              statusCode: 503,
              message: 'MQTT сервис недоступен',
              error: 'Service Unavailable',
            },
          };
        }

        return {
          status: 400 as const,
          body: {
            statusCode: 400,
            message:
              error instanceof Error ? error.message : 'Validation failed',
            error: 'Bad Request',
          },
        };
      }
    });
  }

  @TsRestHandler(mqttContract.sendDeviceCommandNoResponse)
  async sendDeviceCommandNoResponse() {
    return tsRestHandler(
      mqttContract.sendDeviceCommandNoResponse,
      async ({ body }) => {
        const sentAt = new Date().toISOString();

        try {
          this.logger.log(
            `Отправка команды без ожидания ответа ${body.method} к устройству ${body.deviceId} пользователя ${body.userId}`
          );

          // Отправляем команду без ожидания ответа
          await this.mqttRpcService.sendDeviceCommandNoResponse(
            body.userId,
            body.deviceId,
            body.method,
            body.params
          );

          this.logger.log(
            `Команда ${body.method} отправлена устройству ${body.deviceId}`
          );

          return {
            status: 200 as const,
            body: {
              success: true,
              message: `Команда ${body.method} успешно отправлена устройству`,
              metadata: {
                sentAt,
              },
            },
          };
        } catch (error) {
          this.logger.error(
            `Ошибка при отправке команды без ответа к устройству ${
              body.deviceId
            }: ${error instanceof Error ? error.message : 'Unknown error'}`
          );

          if (error instanceof Error && error.message.includes('MQTT')) {
            return {
              status: 503 as const,
              body: {
                statusCode: 503,
                message: 'MQTT сервис недоступен',
                error: 'Service Unavailable',
              },
            };
          }

          return {
            status: 400 as const,
            body: {
              statusCode: 400,
              message:
                error instanceof Error ? error.message : 'Validation failed',
              error: 'Bad Request',
            },
          };
        }
      }
    );
  }

  @TsRestHandler(mqttContract.getMqttStatus)
  async getMqttStatus() {
    return tsRestHandler(mqttContract.getMqttStatus, async () => {
      try {
        this.logger.log('Проверка статуса MQTT клиента');

        const status = await this.mqttRpcService.getConnectionStatus();

        return {
          status: 200 as const,
          body: status,
        };
      } catch (error) {
        this.logger.error(
          `Ошибка при получении статуса MQTT: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        return {
          status: 503 as const,
          body: {
            statusCode: 503,
            message: 'MQTT сервис недоступен',
            error: 'Service Unavailable',
          },
        };
      }
    });
  }
}
