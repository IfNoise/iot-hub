import { readFileSync } from 'fs';
import type { Config } from 'jest';

/**
 * Базовая конфигурация Jest для всех проектов в монорепозитории
 */
export function createJestConfig(
  displayName: string,
  projectRoot: string,
  additionalConfig: Partial<Config> = {}
): Config {
  // Чтение SWC конфигурации для spec файлов
  const swcJestConfig = JSON.parse(
    readFileSync(`${projectRoot}/.spec.swcrc`, 'utf-8')
  );

  // Отключаем поиск .swcrc файлов, так как передаем конфиг явно
  swcJestConfig.swcrc = false;

  return {
    displayName,
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
      '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: 'test-output/jest/coverage',
    ...additionalConfig,
  };
}
