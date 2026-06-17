// Controller de tráfego pago (M17).
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { StatusCampanha } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { TrafegoService } from './trafego.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarMetricasDto } from './dto/atualizar-metricas.dto';
import { MoverStatusCampanhaDto } from './dto/mover-status-campanha.dto';
import { RegistrarOtimizacaoDto } from './dto/registrar-otimizacao.dto';

const CARGOS_TRAFEGO = [
  Cargo.SUPERADMIN,
  Cargo.ADMIN,
  Cargo.GESTOR_TRAFEGO,
  Cargo.ESTRATEGISTA,
] as const;

@Controller('trafego/campanhas')
@UseGuards(JwtAuthGuard)
export class TrafegoController {
  constructor(private readonly trafego: TrafegoService) {}

  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: StatusCampanha,
  ) {
    return this.trafego.listar({ clienteId, status });
  }

  // GET /trafego/campanhas/orcamento/:clienteId — teto/comprometido/saldo do cliente.
  @Get('orcamento/:clienteId')
  orcamento(@Param('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.trafego.orcamento(clienteId);
  }

  // GET /trafego/campanhas/alertas — campanhas fora do threshold (IA assistiva).
  @Get('alertas')
  alertas(@Query('clienteId') clienteId?: string) {
    return this.trafego.alertas(clienteId);
  }

  // GET /trafego/campanhas/otimizacoes-gestor — nº de otimizações por gestor.
  @Get('otimizacoes-gestor')
  otimizacoesPorGestor() {
    return this.trafego.otimizacoesPorGestor();
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.trafego.obter(id);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  criar(@Body() dto: CriarCampanhaDto) {
    return this.trafego.criar(dto);
  }

  @Patch(':id/metricas')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  atualizarMetricas(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarMetricasDto) {
    return this.trafego.atualizarMetricas(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  moverStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoverStatusCampanhaDto) {
    return this.trafego.moverStatus(id, dto.status);
  }

  // IA assistiva: gera sugestões de otimização para a campanha.
  @Post(':id/sugestoes')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  sugerir(@Param('id', ParseUUIDPipe) id: string) {
    return this.trafego.sugerir(id);
  }

  // GET /trafego/campanhas/:id/otimizacoes — histórico de otimizações.
  @Get(':id/otimizacoes')
  listarOtimizacoes(@Param('id', ParseUUIDPipe) id: string) {
    return this.trafego.listarOtimizacoes(id);
  }

  // POST /trafego/campanhas/:id/otimizacoes — registra uma otimização.
  @Post(':id/otimizacoes')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  registrarOtimizacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarOtimizacaoDto,
    @UsuarioAtual() usuario: UsuarioPublico,
  ) {
    return this.trafego.registrarOtimizacao(id, dto, usuario.id);
  }
}

// Controller do cronograma de otimização (configurável). Listagem/“hoje” para
// qualquer autenticado; edição só para gestão/tráfego.
@Controller('trafego/cronograma')
@UseGuards(JwtAuthGuard)
export class CronogramaTrafegoController {
  constructor(private readonly trafego: TrafegoService) {}

  @Get()
  listar() {
    return this.trafego.listarCronograma();
  }

  @Get('hoje')
  hoje() {
    return this.trafego.objetivosDeHoje();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  criar(@Body() body: { diaSemana: number; objetivo: string }) {
    return this.trafego.criarRegra(Number(body.diaSemana), String(body.objetivo));
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.trafego.removerRegra(id);
  }
}

// Controller de relatórios — separado do de campanhas para não poluir o path
// trafego/campanhas com rotas de cliente. Equivale ao n8n "[Reportei] Envio de
// Relatórios pelo WhatsApp": gestor dispara o POST e o motor gera + envia via WA.
@Controller('trafego/relatorios')
@UseGuards(JwtAuthGuard)
export class RelatoriosTrafegoController {
  constructor(private readonly trafego: TrafegoService) {}

  // POST /trafego/relatorios/:clienteId — gera e envia relatório mensal via WhatsApp.
  @Post(':clienteId')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_TRAFEGO)
  gerarRelatorio(@Param('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.trafego.gerarRelatorio(clienteId);
  }
}
