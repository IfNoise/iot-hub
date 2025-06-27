import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Device } from '../devices/entities/device.entity';
import { Certificate } from '../devices/entities/certificate.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'iot_core',
  entities: [Device, Certificate],
  synchronize: true, // ❗️Использовать только в разработке
  ssl: false, // Отключаем SSL для Docker окружения
};
