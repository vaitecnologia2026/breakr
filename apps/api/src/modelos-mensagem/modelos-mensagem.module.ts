import { Module } from '@nestjs/common';
import { ModelosMensagemController } from './modelos-mensagem.controller';
import { ModelosMensagemService } from './modelos-mensagem.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModelosMensagemController],
  providers: [ModelosMensagemService],
})
export class ModelosMensagemModule {}
