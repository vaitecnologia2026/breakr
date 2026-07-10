// Controller de perfis de acesso.
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { PerfisService } from './perfis.service';
import { CriarPerfilDto } from './dto/criar-perfil.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';

@Controller('perfis')
@UseGuards(JwtAuthGuard)
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  // GET /perfis — lista todos (gestao: Admin/Superadmin).
  @Get()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  listar() {
    return this.perfisService.listar();
  }

  // GET /perfis/:id — detalhe (gestao: Admin/Superadmin).
  @Get(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.perfisService.buscarPorId(id);
  }

  // POST /perfis — cria (Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarPerfilDto) {
    return this.perfisService.criar(dto);
  }

  // PATCH /perfis/:id — atualiza (Admin/Superadmin).
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPerfilDto,
  ) {
    return this.perfisService.atualizar(id, dto);
  }
}
