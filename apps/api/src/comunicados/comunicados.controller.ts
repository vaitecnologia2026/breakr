import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { ComunicadosService } from './comunicados.service';
import { CriarComunicadoDto } from './dto/criar-comunicado.dto';

// Escrita de comunicados internos restrita à gestão; leitura para qualquer autenticado.
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS, Cargo.ESTRATEGISTA];

@Controller('comunicados')
@UseGuards(JwtAuthGuard)
export class ComunicadosController {
  constructor(private readonly svc: ComunicadosService) {}

  @Get()
  listar() { return this.svc.listar(); }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarComunicadoDto, @Request() req: any) {
    return this.svc.criar({ ...dto, autorId: req.user?.id });
  }

  @Patch(':id/fixar')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  fixar(@Param('id', ParseUUIDPipe) id: string, @Body() body: { fixado: boolean }) {
    return this.svc.alternarFixado(id, body.fixado);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) { return this.svc.remover(id); }
}
