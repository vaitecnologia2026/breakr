// Modulo do motor de automacao (Fase 0 — esqueleto).
// O EngineService e exportado para que outros modulos (contratos, financeiro,
// projetos...) possam chamar engine.dispatch(evento, payload) na Fase 1.
import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { ExecucoesController } from './execucoes.controller';

@Module({
  providers: [EngineService],
  controllers: [ExecucoesController], // painel de execucoes (GET /motor/*)
  exports: [EngineService],
})
export class AutomacaoModule {}
