// Modulo de tráfego pago (M17). Importa IaModule (IA assistiva) e
// IntegracoesModule (WhatsApp para envio de relatórios).
import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { IntegracoesModule } from '../integracoes/integracoes.module';
import { AutomacaoModule } from '../automacao/automacao.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { TrafegoService } from './trafego.service';
import {
  TrafegoController,
  RelatoriosTrafegoController,
  CronogramaTrafegoController,
} from './trafego.controller';
import { AlertasTrafegoSchedulerService } from './alertas-trafego-scheduler.service';

@Module({
  imports: [IaModule, IntegracoesModule, AutomacaoModule, NotificacoesModule],
  controllers: [TrafegoController, RelatoriosTrafegoController, CronogramaTrafegoController],
  providers: [TrafegoService, AlertasTrafegoSchedulerService],
  exports: [TrafegoService],
})
export class TrafegoModule {}
