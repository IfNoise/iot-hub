import { Module } from '@nestjs/common';
import { CryptoChipService } from './crypto-chip.service.js';

@Module({
  providers: [CryptoChipService],
  exports: [CryptoChipService],
})
export class CryptoChipModule {}
