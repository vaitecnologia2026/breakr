// Controller educacional — catálogo de cursos.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { EducacionalService } from './educacional.service';
import { CriarCursoDto } from './dto/criar-curso.dto';

@Controller('educacional')
@UseGuards(JwtAuthGuard)
export class EducacionalController {
  constructor(private readonly educacional: EducacionalService) {}

  // Qualquer autenticado vê os cursos disponíveis.
  @Get()
  listar() {
    return this.educacional.listar();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarCursoDto) {
    return this.educacional.criar(dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.educacional.remover(id);
  }
}
