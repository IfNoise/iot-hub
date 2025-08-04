import { z } from 'zod';

export const databaseConfigSchema = z.object({
  // Database Type
  type: z.enum(['postgres', 'mysql', 'sqlite']).default('postgres'),

  // Connection
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  user: z.string().min(3).max(32),
  password: z.string().min(8).max(64),
  name: z.string().min(1).max(64),

  // SSL
  ssl: z.coerce.boolean().default(false),

  // Connection Pool
  poolSize: z.coerce.number().default(10),
  poolMin: z.coerce.number().default(2),
  poolMax: z.coerce.number().default(10),
  poolIdleTimeout: z.coerce.number().default(30000),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// Drizzle connection options interface
export interface DrizzleConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
}

// Environment-specific database configurations
export interface DatabaseEnvironmentConfig {
  connection: DrizzleConnectionOptions;
  logging: boolean;
  debug?: boolean;
}
