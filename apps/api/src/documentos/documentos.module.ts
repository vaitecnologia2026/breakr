// Módulo de documentos do colaborador.
import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { DocumentosService } from './documentos.service';
import { DocumentosController } from './documentos.controller';

@Module({
  imports: [NotificacoesModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
})
export class DocumentosModule {}
