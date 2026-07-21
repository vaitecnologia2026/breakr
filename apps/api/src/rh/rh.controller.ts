// Controller de RH — recrutamento e selecao (M19).
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
import { StatusCandidato } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { RhService } from './rh.service';
import { CriarVagaDto } from './dto/criar-vaga.dto';
import { CriarCandidatoDto } from './dto/criar-candidato.dto';
import { MoverStatusCandidatoDto } from './dto/mover-status-candidato.dto';
import { PerfilIdealVagaDto } from './dto/perfil-ideal-vaga.dto';

@Controller('rh')
@UseGuards(JwtAuthGuard)
export class RhController {
  constructor(private readonly rhService: RhService) {}

  // GET /rh/vagas — lista as vagas (qualquer autenticado).
  @Get('vagas')
  listarVagas() {
    return this.rhService.listarVagas();
  }

  // POST /rh/vagas — cria uma vaga (Admin/Superadmin).
  @Post('vagas')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criarVaga(@Body() dto: CriarVagaDto) {
    return this.rhService.criarVaga(dto);
  }

  // PATCH /rh/vagas/:id/perfil-ideal — define o Perfil Ideal DISC da vaga
  // (Job Fit) — Admin/Superadmin.
  @Patch('vagas/:id/perfil-ideal')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  definirPerfilIdeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerfilIdealVagaDto,
  ) {
    return this.rhService.definirPerfilIdeal(id, dto);
  }

  // GET /rh/candidatos — lista os candidatos (filtros opcionais por vaga e
  // etapa; qualquer autenticado).
  @Get('candidatos')
  listarCandidatos(
    @Query('vagaId') vagaId?: string,
    @Query('status') status?: StatusCandidato,
  ) {
    return this.rhService.listarCandidatos({ vagaId, status });
  }

  // POST /rh/candidatos — cadastra um candidato em uma vaga (Admin/Superadmin).
  @Post('candidatos')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  criarCandidato(@Body() dto: CriarCandidatoDto) {
    return this.rhService.criarCandidato(dto);
  }

  // PATCH /rh/candidatos/:id/status — move o candidato de etapa no funil.
  @Patch('candidatos/:id/status')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  moverStatusCandidato(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusCandidatoDto,
  ) {
    return this.rhService.moverStatusCandidato(id, dto.status);
  }

  // GET /rh/banco-talentos — pool reutilizavel de candidatos (filtros opcionais:
  // perfilDisc, tag, q). Qualquer autenticado consulta antes de abrir vaga (l.432).
  @Get('banco-talentos')
  bancoTalentos(
    @Query('perfilDisc') perfilDisc?: string,
    @Query('tag') tag?: string,
    @Query('q') q?: string,
  ) {
    return this.rhService.bancoTalentos({ perfilDisc, tag, q });
  }

  // PATCH /rh/candidatos/:id/tags — atualiza as tags do banco de talentos
  // (ex.: "forte", "reavaliacao") — Admin/Superadmin.
  @Patch('candidatos/:id/tags')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizarTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('tags') tags?: string,
  ) {
    return this.rhService.atualizarTags(id, tags);
  }

  // POST /rh/vagas/:id/triagem-ia — classifica os candidatos ativos da vaga em
  // Alto/Médio/Baixo Fit via IA (inspirado no InHire) — Admin/Superadmin.
  @Post('vagas/:id/triagem-ia')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  triagemIa(@Param('id', ParseUUIDPipe) id: string) {
    return this.rhService.triagemIa(id);
  }

  // GET /rh/source-of-hire — origem das candidaturas com total e taxa de
  // aprovação por canal (qualquer autenticado).
  @Get('source-of-hire')
  sourceOfHire() {
    return this.rhService.sourceOfHire();
  }
}
