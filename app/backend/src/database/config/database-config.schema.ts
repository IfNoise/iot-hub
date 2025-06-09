import { z } from 'zod';
import { DatabaseType } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Device } from '../../devices/entities/device.entity';
import { Certificate } from '../../devices/entities/certificate.entity';

const DatabaseTypeEnum = z.enum([
  'mysql',
  'postgres',
  'cockroachdb',
  'mariadb',
  'sqlite',
  'better-sqlite3',
  'oracle',
  'mssql',
  'mongodb',
]);

export const databaseConfigSchema = z.object({
  type: DatabaseTypeEnum.default('postgres'),
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  username: z.string().default('postgres'),
  password: z.string().default('postgres'),
  database: z.string().default('iot_core'),
  entities: z
    .array(z.string())
    .default(['src/**/*.entity{.ts,.js}', 'dist/**/*.entity{.ts,.js}']),
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
export const databaseConfigDefault: DatabaseConfig = databaseConfigSchema.parse(
  {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'iot_core',
    entities: [Device, Certificate],
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
  }
);
export const databaseConfigSchemaWithDefaults = databaseConfigSchema.merge(
  z.object({
    type: DatabaseTypeEnum.default(databaseConfigDefault.type),
    host: z.string().default(databaseConfigDefault.host),
    port: z.number().default(databaseConfigDefault.port),
    username: z.string().default(databaseConfigDefault.username),
    password: z.string().default(databaseConfigDefault.password),
    database: z.string().default(databaseConfigDefault.database),
    entities: z.array(z.string()).default(databaseConfigDefault.entities),
    synchronize: z.boolean().default(databaseConfigDefault.synchronize),
    logging: z.boolean().default(databaseConfigDefault.logging),
    dropSchema: z.boolean().default(databaseConfigDefault.dropSchema),
    cache: z.boolean().default(databaseConfigDefault.cache),
    ssl: z.boolean().default(databaseConfigDefault.ssl),
    extra: z
      .object({
        connectionTimeoutMillis: z
          .number()
          .default(databaseConfigDefault.extra.connectionTimeoutMillis),
        max: z.number().default(databaseConfigDefault.extra.max),
        min: z.number().default(databaseConfigDefault.extra.min),
        idleTimeoutMillis: z
          .number()
          .default(databaseConfigDefault.extra.idleTimeoutMillis),
      })
      .default(databaseConfigDefault.extra),
  })
);

export const createTypeOrmConfig = (
  config: DatabaseConfig
): TypeOrmModuleOptions => {
  return {
    ...config,
    entities: [], // Будет заполнено через autoLoadEntities или явно
    autoLoadEntities: true, // Автоматическая загрузка сущностей
  };
};
