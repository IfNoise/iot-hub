import { mqtt } from './mqtt.js';

describe('mqtt', () => {
  it('should work', () => {
    expect(mqtt()).toEqual('mqtt');
  });
});
