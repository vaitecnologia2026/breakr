// Controller de squads e membros.
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { SquadsService } from './squads.service';
import { CriarSquadDto } from './dto/criar-squad.dto';
import { AdicionarMembroDto } from './dto/adicionar-membro.dto';

@Controller('squads')
@UseGuards(JwtAuthGuard)
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  // GET /squads — lista squads com membros (qualquer autenticado).
  @Get()
  listar() {
    return this.squadsService.listar();
  }

  // POST /squads — cria squad (Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarSquadDto) {
    return this.squadsService.criar(dto);
  }

  // POST /squads/:id/membros — vincula usuario ao squad (Admin/Superadmin).
  @Post(':id/membros')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  adicionarMembro(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarMembroDto,
  ) {
    return this.squadsService.adicionarMembro(id, dto);
  }

  // DELETE /squads/:id/membros/:membroId — remove membro (Admin/Superadmin).
  @Delete(':id/membros/:membroId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removerMembro(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membroId', ParseUUIDPipe) membroId: string,
  ) {
    return this.squadsService.removerMembro(id, membroId);
  }
}
