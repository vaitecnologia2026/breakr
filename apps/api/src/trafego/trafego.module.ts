// Modulo de tráfego pago (M17). Importa IaModule para a IA assistiva.
import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { TrafegoService } from './trafego.service';
import { TrafegoController } from './trafego.controller';

@Module({
  imports: [IaModule],
  controllers: [TrafegoController],
  providers: [TrafegoService],
  exports: [TrafegoService],
})
export class TrafegoModule {}
