// Modulo de comissoes apuradas. Somente leitura (PrismaModule e @Global, entao
// nao precisa ser importado aqui).
import { Module } from '@nestjs/common';
import { ComissoesService } from './comissoes.service';
import { ComissoesController } from './comissoes.controller';

@Module({
  controllers: [ComissoesController],
  providers: [ComissoesService],
})
export class ComissoesModule {}
