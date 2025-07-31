import postgres from 'postgres';

const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'iot_hub',
  username: process.env.DB_USER || 'iot_user',
  password: process.env.DB_PASSWORD || 'iot_password',
  ssl: false,
});

async function addDeletedAtColumn() {
  try {
    console.log('🔄 Checking if deleted_at column exists...');

    // Check if column exists
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'deleted_at'
      AND table_schema = 'public'
    `;

    if (result.length === 0) {
      console.log('❌ Column deleted_at does not exist. Adding it...');
      await sql`ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp`;
      console.log('✅ Column deleted_at added successfully');
    } else {
      console.log('✅ Column deleted_at already exists');
    }

    // Verify column exists
    const verification = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'deleted_at'
      AND table_schema = 'public'
    `;

    if (verification.length > 0) {
      console.log('✅ Verification successful: deleted_at column exists');
    } else {
      console.log('❌ Verification failed: deleted_at column does not exist');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

addDeletedAtColumn();
