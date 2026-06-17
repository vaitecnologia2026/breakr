// Módulo de agendamento público com colaborador (booking).
import { Module } from '@nestjs/common';
import { AgendarService } from './agendar.service';
import { AgendarPublicoController, MeusAgendamentosController } from './agendar.controller';

@Module({
  controllers: [AgendarPublicoController, MeusAgendamentosController],
  providers: [AgendarService],
})
export class AgendarModule {}
