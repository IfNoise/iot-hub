import { organizationsContract, usersContract } from '@iot-hub/users';
import { acmContract, groupsContract } from '@iot-hub/acm-contracts';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const acmServiceContract = c.router({
  acm: acmContract,
  users: usersContract,
  organizations: organizationsContract,
  groups: groupsContract,
});
