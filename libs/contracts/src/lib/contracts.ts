import { authContract } from '@iot-hub/auth';
import { certificatesContract, devicesContract } from '@iot-hub/devices';
import { mqttContract } from '@iot-hub/mqtt';
import { usersContract, organizationsContract } from '@iot-hub/users';
import { healthContract } from './health-contracts.js';
import { metricsContract } from './metrics-contracts.js';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const contracts = c.router({
  ...authContract,
  ...usersContract,
  ...organizationsContract,
  ...devicesContract,
  ...certificatesContract,
  ...mqttContract,
  ...healthContract,
  ...metricsContract,
});
