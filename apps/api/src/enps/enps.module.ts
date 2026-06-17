// Módulo de eNPS (NPS interno do time).
import { Module } from '@nestjs/common';
import { EnpsService } from './enps.service';
import { EnpsController } from './enps.controller';

@Module({
  controllers: [EnpsController],
  providers: [EnpsService],
})
export class EnpsModule {}
