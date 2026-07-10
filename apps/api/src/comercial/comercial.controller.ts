// Controller do comercial — pipeline de vendas (CRM, M11).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatusLead } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { ComercialService } from './comercial.service';
import { CriarLeadDto } from './dto/criar-lead.dto';
import { AtualizarLeadDto } from './dto/atualizar-lead.dto';
import { DefinirItensNegocioDto } from './dto/definir-itens-negocio.dto';
import { CriarNotaLeadDto } from './dto/criar-nota-lead.dto';
import { SalvarCadastroContratoDto } from './dto/salvar-cadastro-contrato.dto';
import { MoverStatusLeadDto } from './dto/mover-status-lead.dto';
import { AtribuirResponsavelLeadDto } from './dto/atribuir-responsavel-lead.dto';
import { MoverEtapaLeadDto } from './dto/pipeline.dto';

@Controller('comercial/leads')
@UseGuards(JwtAuthGuard)
export class ComercialController {
  constructor(private readonly comercialService: ComercialService) {}

  // GET /comercial/leads — lista os leads (filtros opcionais por etapa e
  // responsavel; qualquer autenticado).
  @Get()
  listar(
    @Query('status') status?: StatusLead,
    @Query('responsavelId') responsavelId?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('etapaId') etapaId?: string,
    @Query('etiquetaId') etiquetaId?: string,
  ) {
    return this.comercialService.listar({ status, responsavelId, pipelineId, etapaId, etiquetaId });
  }

  // GET /comercial/leads/performance — visão de gestão do pipeline (antes de :id).
  @Get('performance')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL)
  performance() {
    return this.comercialService.performance();
  }

  // GET /comercial/leads/:id — detalhe de um lead.
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.obter(id);
  }

  // POST /comercial/leads — cria um lead (Comercial/CS/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  criar(@Body() dto: CriarLeadDto) {
    return this.comercialService.criar(dto);
  }

  // GET /comercial/leads/:id/notas — notas do negocio (aba "Notas").
  @Get(':id/notas')
  listarNotas(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.listarNotas(id);
  }

  // GET /comercial/leads/:id/historico — historico do negocio (aba "Historico").
  @Get(':id/historico')
  listarHistorico(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.listarHistorico(id);
  }

  // GET /comercial/leads/:id/cadastro — cadastro completo do negocio (p/ contrato).
  @Get(':id/cadastro')
  obterCadastro(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.obterCadastro(id);
  }

  // PUT /comercial/leads/:id/cadastro — cria/atualiza o cadastro completo.
  @Put(':id/cadastro')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  salvarCadastro(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SalvarCadastroContratoDto,
  ) {
    return this.comercialService.salvarCadastro(id, dto);
  }

  // PATCH /comercial/leads/:id — atualiza os campos do negocio (RESUMO).
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarLeadDto,
  ) {
    return this.comercialService.atualizar(id, dto);
  }

  // PUT /comercial/leads/:id/itens — define planos/produtos do negocio ("+ Produtos").
  @Put(':id/itens')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  definirItens(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirItensNegocioDto,
  ) {
    return this.comercialService.definirItens(id, dto);
  }

  // POST /comercial/leads/:id/notas — adiciona uma nota ao negocio.
  @Post(':id/notas')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  criarNota(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarNotaLeadDto,
    @UsuarioAtual() usuario: UsuarioPublico,
  ) {
    return this.comercialService.criarNota(id, dto.texto, usuario.id);
  }

  // PATCH /comercial/leads/:id/status — move o lead de etapa no pipeline.
  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  moverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusLeadDto,
    @UsuarioAtual() usuario: UsuarioPublico,
  ) {
    return this.comercialService.moverStatus(id, dto.status, usuario.id);
  }

  // PATCH /comercial/leads/:id/etapa — move o lead para uma etapa de pipeline
  // (deriva o status do funil a partir da etapa).
  @Patch(':id/etapa')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  moverEtapa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverEtapaLeadDto,
    @UsuarioAtual() usuario: UsuarioPublico,
  ) {
    return this.comercialService.moverEtapa(id, dto.etapaId, usuario.id);
  }

  // PATCH /comercial/leads/:id/responsavel — atribui um responsavel ao lead.
  @Patch(':id/responsavel')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  atribuirResponsavel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtribuirResponsavelLeadDto,
  ) {
    return this.comercialService.atribuirResponsavel(id, dto.responsavelId);
  }

  // POST /comercial/leads/:id/converter — converte o lead em cliente.
  @Post(':id/converter')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  converter(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.converter(id);
  }
}
