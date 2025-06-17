// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MiddlewareModule } from '../common/middleware/middleware.module';

@Module({
  imports: [MiddlewareModule],
  controllers: [AuthController],
})
export class AuthModule {}
