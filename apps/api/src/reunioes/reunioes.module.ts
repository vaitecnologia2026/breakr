// Módulo de reuniões internas do time.
import { Module } from '@nestjs/common';
import { IntegracoesModule } from '../integracoes';
import { ReunioesService } from './reunioes.service';
import { ReunioesController } from './reunioes.controller';

@Module({
  imports: [IntegracoesModule],
  controllers: [ReunioesController],
  providers: [ReunioesService],
})
export class ReunioesModule {}
