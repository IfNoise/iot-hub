import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './dist/lib/database/schemas/index.js',
  out: './drizzle/migrations',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5434'),
    user: process.env.DATABASE_USER || 'iot_user',
    password: process.env.DATABASE_PASSWORD || 'iot_password',
    database: process.env.DATABASE_NAME || 'iot_hub',
  },
  verbose: true,
  strict: true,
});
