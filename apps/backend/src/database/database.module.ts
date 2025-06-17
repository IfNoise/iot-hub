import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService
      ): Promise<TypeOrmModuleOptions> => {
        return configService.getDatabaseConfig();
      },
    }),
  ],
})
export class DatabaseModule {}
