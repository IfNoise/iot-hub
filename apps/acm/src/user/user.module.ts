import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { KafkaModule } from '../infrastructure/kafka/kafka.module.js';

@Module({
  imports: [KafkaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
