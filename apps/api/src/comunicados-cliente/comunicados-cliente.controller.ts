// Controller de comunicados aos clientes.
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { ComunicadosClienteService } from './comunicados-cliente.service';

class CriarComunicadoClienteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  mensagem!: string;
}

@Controller('comunicados-cliente')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
export class ComunicadosClienteController {
  constructor(private readonly comunicados: ComunicadosClienteService) {}

  @Get()
  listar() {
    return this.comunicados.listar();
  }

  @Post()
  criar(@Body() dto: CriarComunicadoClienteDto) {
    return this.comunicados.criar(dto.mensagem);
  }

  @Patch(':id/desativar')
  desativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.comunicados.desativar(id);
  }
}
