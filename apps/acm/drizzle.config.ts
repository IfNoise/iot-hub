import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/database/acm-schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5434,
    user: process.env.DATABASE_USER || 'iot_user',
    password: process.env.DATABASE_PASSWORD || 'iot_password',
    database: process.env.DATABASE_NAME || 'iot_hub',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
