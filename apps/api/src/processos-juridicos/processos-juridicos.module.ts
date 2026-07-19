// Módulo de processos jurídicos (contencioso — Administração › Jurídico).
import { Module } from '@nestjs/common';
import { ProcessosJuridicosService } from './processos-juridicos.service';
import { ProcessosJuridicosController } from './processos-juridicos.controller';

@Module({
  controllers: [ProcessosJuridicosController],
  providers: [ProcessosJuridicosService],
})
export class ProcessosJuridicosModule {}
