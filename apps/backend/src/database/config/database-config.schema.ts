import { z } from 'zod';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Device } from '../../devices/entities/device.entity.js';
import { Certificate } from '../../devices/entities/certificate.entity.js';
import { User } from '../../users/entities/user.entity.js';

// Define a more specific enum for database types compatible with TypeOrmModuleOptions
export const DatabaseTypeEnum = z.enum([
  'postgres',
  'mysql',
  'mariadb',
  // 'sqlite', // sqlite is not directly in the narrowed TypeOrmModuleOptions type, handle if needed
  // 'mssql', // mssql is not directly in the narrowed TypeOrmModuleOptions type
  // 'oracle', // oracle is not directly in the narrowed TypeOrmModuleOptions type
  'cockroachdb',
  // 'better-sqlite3', // better-sqlite3 is not directly in the narrowed TypeOrmModuleOptions type
  'mongodb',
  // Add other types if they are compatible and needed, for example:
  // 'aurora-mysql',
  // 'sap',
  // 'cordova',
  // 'nativescript',
  // 'react-native',
  // 'sqljs',
  // 'expo',
  // 'aurora-data-api',
  // 'aurora-data-api-pg',
  // 'capacitor',
  // 'spanner'
]);

export const databaseConfigSchema = z.object({
  type: DatabaseTypeEnum.default('postgres'),
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  username: z.string().default('postgres'),
  password: z.string().default('postgres'),
  database: z.string().default('iot_core'),
  synchronize: z.boolean().default(true), // ❗️Использовать только в разработке
  logging: z.boolean().default(false),
  dropSchema: z.boolean().default(false),
  cache: z.boolean().default(false),
  ssl: z.boolean().default(false),
  extra: z
    .object({
      connectionTimeoutMillis: z.number().default(60000),
      max: z.number().default(10), // Максимальное количество соединений в пуле
      min: z.number().default(1), // Минимальное количество соединений в пуле
      idleTimeoutMillis: z.number().default(30000), // Время простоя соединения перед закрытием
    })
    .default({
      connectionTimeoutMillis: 60000,
      max: 10,
      min: 1,
      idleTimeoutMillis: 30000,
    }),
});
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export const createTypeOrmOptionsFromConfig = (
  config: DatabaseConfig
): TypeOrmModuleOptions => {
  return {
    // No cast needed now if DatabaseTypeEnum is a subset of TypeOrmModuleOptions['type']
    type: config.type,
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    synchronize: config.synchronize,
    logging: config.logging,
    dropSchema: config.dropSchema,
    cache: config.cache,
    ssl: config.ssl,
    extra: config.extra,
    entities: [Device, Certificate, User],
    autoLoadEntities: false, // Явно отключаем, так как предоставляем entities
  };
};

export const databaseConfigDefaultValues: DatabaseConfig = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'iot_core',
  synchronize: true,
  logging: false,
  dropSchema: false,
  cache: false,
  ssl: false,
  extra: {
    connectionTimeoutMillis: 60000,
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
  },
};
