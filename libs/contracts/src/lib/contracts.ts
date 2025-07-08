import { authContract } from '@iot-hub/auth';
import { certificatesContract, devicesContract } from '@iot-hub/devices';
import { mqttContract } from '@iot-hub/mqtt';
import { usersContract, organizationsContract } from '@iot-hub/users';
import { appContract } from './app-contracts.js';
import { healthContract } from './health-contracts.js';
import { metricsContract } from './metrics-contracts.js';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const contracts = c.router({
  auth: authContract,
  users: usersContract,
  organizations: organizationsContract,
  devices: devicesContract,
  certificates: certificatesContract,
  mqtt: mqttContract,
  app: appContract,
  health: healthContract,
  metrics: metricsContract,
});
