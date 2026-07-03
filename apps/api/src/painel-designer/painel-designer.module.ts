// Módulo do painel do designer (B8). Registrado no AppModule.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PainelDesignerController } from './painel-designer.controller';
import { PainelDesignerService } from './painel-designer.service';

@Module({
  imports: [PrismaModule],
  controllers: [PainelDesignerController],
  providers: [PainelDesignerService],
})
export class PainelDesignerModule {}
