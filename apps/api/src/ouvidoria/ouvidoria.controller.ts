// Controller da central de ouvidoria.
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { OuvidoriaService } from './ouvidoria.service';
import { CriarOuvidoriaDto } from './dto/criar-ouvidoria.dto';
import { ResolverOuvidoriaDto } from './dto/resolver-ouvidoria.dto';

const TRATAM = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.JURIDICO] as const;

@Controller('ouvidoria')
@UseGuards(JwtAuthGuard)
export class OuvidoriaController {
  constructor(private readonly ouvidoria: OuvidoriaService) {}

  // Listagem só para quem trata (jurídico/admin).
  @Get()
  @UseGuards(CargosGuard)
  @Cargos(...TRATAM)
  listar() {
    return this.ouvidoria.listar();
  }

  // Qualquer autenticado pode abrir uma manifestação.
  @Post()
  criar(@Body() dto: CriarOuvidoriaDto, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.ouvidoria.criar(dto, usuario.id);
  }

  @Patch(':id/resolver')
  @UseGuards(CargosGuard)
  @Cargos(...TRATAM)
  resolver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolverOuvidoriaDto) {
    return this.ouvidoria.resolver(id, dto);
  }
}
