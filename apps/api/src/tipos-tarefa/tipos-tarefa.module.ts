import { Module } from '@nestjs/common';
import { TiposTarefaController } from './tipos-tarefa.controller';
import { TiposTarefaService } from './tipos-tarefa.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiposTarefaController],
  providers: [TiposTarefaService],
})
export class TiposTarefaModule {}
