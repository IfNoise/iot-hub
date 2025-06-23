import { contracts } from './contracts.js';

describe('contracts', () => {
  it('should be defined', () => {
    expect(contracts).toBeDefined();
    expect(contracts.auth).toBeDefined();
    expect(contracts.devices).toBeDefined();
    expect(contracts.users).toBeDefined();
    expect(contracts.mqtt).toBeDefined();
  });
});
