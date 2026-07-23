// Controller de onboarding gamificado.
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
import { OnboardingService } from './onboarding.service';
import { CriarAulaDto } from './dto/criar-aula.dto';
import { AtualizarAulaDto } from './dto/atualizar-aula.dto';
import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEtapaDto } from './dto/atualizar-etapa.dto';
import { CriarEtapaOnboardingDto } from './dto/criar-etapa-onboarding.dto';
import { CriarChecklistModeloDto } from './dto/criar-checklist-modelo.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // GET /onboarding/cliente/:id — checklist do cliente (ou null).
  @Get('cliente/:id')
  obterPorCliente(@Param('id', ParseUUIDPipe) id: string) {
    return this.onboardingService.obterPorCliente(id);
  }

  // POST /onboarding/etapa/:stepId/concluir — marca uma etapa como concluida.
  @Post('etapa/:stepId/concluir')
  concluirEtapa(@Param('stepId', ParseUUIDPipe) stepId: string) {
    return this.onboardingService.concluirEtapa(stepId);
  }

  // PATCH /onboarding/etapa/:stepId — edita titulo/descricao/link da etapa.
  @Patch('etapa/:stepId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  atualizarEtapa(
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: AtualizarEtapaDto,
  ) {
    return this.onboardingService.atualizarEtapa(stepId, dto);
  }

  // POST /onboarding/cliente/:id/etapa — adiciona um item personalizado ao checklist
  // (ex.: "Agendar reuniao", "Agendar apresentacao da proposta comercial").
  @Post('cliente/:id/etapa')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  criarEtapa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarEtapaOnboardingDto,
  ) {
    return this.onboardingService.criarEtapa(id, dto);
  }

  // DELETE /onboarding/etapa/:stepId — remove um item personalizado do checklist
  // (as 6 etapas padrao nao podem ser removidas).
  @Delete('etapa/:stepId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  removerEtapa(@Param('stepId', ParseUUIDPipe) stepId: string) {
    return this.onboardingService.removerEtapa(stepId);
  }

  // --- Modelos (templates) de checklist reutilizaveis ---
  // GET /onboarding/checklist-modelos — catalogo global de modelos.
  @Get('checklist-modelos')
  listarChecklistModelos() {
    return this.onboardingService.listarChecklistModelos();
  }

  // POST /onboarding/checklist-modelos — cria um modelo (nome + itens).
  @Post('checklist-modelos')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  criarChecklistModelo(@Body() dto: CriarChecklistModeloDto) {
    return this.onboardingService.criarChecklistModelo(dto);
  }

  // DELETE /onboarding/checklist-modelos/:modeloId — remove um modelo.
  @Delete('checklist-modelos/:modeloId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  removerChecklistModelo(
    @Param('modeloId', ParseUUIDPipe) modeloId: string,
  ) {
    return this.onboardingService.removerChecklistModelo(modeloId);
  }

  // POST /onboarding/cliente/:id/aplicar-modelo/:modeloId — aplica um modelo
  // ao checklist do cliente (adiciona os itens do modelo como etapas).
  @Post('cliente/:id/aplicar-modelo/:modeloId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  aplicarChecklistModelo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('modeloId', ParseUUIDPipe) modeloId: string,
  ) {
    return this.onboardingService.aplicarChecklistModelo(id, modeloId);
  }

  // --- Agenda de eventos do cliente ---
  @Get('cliente/:id/eventos')
  listarEventos(@Param('id', ParseUUIDPipe) id: string) {
    return this.onboardingService.listarEventos(id);
  }

  @Post('cliente/:id/eventos')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  criarEvento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarEventoDto,
  ) {
    return this.onboardingService.criarEvento(id, dto);
  }

  @Delete('evento/:eventoId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  removerEvento(@Param('eventoId', ParseUUIDPipe) eventoId: string) {
    return this.onboardingService.removerEvento(eventoId);
  }

  // --- Catalogo de aulas (onboarding educativo) ---
  @Get('aulas')
  listarAulas() {
    return this.onboardingService.listarAulas();
  }

  @Post('aulas')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  criarAula(@Body() dto: CriarAulaDto) {
    return this.onboardingService.criarAula(dto);
  }

  @Patch('aulas/:id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  atualizarAula(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarAulaDto,
  ) {
    return this.onboardingService.atualizarAula(id, dto);
  }

  @Delete('aulas/:id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS)
  removerAula(@Param('id', ParseUUIDPipe) id: string) {
    return this.onboardingService.removerAula(id);
  }
}
