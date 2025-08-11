import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const databaseUrl = `postgresql://${
    process.env.DATABASE_USER || 'iot_user'
  }:${process.env.DATABASE_PASSWORD || 'iot_password'}@${
    process.env.DATABASE_HOST || 'localhost'
  }:${process.env.DATABASE_PORT || '5434'}/${
    process.env.DATABASE_NAME || 'iot_hub'
  }`;

  console.log(
    'Connecting to database:',
    databaseUrl.replace(/\/\/.*:.*@/, '//***:***@')
  );

  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    console.log('Running migrations...');
    await migrate(db, {
      migrationsFolder: join(__dirname, '../drizzle/migrations'),
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
