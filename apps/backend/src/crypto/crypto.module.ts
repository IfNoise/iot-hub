import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service.js';

@Module({
  providers: [CryptoService],
  exports: [CryptoService], // Export CryptoService for use in other modules
})
export class CryptoModule {}
