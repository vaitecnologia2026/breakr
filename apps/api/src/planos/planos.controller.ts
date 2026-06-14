// Controller de planos.
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
import { PlanosService } from './planos.service';
import { CriarPlanoDto } from './dto/criar-plano.dto';
import { AtualizarPlanoDto } from './dto/atualizar-plano.dto';

@Controller('planos')
@UseGuards(JwtAuthGuard)
export class PlanosController {
  constructor(private readonly planosService: PlanosService) {}

  // GET /planos — lista todos (qualquer autenticado).
  @Get()
  listar() {
    return this.planosService.listar();
  }

  // GET /planos/:id — detalhe (qualquer autenticado).
  @Get(':id')
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.planosService.buscarPorId(id);
  }

  // POST /planos — cria (Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarPlanoDto) {
    return this.planosService.criar(dto);
  }

  // PATCH /planos/:id — atualiza (Admin/Superadmin).
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPlanoDto,
  ) {
    return this.planosService.atualizar(id, dto);
  }
}
