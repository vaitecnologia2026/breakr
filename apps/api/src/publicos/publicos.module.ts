import { Module } from '@nestjs/common';
import { PublicosController } from './publicos.controller';
import { PublicosService } from './publicos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicosController],
  providers: [PublicosService],
})
export class PublicosModule {}
