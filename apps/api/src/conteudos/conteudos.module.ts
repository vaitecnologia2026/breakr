// Modulo do funil de producao de conteudo (M16). Depende das notificacoes
// (aviso ao CS na aprovacao) e do motor de automacao (eventos do funil).
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AutomacaoModule } from '../automacao/automacao.module';
import { ConteudosService } from './conteudos.service';
import { ConteudosController } from './conteudos.controller';

@Module({
  imports: [NotificacoesModule, AutomacaoModule],
  controllers: [ConteudosController],
  providers: [ConteudosService],
  exports: [ConteudosService],
})
export class ConteudosModule {}
