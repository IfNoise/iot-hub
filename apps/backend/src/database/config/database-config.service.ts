import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfigSchema, DatabaseConfig, createTypeOrmOptionsFromConfig } from './database-config.schema';

@Injectable()
export class DatabaseConfigService {
  private readonly config: DatabaseConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = databaseConfigSchema.parse({
      type: env.DB_TYPE,
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      synchronize: env.DB_SYNCHRONIZE,
      logging: env.DB_LOGGING,
      dropSchema: env.DB_DROP_SCHEMA,
      cache: false, // Фиксированное значение
      ssl: env.DB_SSL,
      extra: {
        connectionTimeoutMillis: 60000,
        max: parseInt(env.DB_POOL_SIZE || '10', 10),
        min: 1,
        idleTimeoutMillis: 30000,
      },
    });
  }

  get<T extends keyof DatabaseConfig>(key: T): DatabaseConfig[T] {
    return this.config[key];
  }

  getAll(): DatabaseConfig {
    return this.config;
  }

  // Get TypeORM configuration
  getTypeOrmConfig(): TypeOrmModuleOptions {
    return createTypeOrmOptionsFromConfig(this.config);
  }

  // Environment-specific configurations
  getDevelopmentConfig(): TypeOrmModuleOptions {
    return {
      ...this.getTypeOrmConfig(),
      synchronize: true,
      logging: true,
      dropSchema: false,
      cache: false,
      ssl: false,
      extra: {
        connectionTimeoutMillis: 60000,
        idleTimeoutMillis: 60000,
      },
    };
  }

  getProductionConfig(): TypeOrmModuleOptions {
    return {
      ...this.getTypeOrmConfig(),
      synchronize: false,
      logging: ['error'],
      dropSchema: false,
      cache: true,
      ssl: true,
      extra: {
        connectionTimeoutMillis: 30000,
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
      },
    };
  }

  getTestConfig(): TypeOrmModuleOptions {
    return {
      ...this.getTypeOrmConfig(),
      synchronize: true,
      logging: false,
      dropSchema: true,
      cache: false,
      ssl: false,
      extra: {
        connectionTimeoutMillis: 10000,
        max: 5,
        min: 1,
        idleTimeoutMillis: 10000,
      },
    };
  }

  // Convenience methods
  getConnectionInfo() {
    return {
      type: this.config.type,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
    };
  }

  isPostgres(): boolean {
    return this.config.type === 'postgres';
  }

  isMysql(): boolean {
    return this.config.type === 'mysql' || this.config.type === 'mariadb';
  }
}
