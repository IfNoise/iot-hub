import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { join } from 'path';

async function main() {
  console.log('🔄 Starting database migration...');

  const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`;

  console.log(
    `🔌 Connecting to database: ${connectionString.replace(/:[^:]*@/, ':***@')}`
  );

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    // Путь к миграциям относительно корня проекта
    const migrationsFolder = join(process.cwd(), 'drizzle/migrations');
    console.log(`📁 Migrations folder: ${migrationsFolder}`);

    // Выполняем миграции
    console.log('🚀 Running migrations...');
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

main();
