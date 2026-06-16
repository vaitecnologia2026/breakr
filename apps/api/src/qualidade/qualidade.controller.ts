// Endpoints de qualidade e rework — acesso restrito a usuarios internos (JWT).
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QualidadeService } from './qualidade.service';

@UseGuards(JwtAuthGuard)
@Controller('qualidade')
export class QualidadeController {
  constructor(private readonly svc: QualidadeService) {}

  @Get('dashboard')
  dashboard() {
    return this.svc.dashboard();
  }

  @Get('rework')
  listarRework(
    @Query('origem') origem?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listarRework({
      origem: origem === 'EXTERNO' || origem === 'INTERNO'
        ? (origem as 'EXTERNO' | 'INTERNO')
        : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('carga-designer')
  cargaDesigner() {
    return this.svc.cargaDesigner();
  }
}
