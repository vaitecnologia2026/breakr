// Controllers de agendamento: público (booking) e interno (meus agendamentos).
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { AgendarService } from './agendar.service';
import { AgendarDto } from './dto/agendar.dto';

// PÚBLICO — página de booking (sem login).
@Controller('agendar')
export class AgendarPublicoController {
  constructor(private readonly agendar: AgendarService) {}

  @Get('colaboradores')
  colaboradores() {
    return this.agendar.colaboradores();
  }

  @Get(':colaboradorId/slots')
  slots(@Param('colaboradorId', ParseUUIDPipe) colaboradorId: string) {
    return this.agendar.slots(colaboradorId);
  }

  @Post(':colaboradorId')
  agendar2(@Param('colaboradorId', ParseUUIDPipe) colaboradorId: string, @Body() dto: AgendarDto) {
    return this.agendar.agendar(colaboradorId, dto);
  }
}

// INTERNO — agendamentos que EU recebi.
@Controller('meus-agendamentos')
@UseGuards(JwtAuthGuard)
export class MeusAgendamentosController {
  constructor(private readonly agendar: AgendarService) {}

  @Get()
  meus(@UsuarioAtual() usuario: UsuarioPublico) {
    return this.agendar.listarDoColaborador(usuario.id);
  }
}
