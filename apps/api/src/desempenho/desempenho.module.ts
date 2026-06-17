// Módulo de avaliações de desempenho.
import { Module } from '@nestjs/common';
import { DesempenhoService } from './desempenho.service';
import { DesempenhoController } from './desempenho.controller';

@Module({
  controllers: [DesempenhoController],
  providers: [DesempenhoService],
})
export class DesempenhoModule {}
