import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QualidadeController } from './qualidade.controller';
import { QualidadeService } from './qualidade.service';

@Module({
  imports: [PrismaModule],
  controllers: [QualidadeController],
  providers: [QualidadeService],
})
export class QualidadeModule {}
