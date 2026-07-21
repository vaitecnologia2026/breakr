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
import { PersonasService } from './personas.service';
import { CriarPersonaDto } from './dto/criar-persona.dto';
import { AtualizarPersonaDto } from './dto/atualizar-persona.dto';

// Escrita de personas restrita à gestão/marketing; leitura para qualquer autenticado.
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS, Cargo.ESTRATEGISTA];

@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonasController {
  constructor(private readonly svc: PersonasService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarPersonaDto, @Request() req: any) {
    return this.svc.criar(dto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPersonaDto,
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
