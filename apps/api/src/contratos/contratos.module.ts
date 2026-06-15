// Modulo de contratos (M12) — porta de entrada do pipeline. Depende das
// integracoes (Autentique), do motor, das notificacoes e do modulo de faturas
// (para emitir a 1a cobranca quando o contrato entra em vigor).
import { Module } from '@nestjs/common';
import { IntegracoesModule } from '../integracoes';
import { AutomacaoModule } from '../automacao/automacao.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { FaturasModule } from '../faturas/faturas.module';
import { ContratosService } from './contratos.service';
import { ContratosController } from './contratos.controller';
import { ContratoPdfService } from './contrato-pdf.service';

@Module({
  imports: [IntegracoesModule, AutomacaoModule, NotificacoesModule, FaturasModule],
  controllers: [ContratosController],
  providers: [ContratosService, ContratoPdfService],
  exports: [ContratosService, ContratoPdfService],
})
export class ContratosModule {}
