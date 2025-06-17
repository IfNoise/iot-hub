import * as mqtt from 'mqtt';
import * as fs from 'fs';
import type {
  SimulatorConfig,
  DeviceState,
  DiscreteTimer,
  AnalogTimer,
  DiscreteRegulator,
  AnalogRegulator,
  Irrigator,
  SensorData,
  RPCRequest,
  RPCResponse,
  RebootResponse,
} from './types';

/**
 * Класс симулятора IoT устройства
 */
export class IoTDeviceSimulator {
  private client: mqtt.MqttClient | null = null;
  private deviceState: DeviceState;
  private readonly commandTopic: string;
  private readonly responseTopic: string;
  private startTime = 0;

  constructor(private readonly config: SimulatorConfig) {
    this.deviceState = this.initializeDeviceState();
    this.commandTopic = `users/${config.userId}/devices/${config.deviceId}/rpc/request`;
    this.responseTopic = `users/${config.userId}/devices/${config.deviceId}/rpc/response`;

    console.log(`🚀 Инициализация симулятора устройства:`);
    console.log(`   👤 User ID: ${config.userId}`);
    console.log(`   📱 Device ID: ${config.deviceId}`);
    console.log(`   📡 MQTT: mqtt://${config.mqttHost}:${config.mqttPort}`);
    console.log(`   📥 Command Topic: ${this.commandTopic}`);
    console.log(`   📤 Response Topic: ${this.responseTopic}`);
  }

