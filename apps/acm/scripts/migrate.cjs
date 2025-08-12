#!/usr/bin/env node

/**
 * ACM Migration Runner
 *
 * Запускает миграции для ACM-специфичных таблиц
 */

const { execSync } = require('child_process');

const DRIZZLE_CONFIG = 'drizzle.config.ts';

console.log('🚀 Running ACM database migrations...');

try {
  // Запускаем миграции
  execSync(`npx drizzle-kit migrate --config=${DRIZZLE_CONFIG}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('✅ ACM migrations completed successfully!');
  console.log('📊 Database now contains only ACM-required tables:');
  console.log('  - users (пользователи)');
  console.log('  - organizations (организации)');
  console.log('  - groups (группы)');
  console.log('');
  console.log('🚫 Excluded from ACM:');
  console.log('  - devices (управляется в device services)');
  console.log('  - certificates (управляется в cert services)');
} catch (error) {
  console.error('❌ Error running migrations:', error.message);
  process.exit(1);
}
