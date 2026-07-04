// Modulo de pesquisas (surveys) do portal do cliente (req. l.44-46).
import { Module } from '@nestjs/common';
import { PesquisasService } from './pesquisas.service';
import { PesquisasController } from './pesquisas.controller';

@Module({
  controllers: [PesquisasController],
  providers: [PesquisasService],
})
export class PesquisasModule {}
