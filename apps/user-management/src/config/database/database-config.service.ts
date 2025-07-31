import { Injectable } from '@nestjs/common';
import {
  databaseConfigSchema,
  DatabaseConfig,
  DrizzleConnectionOptions,
  DatabaseEnvironmentConfig,
} from './database-config.schema.js';

@Injectable()
export class DatabaseConfigService {
  private readonly config: DatabaseConfig;

  constructor(env: Record<string, string | undefined>) {
    this.config = databaseConfigSchema.parse({
      type: env.DB_TYPE,
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      name: env.DATABASE_NAME,
      ssl: env.DATABASE_SSL,
      poolSize: env.DATABASE_POOL_SIZE,
      poolMin: env.DATABASE_POOL_MIN,
      poolMax: env.DATABASE_POOL_MAX,
      poolIdleTimeout: env.DATABASE_POOL_IDLE_TIMEOUT,
    });
  }

  get<T extends keyof DatabaseConfig>(key: T): DatabaseConfig[T] {
    return this.config[key];
  }

  getAll(): DatabaseConfig {
    return this.config;
  }

  // Get Drizzle connection options
  getDrizzleConnectionOptions(): DrizzleConnectionOptions {
    return {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.name,
      ssl: this.config.ssl,
      max: this.config.poolMax,
      min: this.config.poolMin,
      idleTimeoutMillis: this.config.poolIdleTimeout,
    };
  }

  // Environment-specific configurations
  getDevelopmentConfig(): DatabaseEnvironmentConfig {
    return {
      connection: this.getDrizzleConnectionOptions(),
      logging: true,
      debug: true,
    };
  }

  getProductionConfig(): DatabaseEnvironmentConfig {
    return {
      connection: {
        ...this.getDrizzleConnectionOptions(),
        ssl: true, // Force SSL in production
      },
      logging: false,
      debug: false,
    };
  }

  getTestConfig(): DatabaseEnvironmentConfig {
    return {
      connection: {
        ...this.getDrizzleConnectionOptions(),
        database: `${this.config.name}_test`, // Use test database
      },
      logging: false,
      debug: false,
    };
  }

  // Connection string for migrations or external tools
  getConnectionString(): string {
    const { host, port, user, password, name } = this.config;
    return `postgresql://${user}:${password}@${host}:${port}/${name}`;
  }

  // Database URL for Drizzle
  getDatabaseUrl(): string {
    return this.getConnectionString();
  }
}
