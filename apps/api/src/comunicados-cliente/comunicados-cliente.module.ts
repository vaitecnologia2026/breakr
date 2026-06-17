// Módulo de comunicados aos clientes (banner no portal).
import { Module } from '@nestjs/common';
import { ComunicadosClienteService } from './comunicados-cliente.service';
import { ComunicadosClienteController } from './comunicados-cliente.controller';

@Module({
  controllers: [ComunicadosClienteController],
  providers: [ComunicadosClienteService],
})
export class ComunicadosClienteModule {}
