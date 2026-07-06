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
  Patch,
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

  // GET /squads/do-cliente/:clienteId — squad + membros do cliente (auto-preenchimento).
  @Get('do-cliente/:clienteId')
  obterDoCliente(@Param('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.squadsService.obterDoCliente(clienteId);
  }

  // POST /squads — cria squad (Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criar(@Body() dto: CriarSquadDto) {
    return this.squadsService.criar(dto);
  }

  // PATCH /squads/:id — renomeia o squad (Admin/Superadmin).
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CriarSquadDto) {
    return this.squadsService.atualizar(id, dto.nome);
  }

  // DELETE /squads/:id — exclui o squad (Admin/Superadmin).
  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(@Param('id', ParseUUIDPipe) id: string) {
    return this.squadsService.excluir(id);
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
