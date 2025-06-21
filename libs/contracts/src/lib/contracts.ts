import { authContract } from '@iot-hub/auth';
import { certificatesContract, devicesContract } from '@iot-hub/devices';
import { mqttContract } from '@iot-hub/mqtt';
import { usersContract } from '@iot-hub/users';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const contracts = c.router({
  auth: authContract,
  users: usersContract,
  devices: devicesContract,
  certificates: certificatesContract,
  mqtt: mqttContract,
});
