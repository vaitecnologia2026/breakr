// Modulo da tela "Atividades" do CRM comercial. PrismaModule e global, entao
// o service acessa o banco sem import explicito (mesmo padrao do ComercialModule).
import { Module } from '@nestjs/common';
import { AtividadesComercialService } from './atividades-comercial.service';
import { AtividadesComercialController } from './atividades-comercial.controller';

@Module({
  controllers: [AtividadesComercialController],
  providers: [AtividadesComercialService],
})
export class AtividadesComercialModule {}
