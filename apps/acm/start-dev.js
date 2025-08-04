#!/usr/bin/env node

/**
 * Простой скрипт для запуска ACM микросервиса в режиме разработки
 * Обходит проблемы с webpack и использует прямую компиляцию TypeScript
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Компилируем TypeScript с watch режимом
const tscProcess = spawn('npx', ['tsc', '--build', '--watch'], {
  cwd: __dirname,
  stdio: 'inherit',
});

// После компиляции запускаем Node.js
setTimeout(() => {
  const nodeProcess = spawn(
    'node',
    ['--experimental-specifier-resolution=node', 'dist/main.js'],
    {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    }
  );

  nodeProcess.on('exit', (code) => {
    console.log(`ACM service exited with code ${code}`);
    tscProcess.kill();
    process.exit(code);
  });
}, 3000);

tscProcess.on('exit', (code) => {
  console.log(`TypeScript compiler exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('Stopping ACM development server...');
  tscProcess.kill();
  process.exit(0);
});
