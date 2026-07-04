// Modulo de NPS de cliente (req. l.196-198, 544-547).
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { NpsClienteService } from './nps-cliente.service';
import { NpsClienteController } from './nps-cliente.controller';

@Module({
  imports: [NotificacoesModule],
  controllers: [NpsClienteController],
  providers: [NpsClienteService],
})
export class NpsClienteModule {}
