#!/usr/bin/env node

/**
 * Database initialization script for user-management microservice
 * Creates clean database schema with proper naming conventions
 */

const { Pool } = require('pg');

async function initializeDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    user: process.env.DB_USER || 'iot_user',
    password: process.env.DB_PASSWORD || 'iot_password',
    database: process.env.DB_NAME || 'user_management',
  });

  try {
    console.log('🚀 Initializing user_management database...');

    // Создаем таблицу users с правильными именами колонок (camelCase)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" VARCHAR(255) NOT NULL UNIQUE,  -- Keycloak user ID
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        avatar VARCHAR(500),
        balance DECIMAL(10, 2) DEFAULT 0.00,
        plan VARCHAR(20) NOT NULL DEFAULT 'free',
        "planExpiresAt" TIMESTAMP,
        "accountType" VARCHAR(20) NOT NULL DEFAULT 'individual',
        "organizationId" UUID,
        groups JSONB,
        "deviceLimit" INTEGER DEFAULT 5,
        "currentDeviceCount" INTEGER DEFAULT 0,
        "monthlyDataUsage" DECIMAL(15, 2) DEFAULT 0.00,
        metadata JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deletedAt" TIMESTAMP
      );
    `;

    await pool.query(createUsersTable);
    console.log('✅ Table users created successfully');

    // Создаем индексы
    const createIndexes = [
      'CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);',
      'CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_idx ON users("userId");',
      'CREATE INDEX IF NOT EXISTS users_organization_idx ON users("organizationId");',
      'CREATE INDEX IF NOT EXISTS users_plan_idx ON users(plan);',
      'CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users("deletedAt");',
    ];

    for (const indexSql of createIndexes) {
      await pool.query(indexSql);
    }
    console.log('✅ Indexes created successfully');

    // Создаем триггер для автоматического обновления updatedAt
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    await pool.query(createTrigger);
    console.log('✅ Updated trigger created successfully');

    // Проверяем структуру таблицы
    const checkColumns = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const result = await pool.query(checkColumns);
    console.log('📋 Table structure verification:');
    result.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
      );
    });

    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запускаем инициализацию
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
