// Módulo de captação de dados (jurídico) — formulário público de entrada.
import { Module } from '@nestjs/common';
import { ClientesModule } from '../clientes/clientes.module';
import { ContratosModule } from '../contratos/contratos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { CaptacaoService } from './captacao.service';
import { CaptacaoController } from './captacao.controller';

@Module({
  imports: [ClientesModule, ContratosModule, NotificacoesModule],
  controllers: [CaptacaoController],
  providers: [CaptacaoService],
})
export class CaptacaoModule {}
