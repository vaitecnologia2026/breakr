// Modulo de RH — recrutamento e selecao (M19). PrismaService e
// CodigoUnicoService sao globais, entao nao precisa de imports especiais.
import { Module } from '@nestjs/common';
import { RhService } from './rh.service';
import { RhController } from './rh.controller';

@Module({
  controllers: [RhController],
  providers: [RhService],
  exports: [RhService],
})
export class RhModule {}
