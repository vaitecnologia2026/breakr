// Módulo da central de ouvidoria.
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { OuvidoriaService } from './ouvidoria.service';
import { OuvidoriaController } from './ouvidoria.controller';

@Module({
  imports: [NotificacoesModule],
  controllers: [OuvidoriaController],
  providers: [OuvidoriaService],
})
export class OuvidoriaModule {}
