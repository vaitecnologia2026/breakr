// Modulo do motor de automacao (Fase 0 — esqueleto).
// O EngineService e exportado para que outros modulos (contratos, financeiro,
// projetos...) possam chamar engine.dispatch(evento, payload) na Fase 1.
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { SquadsModule } from '../squads/squads.module';
import { IntegracoesModule } from '../integracoes';
import { EngineService } from './engine.service';
import { ExecucoesController } from './execucoes.controller';
import { AcoesService } from './motor/acoes.service';
import { RegrasService } from './motor/regras.service';
import { RenovacaoService } from './renovacao/renovacao.service';
import { CobrancasSchedulerService } from './cobrancas-scheduler.service';

@Module({
  // As acoes do motor: notificam (Notificacoes), balanceiam squad (Squads) e
  // criam grupo no WhatsApp (Integracoes/port).
  imports: [NotificacoesModule, SquadsModule, IntegracoesModule],
  providers: [EngineService, AcoesService, RegrasService, RenovacaoService, CobrancasSchedulerService],
  controllers: [ExecucoesController], // painel de execucoes/regras (GET/POST /motor/*)
  exports: [EngineService],
})
export class AutomacaoModule {}
