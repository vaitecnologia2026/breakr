// Modulo do motor de automacao (Fase 0 — esqueleto).
// O EngineService e exportado para que outros modulos (contratos, financeiro,
// projetos...) possam chamar engine.dispatch(evento, payload) na Fase 1.
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { EngineService } from './engine.service';
import { ExecucoesController } from './execucoes.controller';
import { AcoesService } from './motor/acoes.service';
import { RegrasService } from './motor/regras.service';
import { RenovacaoService } from './renovacao/renovacao.service';

@Module({
  // NotificacoesModule: as acoes do motor disparam pop-ups (ex.: avisar o CS).
  imports: [NotificacoesModule],
  providers: [EngineService, AcoesService, RegrasService, RenovacaoService],
  controllers: [ExecucoesController], // painel de execucoes/regras (GET/POST /motor/*)
  exports: [EngineService],
})
export class AutomacaoModule {}
