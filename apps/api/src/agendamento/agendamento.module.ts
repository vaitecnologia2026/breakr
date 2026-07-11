// Modulo do calendario de Agendamento (menu Comercial). PrismaModule e Global.
import { Module } from '@nestjs/common';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoController } from './agendamento.controller';
import { GoogleAgendaService } from './google-agenda.service';
import { GoogleOAuthController } from './google-oauth.controller';

@Module({
  controllers: [AgendamentoController, GoogleOAuthController],
  providers: [AgendamentoService, GoogleAgendaService],
})
export class AgendamentoModule {}
