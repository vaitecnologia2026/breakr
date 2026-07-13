// Modulo de consulta de CNPJ (ReceitaWS). Importa o IaModule para reusar o
// IntegracoesConfigService (token salvo em Configuracoes -> Integracoes).
import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { ReceitaController } from './receita.controller';
import { ReceitaService } from './receita.service';

@Module({
  imports: [IaModule],
  controllers: [ReceitaController],
  providers: [ReceitaService],
})
export class ReceitaModule {}
