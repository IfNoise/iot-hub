#!/usr/bin/env node

/**
 * ACM Migration Generator
 *
 * Генерирует миграции только для таблиц, используемых в ACM сервисе:
 * - users
 * - organizations
 * - groups
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DRIZZLE_CONFIG = 'drizzle.config.ts';
const MIGRATIONS_DIR = 'drizzle/migrations';

console.log('🔄 Generating ACM-specific migrations...');

try {
  // Убеждаемся, что директория для миграций существует
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    console.log(`✅ Created migrations directory: ${MIGRATIONS_DIR}`);
  }

  // Генерируем миграции
  execSync(`npx drizzle-kit generate --config=${DRIZZLE_CONFIG}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('✅ ACM migrations generated successfully!');
  console.log('📁 Generated files location:', path.resolve(MIGRATIONS_DIR));
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Review the generated migration files');
  console.log('2. Run migrations: npm run migrate');
  console.log(
    '3. ACM service will use only users, organizations, and groups tables'
  );
} catch (error) {
  console.error('❌ Error generating migrations:', error.message);
  process.exit(1);
}
