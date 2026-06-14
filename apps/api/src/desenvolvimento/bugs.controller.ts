// Controller de desenvolvimento — quadro de bugs (bug board, M21).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SeveridadeBug, StatusBug } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { BugsService } from './bugs.service';
import { CriarBugDto } from './dto/criar-bug.dto';
import { MoverStatusBugDto } from './dto/mover-status-bug.dto';

@Controller('bugs')
@UseGuards(JwtAuthGuard)
export class BugsController {
  constructor(private readonly bugsService: BugsService) {}

  // GET /bugs — lista os bugs (filtros opcionais por status e severidade;
  // qualquer autenticado).
  @Get()
  listar(
    @Query('status') status?: StatusBug,
    @Query('severidade') severidade?: SeveridadeBug,
  ) {
    return this.bugsService.listar({ status, severidade });
  }

  // GET /bugs/:id — detalhe de um bug.
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.bugsService.obter(id);
  }

  // POST /bugs — reporta um bug (qualquer autenticado).
  @Post()
  criar(@Body() dto: CriarBugDto) {
    return this.bugsService.criar(dto);
  }

  // PATCH /bugs/:id/status — move o bug de status (Admin/Superadmin).
  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  moverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusBugDto,
  ) {
    return this.bugsService.moverStatus(id, dto.status);
  }
}
