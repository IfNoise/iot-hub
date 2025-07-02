const { getJestProjects } = require('@nx/jest');

module.exports = {
  displayName: 'backend',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.[jt]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2020',
          target: 'ES2020',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@iot-hub/auth$': '<rootDir>/../../libs/contracts/auth/src/index.ts',
    '^@iot-hub/contracts$': '<rootDir>/../../libs/contracts/src/index.ts',
    '^@iot-hub/crypto$': '<rootDir>/../../libs/contracts/crypto/src/index.ts',
    '^@iot-hub/devices$': '<rootDir>/../../libs/contracts/devices/src/index.ts',
    '^@iot-hub/mqtt$': '<rootDir>/../../libs/contracts/mqtt/src/index.ts',
    '^@iot-hub/shared$': '<rootDir>/../../libs/shared/src/index.ts',
    '^@iot-hub/users$': '<rootDir>/../../libs/contracts/users/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/backend',
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};
