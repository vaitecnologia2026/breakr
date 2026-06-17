// Controllers do DISC: público (teste/candidatura) e admin (banco de perguntas).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { DiscService } from './disc.service';
import { SalvarPerguntaDto } from './dto/salvar-pergunta.dto';
import { CandidaturaDiscDto } from './dto/candidatura-disc.dto';

// PÚBLICO — usado na página de avaliação do candidato (sem login).
@Controller('disc')
export class DiscPublicoController {
  constructor(private readonly disc: DiscService) {}

  @Get('teste')
  teste() {
    return this.disc.teste();
  }

  @Get('vagas')
  vagas() {
    return this.disc.vagasAbertas();
  }

  @Post('candidatura')
  candidatar(@Body() dto: CandidaturaDiscDto) {
    return this.disc.candidatar(dto);
  }
}

// ADMIN — gestão do banco de perguntas (Configurações).
@Controller('config/disc/perguntas')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
export class DiscAdminController {
  constructor(private readonly disc: DiscService) {}

  @Get()
  listar() {
    return this.disc.listarPerguntas();
  }

  @Post()
  criar(@Body() dto: SalvarPerguntaDto) {
    return this.disc.criarPergunta(dto);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SalvarPerguntaDto) {
    return this.disc.atualizarPergunta(id, dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.disc.removerPergunta(id);
  }
}
