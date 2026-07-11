// Modulo do calendario de Agendamento (menu Comercial). PrismaModule e Global.
import { Module } from '@nestjs/common';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoController } from './agendamento.controller';
import { GoogleAgendaService } from './google-agenda.service';

@Module({
  controllers: [AgendamentoController],
  providers: [AgendamentoService, GoogleAgendaService],
})
export class AgendamentoModule {}
