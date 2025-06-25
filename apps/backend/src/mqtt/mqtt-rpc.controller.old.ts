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
 *
 * @example
 * ```bash
 * # Получить состояние устройства
 * curl -X POST http://localhost:3000/api/mqtt/device/command \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "userId": "user123",
 *     "deviceId": "device456",
 *     "method": "getDeviceState",
 *     "params": {},
 *     "timeout": 5000
 *   }'
 * ```
 */
@ApiTags('MQTT RPC')
@Controller('mqtt')
@UsePipes(ZodValidationPipe)
export class MqttRpcController {
  private readonly logger = new Logger(MqttRpcController.name);

  constructor(private readonly mqttRpcService: MqttRpcService) {}

  /**
   * Отправляет команду устройству и ожидает ответ
   *
   * @param command - Параметры команды (userId, deviceId, method, params, timeout)
   * @returns Ответ от устройства или информация об ошибке
   */
  @Post('device/command')
  @ApiOperation({
    summary: 'Отправить команду устройству с ожиданием ответа',
    description: `
      Отправляет RPC команду IoT устройству через MQTT брокер и ожидает ответ.
      
      Поддерживаемые методы:
      - getDeviceState: получить состояние устройства
      - getSensors: получить данные сенсоров
      - reboot: перезагрузить устройство
      - updateDiscreteTimer: обновить дискретный таймер
      - updateAnalogTimer: обновить аналоговый таймер
      - updateDiscreteRegulator: обновить дискретный регулятор
      - updateAnalogRegulator: обновить аналоговый регулятор
      - updateIrrigator: обновить настройки ирригатора
    `,
  })
  @ApiBody({
    type: DeviceCommandDto,
    description: 'Параметры команды устройству',
    examples: {
      getDeviceState: {
        summary: 'Получить состояние устройства',
        value: {
          userId: 'user123',
          deviceId: 'device456',
          method: 'getDeviceState',
          params: {},
          timeout: 5000,
        },
      },
      getSensors: {
        summary: 'Получить данные сенсоров',
        value: {
          userId: 'user123',
          deviceId: 'device456',
          method: 'getSensors',
          params: {},
          timeout: 5000,
        },
      },
      reboot: {
        summary: 'Перезагрузить устройство',
        value: {
          userId: 'user123',
          deviceId: 'device456',
          method: 'reboot',
          params: {},
          timeout: 10000,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Команда успешно выполнена',
    type: DeviceCommandResponseDto,
    examples: {
      success: {
        summary: 'Успешный ответ',
        value: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          result: {
            status: 'online',
            temperature: 23.5,
            humidity: 45.2,
          },
          metadata: {
            executionTime: 150,
            sentAt: '2024-01-15T10:30:00.000Z',
            receivedAt: '2024-01-15T10:30:00.150Z',
          },
        },
      },
      error: {
        summary: 'Ответ с ошибкой',
        value: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          error: {
            code: -1,
            message: 'Device not responding',
          },
          metadata: {
            executionTime: 5000,
            sentAt: '2024-01-15T10:30:00.000Z',
            receivedAt: '2024-01-15T10:30:05.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Неверные параметры запроса',
    example: {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'MQTT сервис недоступен',
    example: {
      statusCode: 503,
      message: 'MQTT клиент не подключен к брокеру',
      error: 'Service Unavailable',
    },
  })
  @ApiResponse({
    status: HttpStatus.REQUEST_TIMEOUT,
    description: 'Таймаут ожидания ответа от устройства',
    example: {
      statusCode: 408,
      message: 'Device response timeout',
      error: 'Request Timeout',
    },
  })
  async sendDeviceCommand(
    @Body() command: DeviceCommandDto
  ): Promise<DeviceCommandResponseDto> {
    const startTime = Date.now();
    const sentAt = new Date().toISOString();
    let validatedCommand: DeviceCommand | undefined;

    try {
      // Валидируем входные данные
      validatedCommand = DeviceCommandSchema.parse(command);

      this.logger.log(
        `Отправка команды ${validatedCommand.method} к устройству ${validatedCommand.deviceId} пользователя ${validatedCommand.userId}`
      );

      // Отправляем команду через MQTT
      const response = await this.mqttRpcService.sendDeviceCommand(
        validatedCommand.userId,
        validatedCommand.deviceId,
        validatedCommand.method,
        validatedCommand.params,
        validatedCommand.timeout
      );

      const executionTime = Date.now() - startTime;
      const receivedAt = new Date().toISOString();

      // Формируем ответ с метаданными
      const result: DeviceCommandResponseDto = {
        ...response,
        metadata: {
          executionTime,
          sentAt,
          receivedAt,
        },
      };

      this.logger.log(
        `Получен ответ от устройства ${validatedCommand.deviceId} за ${executionTime}мс`
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const deviceId = validatedCommand?.deviceId || 'unknown';

      this.logger.error(
        `Ошибка при отправке команды к устройству ${deviceId}:`,
        error
      );

      // Определяем тип ошибки и соответствующий HTTP статус
      if (error instanceof Error) {
        if (
          error.message.includes('timeout') ||
          error.message.includes('RPC timeout')
        ) {
          throw new HttpException(
            {
              statusCode: HttpStatus.REQUEST_TIMEOUT,
              message: 'Device response timeout',
              error: 'Request Timeout',
              details: {
                executionTime,
                sentAt,
                originalError: error.message,
              },
            },
            HttpStatus.REQUEST_TIMEOUT
          );
        }

        if (
          error.message.includes('не подключен') ||
          error.message.includes('not connected')
        ) {
          throw new HttpException(
            {
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              message: 'MQTT клиент не подключен к брокеру',
              error: 'Service Unavailable',
              details: {
                executionTime,
                sentAt,
                originalError: error.message,
              },
            },
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
      }

      // Общая ошибка сервера
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Внутренняя ошибка сервера',
          error: 'Internal Server Error',
          details: {
            executionTime,
            sentAt,
            originalError:
              error instanceof Error ? error.message : 'Unknown error',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Отправляет команду устройству без ожидания ответа
   *
   * @param command - Параметры команды (userId, deviceId, method, params)
   * @returns Подтверждение отправки
   */
  @Post('device/command/no-response')
  @ApiOperation({
    summary: 'Отправить команду устройству без ожидания ответа',
    description: `
      Отправляет RPC команду IoT устройству через MQTT брокер без ожидания ответа.
      Используется для команд, которые не требуют подтверждения выполнения.
    `,
  })
  @ApiBody({
    type: DeviceCommandNoResponseDto,
    description: 'Параметры команды устройству',
    examples: {
      reboot: {
        summary: 'Перезагрузить устройство',
        value: {
          userId: 'user123',
          deviceId: 'device456',
          method: 'reboot',
          params: {},
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Команда успешно отправлена',
    example: {
      success: true,
      message: 'Команда отправлена устройству',
      metadata: {
        sentAt: '2024-01-15T10:30:00.000Z',
        method: 'reboot',
        deviceId: 'device456',
        userId: 'user123',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Неверные параметры запроса',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'MQTT сервис недоступен',
  })
  async sendDeviceCommandNoResponse(
    @Body() command: DeviceCommandNoResponseDto
  ) {
    const sentAt = new Date().toISOString();
    let validatedCommand: DeviceCommandNoResponse | undefined;

    try {
      // Валидируем входные данные
      validatedCommand = DeviceCommandNoResponseSchema.parse(command);

      this.logger.log(
        `Отправка команды без ответа ${validatedCommand.method} к устройству ${validatedCommand.deviceId} пользователя ${validatedCommand.userId}`
      );

      // Отправляем команду через MQTT
      await this.mqttRpcService.sendDeviceCommandNoResponse(
        validatedCommand.userId,
        validatedCommand.deviceId,
        validatedCommand.method,
        validatedCommand.params
      );

      this.logger.log(
        `Команда ${validatedCommand.method} отправлена к устройству ${validatedCommand.deviceId}`
      );

      return {
        success: true,
        message: 'Команда отправлена устройству',
        metadata: {
          sentAt,
          method: validatedCommand.method,
          deviceId: validatedCommand.deviceId,
          userId: validatedCommand.userId,
        },
      };
    } catch (error) {
      const deviceId = validatedCommand?.deviceId || 'unknown';

      this.logger.error(
        `Ошибка при отправке команды без ответа к устройству ${deviceId}:`,
        error
      );

      if (error instanceof Error && error.message.includes('не подключен')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'MQTT клиент не подключен к брокеру',
            error: 'Service Unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Внутренняя ошибка сервера',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Получить статус подключения к MQTT брокеру
   *
   * @returns Статус подключения
   */
  @Post('status')
  @ApiOperation({
    summary: 'Получить статус подключения к MQTT брокеру',
    description:
      'Возвращает информацию о текущем состоянии подключения к MQTT брокеру',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Статус подключения',
    example: {
      connected: true,
      timestamp: '2024-01-15T10:30:00.000Z',
    },
  })
  getMqttStatus() {
    const connected = this.mqttRpcService.isConnected();

    this.logger.log(
      `Запрос статуса MQTT: ${connected ? 'подключен' : 'отключен'}`
    );

    return {
      connected,
      timestamp: new Date().toISOString(),
    };
  }
}
