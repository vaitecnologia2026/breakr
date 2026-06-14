// Modulo do painel inicial (agregacao read-only).
import { Module } from '@nestjs/common';
import { PainelService } from './painel.service';
import { PainelController } from './painel.controller';

@Module({
  controllers: [PainelController],
  providers: [PainelService],
})
export class PainelModule {}
