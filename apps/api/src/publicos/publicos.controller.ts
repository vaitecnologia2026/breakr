import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { PublicosService } from './publicos.service';
import { CriarPublicoDto } from './dto/criar-publico.dto';
import { AtualizarPublicoDto } from './dto/atualizar-publico.dto';

// Escrita de públicos restrita à gestão/marketing; leitura para qualquer autenticado.
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS, Cargo.ESTRATEGISTA];

@Controller('publicos')
@UseGuards(JwtAuthGuard)
export class PublicosController {
  constructor(private readonly svc: PublicosService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarPublicoDto, @Request() req: any) {
    return this.svc.criar(dto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPublicoDto,
  ) {
    return this.svc.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remover(id);
  }
}
