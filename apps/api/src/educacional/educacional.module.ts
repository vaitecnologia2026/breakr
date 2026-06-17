// Módulo educacional — catálogo de cursos/treinamentos.
import { Module } from '@nestjs/common';
import { EducacionalService } from './educacional.service';
import { EducacionalController } from './educacional.controller';

@Module({
  controllers: [EducacionalController],
  providers: [EducacionalService],
})
export class EducacionalModule {}
