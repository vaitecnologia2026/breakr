// Modulo da aprovacao de estrategia (B6). Registrado no AppModule. Usa as
// notificacoes (aviso ao CS quando a estrategia e enviada ao cliente).
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { EstrategiaController } from './estrategia.controller';
import { EstrategiaService } from './estrategia.service';

@Module({
  imports: [PrismaModule, NotificacoesModule],
  controllers: [EstrategiaController],
  providers: [EstrategiaService],
})
export class EstrategiaModule {}
