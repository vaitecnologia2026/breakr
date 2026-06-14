// Controller do funil de producao de conteudo (M16).
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
import { StatusConteudo } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ConteudosService } from './conteudos.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';
import { MoverStatusDto } from './dto/mover-status.dto';
import { AtribuirResponsavelDto } from './dto/atribuir-responsavel.dto';

@Controller('conteudos')
@UseGuards(JwtAuthGuard)
export class ConteudosController {
  constructor(private readonly conteudosService: ConteudosService) {}

  // GET /conteudos — lista (qualquer autenticado), com filtros opcionais.
  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: StatusConteudo,
  ) {
    return this.conteudosService.listar({ clienteId, status });
  }

  // GET /conteudos/:id — detalhe (qualquer autenticado).
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.conteudosService.obter(id);
  }

  // POST /conteudos — cria peca (time de producao/estrategia/CS/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  criar(@Body() dto: CriarConteudoDto) {
    return this.conteudosService.criar(dto);
  }

  // PATCH /conteudos/:id/status — move a peca no funil (mesmo time).
  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  moverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusDto,
  ) {
    return this.conteudosService.moverStatus(id, dto.status);
  }

  // PATCH /conteudos/:id/responsavel — atribui responsavel (mesmo time).
  @Patch(':id/responsavel')
  @UseGuards(CargosGuard)
  @Cargos(
    Cargo.SUPERADMIN,
    Cargo.ADMIN,
    Cargo.ESTRATEGISTA,
    Cargo.CS,
    Cargo.COPYWRITER,
    Cargo.DESIGNER,
    Cargo.EDITOR_VIDEO,
  )
  atribuirResponsavel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtribuirResponsavelDto,
  ) {
    return this.conteudosService.atribuirResponsavel(id, dto.responsavelId);
  }
}
