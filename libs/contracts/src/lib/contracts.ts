/**
 * IoT Hub API Contracts
 *
 * Этот файл экспортирует все контракты для различных доменов приложения.
 * Контракты основаны на TS-REST и обеспечивают типобезопасность
 * между клиентом и сервером.
 */

import { authContract } from '@iot-hub/auth';
import { certificatesContract, devicesContract } from '@iot-hub/devices';
import { mqttContract } from '@iot-hub/mqtt';
import { usersContract } from '@iot-hub/users';
import { initContract } from '@ts-rest/core';

// Users contracts
export * from '@iot-hub/users';

// Auth contracts
export * from '@iot-hub/auth';

// Devices contracts
export * from '@iot-hub/devices';

// MQTT contracts
export * from '@iot-hub/mqtt';

const c = initContract();

export const contracts = c.router({
  auth: authContract,
  users: usersContract,
  devices: devicesContract,
  mqtt: mqttContract,
  certificates: certificatesContract,
});
