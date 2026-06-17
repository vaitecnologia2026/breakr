// Módulo do teste DISC (recrutamento).
import { Module } from '@nestjs/common';
import { DiscService } from './disc.service';
import { DiscPublicoController, DiscAdminController } from './disc.controller';

@Module({
  controllers: [DiscPublicoController, DiscAdminController],
  providers: [DiscService],
})
export class DiscModule {}
