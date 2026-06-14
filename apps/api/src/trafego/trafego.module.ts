// Modulo de tráfego pago (M17). Importa IaModule (IA assistiva) e
// IntegracoesModule (WhatsApp para envio de relatórios).
import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { IntegracoesModule } from '../integracoes/integracoes.module';
import { TrafegoService } from './trafego.service';
import { TrafegoController, RelatoriosTrafegoController } from './trafego.controller';

@Module({
  imports: [IaModule, IntegracoesModule],
  controllers: [TrafegoController, RelatoriosTrafegoController],
  providers: [TrafegoService],
  exports: [TrafegoService],
})
export class TrafegoModule {}
