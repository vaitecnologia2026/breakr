// Modulo das colunas do board de Campanhas de Marketing. PrismaModule e global.
import { Module } from '@nestjs/common';
import { ColunasMaterialController } from './colunas-material.controller';
import { ColunasMaterialService } from './colunas-material.service';

@Module({
  controllers: [ColunasMaterialController],
  providers: [ColunasMaterialService],
})
export class ColunasMaterialModule {}
