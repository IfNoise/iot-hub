import * as sharedLib from '../index.js';

describe('shared library', () => {
  it('should export shared modules', () => {
    expect(sharedLib).toBeDefined();
    expect(typeof sharedLib).toBe('object');
  });
});
