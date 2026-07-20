// Módulo de Carta Oferta (inspirado no InHire). PrismaService é global; não
// precisa de imports especiais. Aditivo — registrado no AppModule.
import { Module } from '@nestjs/common';
import { CartaOfertaService } from './carta-oferta.service';
import { CartaOfertaController } from './carta-oferta.controller';

@Module({
  controllers: [CartaOfertaController],
  providers: [CartaOfertaService],
  exports: [CartaOfertaService],
})
export class CartaOfertaModule {}