  /**
   * Инициализация начального состояния устройства
   */
  private initializeDeviceState(): DeviceState {
    return {
      status: 'online',
      uptime: 0,
      temperature: 23.5,
      humidity: 45.2,
      pressure: 1013.25,
      discreteTimers: [
        {
          id: 1,
          enabled: false,
          schedule: '',
          duration: 0,
          channel: 1,
          lastRun: null,
        },
        {
          id: 2,
          enabled: false,
          schedule: '',
          duration: 0,
          channel: 2,
          lastRun: null,
        },
      ],
      analogTimers: [
        {
          id: 1,
          enabled: false,
          schedule: '',
          value: 0,
          channel: 1,
          lastRun: null,
        },
      ],
      discreteRegulators: [
        {
          id: 1,
          enabled: false,
          sensor: 'temperature',
          target: 25,
          hysteresis: 2,
          channel: 1,
          state: false,
        },
      ],
      analogRegulators: [
        {
          id: 1,
          enabled: false,
          sensor: 'humidity',
          target: 50,
          pid: { p: 1, i: 0.1, d: 0.05 },
          channel: 1,
          value: 0,
        },
      ],
      irrigators: [
        {
          id: 1,
          enabled: false,
          schedule: '',
          duration: 300,
          pump: 1,
          moisture: 45,
        },
      ],
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Подключение к MQTT брокеру
   */
  async connect(): Promise<void> {
    const port = this.config.useTLS
      ? this.config.mqttSecurePort
      : this.config.mqttPort;
    const protocol = this.config.useTLS ? 'mqtts' : 'mqtt';
    const brokerUrl = `${protocol}://${this.config.mqttHost}:${port}`;

    const connectOptions: mqtt.IClientOptions = {
      clientId: `device-${this.config.deviceId}`,
      keepalive: this.config.keepalive,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 30000,
    };

    // Настройка mTLS если включено
    if (this.config.useTLS) {
      console.log(`🔐 Настройка mTLS с сертификатами:`);
      console.log(`   📜 Client Cert: ${this.config.certPath}`);
      console.log(`   🔑 Client Key: ${this.config.keyPath}`);
      console.log(`   🏛️  CA Cert: ${this.config.caPath}`);

      try {
        if (this.config.certPath && this.config.keyPath && this.config.caPath) {
          connectOptions.cert = fs.readFileSync(this.config.certPath);
          connectOptions.key = fs.readFileSync(this.config.keyPath);
          connectOptions.ca = fs.readFileSync(this.config.caPath);
          connectOptions.rejectUnauthorized = true;
        } else {
          throw new Error('Не указаны пути к сертификатам для mTLS');
        }
      } catch (error) {
        console.error(
          '❌ Ошибка загрузки сертификатов:',
          (error as Error).message
        );
        throw error;
      }
    }

    this.client = mqtt.connect(brokerUrl, connectOptions);

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT клиент не инициализирован'));
        return;
      }

      this.client.on('connect', () => {
        console.log(`✅ Подключен к MQTT брокеру: ${brokerUrl}`);

        // Подписываемся на команды
        if (this.client) {
          this.client.subscribe(
            this.commandTopic,
            { qos: this.config.qos },
            (err) => {
              if (err) {
                console.error('❌ Ошибка подписки на команды:', err);
                reject(err);
              } else {
                console.log(`📥 Подписка на команды: ${this.commandTopic}`);
                resolve();
              }
            }
          );
        }
      });

      this.client.on('error', (error) => {
        console.error('❌ Ошибка MQTT:', error);
        reject(error);
      });

      this.client.on('message', (topic, message) => {
        this.handleCommand(topic, message);
      });

      this.client.on('offline', () => {
        console.log('⚠️  Устройство отключено от MQTT');
      });

      this.client.on('reconnect', () => {
        console.log('🔄 Переподключение к MQTT...');
      });
    });
  }

  /**
   * Обработка входящих RPC команд
   */
  private handleCommand(topic: string, message: Buffer): void {
    try {
      const command: RPCRequest = JSON.parse(message.toString()) as RPCRequest;
      console.log(`📥 Получена команда: ${command.method} (ID: ${command.id})`);

      // Симуляция времени обработки
      const processingTime = Math.random() * 100 + 50; // 50-150ms

      setTimeout(() => {
        this.processCommand(command);
      }, processingTime);
    } catch (error) {
      console.error('❌ Ошибка парсинга команды:', error);
    }
  }

  /**
   * Обработка конкретной RPC команды
   */
  private processCommand(command: RPCRequest): void {
    const { id, method, params = {} } = command;
    let result: unknown = null;
    let error: { code: number; message: string } | null = null;

    try {
      switch (method) {
        case 'getDeviceState':
          result = this.getDeviceState();
          break;

        case 'getSensors':
          result = this.getSensors();
          break;

        case 'reboot':
          result = this.reboot();
          break;

        case 'updateDiscreteTimer':
          result = this.updateDiscreteTimer(params as Partial<DiscreteTimer>);
          break;

        case 'updateAnalogTimer':
          result = this.updateAnalogTimer(params as Partial<AnalogTimer>);
          break;

        case 'updateDiscreteRegulator':
          result = this.updateDiscreteRegulator(
            params as Partial<DiscreteRegulator>
          );
          break;

        case 'updateAnalogRegulator':
          result = this.updateAnalogRegulator(
            params as Partial<AnalogRegulator>
          );
          break;

        case 'updateIrrigator':
          result = this.updateIrrigator(params as Partial<Irrigator>);
          break;

        default:
          error = {
            code: -32601,
            message: `Метод '${method}' не найден`,
          };
      }
    } catch (err) {
      error = {
        code: -32603,
        message: `Внутренняя ошибка: ${(err as Error).message}`,
      };
    }

    // Отправка ответа
    const response: RPCResponse = {
      id,
      result,
      error: error || undefined,
    };

    this.sendResponse(response);
  }

  /**
   * Отправка ответа на RPC команду
   */
  private sendResponse(response: RPCResponse): void {
    if (!this.client) {
      console.error('❌ MQTT клиент не подключен');
      return;
    }

    const message = JSON.stringify(response);

    this.client.publish(
      this.responseTopic,
      message,
      { qos: this.config.qos },
      (err) => {
        if (err) {
          console.error('❌ Ошибка отправки ответа:', err);
        } else {
          console.log(
            `📤 Отправлен ответ: ${response.id} (${
              response.error ? 'error' : 'success'
            })`
          );
        }
      }
    );
  }

  // === RPC Methods Implementation ===

  /**
   * Получение полного состояния устройства
   */
  private getDeviceState(): DeviceState {
    // Обновляем случайные значения сенсоров
    this.updateSensors();
    this.deviceState.uptime = Date.now() - this.startTime;
    this.deviceState.lastUpdate = new Date().toISOString();

    return { ...this.deviceState };
  }

  /**
   * Получение данных сенсоров
   */
  private getSensors(): SensorData {
    this.updateSensors();

    return {
      temperature: this.deviceState.temperature,
      humidity: this.deviceState.humidity,
      pressure: this.deviceState.pressure,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Перезагрузка устройства
   */
  private reboot(): RebootResponse {
    console.log('🔄 Симуляция перезагрузки устройства...');

    // Сброс uptime
    this.startTime = Date.now();
    this.deviceState.uptime = 0;

    // Временно меняем статус
    this.deviceState.status = 'rebooting';

    setTimeout(() => {
      this.deviceState.status = 'online';
      console.log('✅ Устройство перезагружено');
    }, 3000);

    return {
      success: true,
      message: 'Устройство перезагружается...',
      estimatedTime: 3000,
    };
  }

  /**
   * Обновление дискретного таймера
   */
  private updateDiscreteTimer(params: Partial<DiscreteTimer>): DiscreteTimer {
    const { id, enabled, schedule, duration, channel } = params;

    if (!id) {
      throw new Error('ID таймера является обязательным параметром');
    }

    const timer = this.deviceState.discreteTimers.find((t) => t.id === id);
    if (!timer) {
      throw new Error(`Дискретный таймер с ID ${id} не найден`);
    }

    if (enabled !== undefined) timer.enabled = enabled;
    if (schedule !== undefined) timer.schedule = schedule;
    if (duration !== undefined) timer.duration = duration;
    if (channel !== undefined) timer.channel = channel;

    console.log(
      `⏰ Обновлен дискретный таймер ${id}: enabled=${timer.enabled}, channel=${timer.channel}`
    );

    return { ...timer };
  }

  /**
   * Обновление аналогового таймера
   */
  private updateAnalogTimer(params: Record<string, unknown>) {
    const { id, enabled, schedule, value, channel } = params;

    if (!id) {
      throw new Error('ID таймера является обязательным параметром');
    }

    const timer = this.deviceState.analogTimers.find((t) => t.id === id);
    if (!timer) {
      throw new Error(`Аналоговый таймер с ID ${id} не найден`);
    }

    if (enabled !== undefined) timer.enabled = enabled;
    if (schedule !== undefined) timer.schedule = schedule;
    if (value !== undefined) timer.value = value;
    if (channel !== undefined) timer.channel = channel;

    console.log(
      `📊 Обновлен аналоговый таймер ${id}: enabled=${timer.enabled}, value=${timer.value}`
    );

    return { ...timer };
  }

  /**
   * Обновление дискретного регулятора
   */
  private updateDiscreteRegulator(params: Record<string, unknown>) {
    const { id, enabled, sensor, target, hysteresis, channel } = params;

    if (!id) {
      throw new Error('ID регулятора является обязательным параметром');
    }

    const regulator = this.deviceState.discreteRegulators.find(
      (r) => r.id === id
    );
    if (!regulator) {
      throw new Error(`Дискретный регулятор с ID ${id} не найден`);
    }

    if (enabled !== undefined) regulator.enabled = enabled;
    if (sensor !== undefined) regulator.sensor = sensor;
    if (target !== undefined) regulator.target = target;
    if (hysteresis !== undefined) regulator.hysteresis = hysteresis;
    if (channel !== undefined) regulator.channel = channel;

    console.log(
      `🎛️  Обновлен дискретный регулятор ${id}: target=${regulator.target}°C`
    );

    return { ...regulator };
  }

  /**
   * Обновление аналогового регулятора
   */
  private updateAnalogRegulator(
    params: Partial<AnalogRegulator>
  ): AnalogRegulator {
    const { id, enabled, sensor, target, pid, channel } = params;

    if (!id) {
      throw new Error('ID регулятора является обязательным параметром');
    }

    const regulator = this.deviceState.analogRegulators.find(
      (r) => r.id === id
    );
    if (!regulator) {
      throw new Error(`Аналоговый регулятор с ID ${id} не найден`);
    }

    if (enabled !== undefined) regulator.enabled = enabled;
    if (sensor !== undefined) regulator.sensor = sensor;
    if (target !== undefined) regulator.target = target;
    if (pid !== undefined) regulator.pid = { ...regulator.pid, ...pid };
    if (channel !== undefined) regulator.channel = channel;

    console.log(
      `📈 Обновлен аналоговый регулятор ${id}: target=${regulator.target}%`
    );

    return { ...regulator };
  }

  /**
   * Обновление ирригатора
   */
  private updateIrrigator(params: Partial<Irrigator>): Irrigator {
    const { id, enabled, schedule, duration, pump } = params;

    if (!id) {
      throw new Error('ID ирригатора является обязательным параметром');
    }

    const irrigator = this.deviceState.irrigators.find((i) => i.id === id);
    if (!irrigator) {
      throw new Error(`Ирригатор с ID ${id} не найден`);
    }

    if (enabled !== undefined) irrigator.enabled = enabled;
    if (schedule !== undefined) irrigator.schedule = schedule;
    if (duration !== undefined) irrigator.duration = duration;
    if (pump !== undefined) irrigator.pump = pump;

    console.log(
      `💧 Обновлен ирригатор ${id}: enabled=${irrigator.enabled}, duration=${irrigator.duration}s`
    );

    return { ...irrigator };
  }

  /**
   * Обновление значений сенсоров (симуляция)
   */
  private updateSensors(): void {
    // Симуляция изменения температуры (±0.5°C)
    this.deviceState.temperature += (Math.random() - 0.5) * 1.0;
    this.deviceState.temperature =
      Math.round(this.deviceState.temperature * 10) / 10;

    // Симуляция изменения влажности (±2%)
    this.deviceState.humidity += (Math.random() - 0.5) * 4.0;
    this.deviceState.humidity = Math.max(
      0,
      Math.min(100, Math.round(this.deviceState.humidity * 10) / 10)
    );

    // Симуляция изменения давления (±1 hPa)
    this.deviceState.pressure += (Math.random() - 0.5) * 2.0;
    this.deviceState.pressure =
      Math.round(this.deviceState.pressure * 100) / 100;
  }

  /**
   * Запуск симулятора
   */
  async start(): Promise<void> {
    try {
      this.startTime = Date.now();
      await this.connect();

      // Запуск периодического обновления сенсоров
      setInterval(() => {
        this.updateSensors();
      }, 5000);

      console.log('🎯 Симулятор устройства запущен и готов к работе!');
      console.log('   📊 Сенсоры обновляются каждые 5 секунд');
      console.log('   ⌨️  Нажмите Ctrl+C для остановки');
    } catch (error) {
      console.error('💥 Ошибка запуска симулятора:', error);
      throw error;
    }
  }

  /**
   * Остановка симулятора
   */
  stop(): void {
    console.log('\n👋 Остановка симулятора...');

    if (this.client) {
      this.client.end();
    }

    console.log('✅ Симулятор остановлен');
  }
}
