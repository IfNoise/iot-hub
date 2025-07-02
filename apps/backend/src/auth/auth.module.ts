// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { MiddlewareModule } from '../common/middleware/middleware.module.js';

@Module({
  imports: [MiddlewareModule],
  controllers: [AuthController],
})
export class AuthModule {}
