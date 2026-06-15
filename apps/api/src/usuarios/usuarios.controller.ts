import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { UsuarioAtual } from './usuario-atual.decorator';
import { UsuariosService, CriarUsuarioDto, AtualizarUsuarioDto } from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioPublico): UsuarioPublico {
    return usuario;
  }

  @Get()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  listar() {
    return this.service.listarTodos();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarUsuarioDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(@Param('id') id: string, @Body() dto: AtualizarUsuarioDto) {
    return this.service.atualizar(id, dto);
  }
}
