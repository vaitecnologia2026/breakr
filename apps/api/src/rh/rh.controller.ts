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
}
