// Controller de agenda interna (feriados, sala presencial, home office).
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
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { AgendaService } from './agenda.service';
import { CriarFeriadoDto } from './dto/criar-feriado.dto';
import { AgendarSalaDto } from './dto/agendar-sala.dto';
import { MarcarHomeOfficeDto } from './dto/marcar-home-office.dto';

const GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN] as const;
// Sala presencial: só CS + gestão podem agendar (regra do vídeo).
const AGENDA_SALA = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS] as const;

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  // --- Feriados (todos veem; gestão cadastra) ---
  @Get('feriados')
  listarFeriados() {
    return this.agenda.listarFeriados();
  }
  @Post('feriados')
  @UseGuards(CargosGuard)
  @Cargos(...GESTAO)
  criarFeriado(@Body() dto: CriarFeriadoDto) {
    return this.agenda.criarFeriado(dto);
  }
  @Delete('feriados/:id')
  @UseGuards(CargosGuard)
  @Cargos(...GESTAO)
  removerFeriado(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.removerFeriado(id);
  }

  // --- Sala de reuniões presencial (todos veem; só CS/gestão agenda) ---
  @Get('sala')
  listarSala() {
    return this.agenda.listarAgendamentosSala();
  }
  @Post('sala')
  @UseGuards(CargosGuard)
  @Cargos(...AGENDA_SALA)
  agendarSala(@Body() dto: AgendarSalaDto, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.agenda.agendarSala(dto, usuario.id);
  }
  @Delete('sala/:id')
  @UseGuards(CargosGuard)
  @Cargos(...AGENDA_SALA)
  cancelarSala(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.cancelarSala(id);
  }

  // --- Home office (cada um gere os próprios dias) ---
  @Get('home-office/meus')
  meusDias(@UsuarioAtual() usuario: UsuarioPublico) {
    return this.agenda.meusDiasHomeOffice(usuario.id);
  }
  @Get('home-office/hoje')
  hoje() {
    return this.agenda.hojeEmHomeOffice();
  }
  @Post('home-office')
  marcar(@Body() dto: MarcarHomeOfficeDto, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.agenda.marcarHomeOffice(usuario.id, dto);
  }
  @Delete('home-office/:id')
  desmarcar(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.agenda.desmarcarHomeOffice(id, usuario.id);
  }
}
