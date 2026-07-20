// Modulo de RH — recrutamento e selecao (M19). PrismaService e
// CodigoUnicoService sao globais, entao nao precisa de imports especiais.
// Importa IaModule para a Triagem com IA (Fit) reutilizar o IaService.
import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { RhService } from './rh.service';
import { RhController } from './rh.controller';
import { CarreirasController } from './carreiras.controller';

@Module({
  imports: [IaModule],
  controllers: [RhController, CarreirasController],
  providers: [RhService],
  exports: [RhService],
})
export class RhModule {}
