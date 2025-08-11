import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle, type Sql } from '@iot-hub/shared';
import { ConfigService } from '../../config/config.service.js';
import postgres from 'postgres';
import { usersTable, organizationsTable, groupsTable } from '@iot-hub/shared';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client: Sql;
  public db: ReturnType<typeof drizzle>;
  public schema: {
    usersTable: typeof usersTable;
    organizationsTable: typeof organizationsTable;
    groupsTable: typeof groupsTable;
  };

  constructor(private readonly configService: ConfigService) {
    const databaseConfig = this.configService.getDatabaseConfig();
    this.client = postgres(this.configService.getDatabaseUrl(), {
      max: databaseConfig.connection.max,
      idle_timeout: databaseConfig.connection.idleTimeoutMillis,
      debug: databaseConfig.debug,
    });

    // Используем shared схемы с namespace 'acm'
    this.schema = {
      usersTable: usersTable,
      organizationsTable: organizationsTable,
      groupsTable: groupsTable,
    };

    this.db = drizzle(this.client, {
      schema: this.schema,
      logger: databaseConfig.logging,
    });
  }

  async onModuleInit() {
    // Test connection
    try {
      console.log('🔄 Testing database connection...');
      await this.client`SELECT 1`;
      console.log('✅ Database connection successful');

      // Log connection details in development
      if (this.configService.isDevelopment()) {
        const config = this.configService.database.getAll();
        console.log(
          `📊 Connected to: ${config.host}:${config.port}/${config.name}`
        );
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      // Don't throw error for now, just log it
      console.log('⚠️ Continuing without database connection...');
    }
  }

  async onModuleDestroy() {
    await this.client.end();
    console.log('🔌 Database connection closed');
  }

  // Getter for easy access to database config
  get databaseConfig() {
    return this.configService.getDatabaseConfig();
  }
}
