import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Device } from '../devices/entities/device.entity';
import { Certificate } from '../devices/entities/certificate.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'iot_core',
  entities: [Device, Certificate],
  synchronize: true, // ❗️Использовать только в разработке
};
