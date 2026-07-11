// Controller do calendario de Agendamento (menu Comercial).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgendamentoService } from './agendamento.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';

@Controller('agendamento')
@UseGuards(JwtAuthGuard)
export class AgendamentoController {
  constructor(private readonly agendamento: AgendamentoService) {}

  // GET /agendamento?inicio=ISO&fim=ISO — eventos do periodo.
  @Get()
  listar(@Query('inicio') inicio?: string, @Query('fim') fim?: string) {
    return this.agendamento.listar(inicio, fim);
  }

  // GET /agendamento/colaboradores — colaboradores (linhas do calendario).
  @Get('colaboradores')
  colaboradores() {
    return this.agendamento.colaboradores();
  }

  @Post()
  criar(@Body() dto: CriarAgendamentoDto) {
    return this.agendamento.criar(dto);
  }

  @Put(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CriarAgendamentoDto) {
    return this.agendamento.atualizar(id, dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.agendamento.remover(id);
  }
}
