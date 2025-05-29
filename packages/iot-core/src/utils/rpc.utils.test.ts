import { webcrypto } from 'node:crypto';
import {
  getRequestTopic,
  getResponseTopic,
  validateRpc,
  createValidatedRpcRequest,
} from './rpc.utils';

const { rpcSchemas } = require('../schemas/rpc-methods.schemas');
// Mock dependencies
jest.mock('../schemas/rpc-methods.schemas', () => ({
  rpcSchemas: {
    testMethod: {
      parse: jest.fn(),
    },
    getDeviceState: { parse: jest.fn() },
  },
}));

// Mock crypto for deterministic UUID generation
const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
Object.defineProperty(global, 'crypto', {
  value: {
    ...((global as any).crypto || {}),
    randomUUID: () => mockUuid,
  },
  writable: true,
  configurable: true,
});

describe('RPC Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequestTopic', () => {
    it('should return correctly formatted request topic', () => {
      const userId = 'user123';
      const deviceId = 'device456';
      const topic = getRequestTopic(userId, deviceId);
      expect(topic).toBe('users/user123/devices/device456/rpc/request');
    });
  });

  describe('getResponseTopic', () => {
    it('should return correctly formatted response topic', () => {
      const userId = 'user123';
      const deviceId = 'device456';
      const topic = getResponseTopic(userId, deviceId);
      expect(topic).toBe('users/user123/devices/device456/rpc/response');
    });
  });

  describe('validateRpc', () => {
    it('should validate known methods', () => {
      const params = { on: true };
      validateRpc('getDeviceState', params);
      expect(rpcSchemas.getDeviceState.parse).toHaveBeenCalledWith(params);
    });

    it('should throw error for unknown method', () => {
      expect(() => validateRpc('unknownMethod')).toThrow(
        'Unknown RPC method: unknownMethod'
      );
    });
  });

  describe('createValidatedRpcRequest', () => {
    it('should create a validated RPC request', () => {
      const userId = 'user123';
      const deviceId = 'device456';
      const method = 'testMethod';
      const params = { key: 'value' };

      const result = createValidatedRpcRequest(
        userId,
        deviceId,
        method,
        params
      );

      expect(result).toEqual({
        topic: 'users/user123/devices/device456/rpc/request',
        message: {
          id: mockUuid,
          deviceId: 'device456',
          method: 'testMethod',
          params: { key: 'value' },
        },
      });
      expect(rpcSchemas.testMethod.parse).toHaveBeenCalledWith(params);
    });

    it('should throw error when validation fails', () => {
      const userId = 'user123';
      const deviceId = 'device456';
      const method = 'unknownMethod';

      expect(() => createValidatedRpcRequest(userId, deviceId, method)).toThrow(
        'Unknown RPC method: unknownMethod'
      );
    });
  });
});
