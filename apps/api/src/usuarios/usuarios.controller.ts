import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { UsuarioAtual } from './usuario-atual.decorator';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';

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
  criar(@Body() dto: CriarUsuarioDto, @UsuarioAtual() ator: UsuarioPublico) {
    return this.service.criar(dto, ator);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarUsuarioDto,
    @UsuarioAtual() ator: UsuarioPublico,
  ) {
    return this.service.atualizar(id, dto, ator);
  }
}
