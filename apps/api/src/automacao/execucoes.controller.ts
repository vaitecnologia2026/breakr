// ============================================================
// Painel de execucoes do motor de automacao (Fase 0).
// Substitui a tela de execucoes do n8n: expoe as ultimas JobExecution e o
// status operacional do motor para o front administrativo.
// Ref.: docs/escopo/03-motor-de-automacao.md (observabilidade).
// ============================================================
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EngineService } from './engine.service';
import { RegrasService } from './motor/regras.service';
import { RenovacaoService } from './renovacao/renovacao.service';

@Controller('motor')
@UseGuards(JwtAuthGuard) // popula request.user em todas as rotas abaixo
export class ExecucoesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
    private readonly regras: RegrasService,
    private readonly renovacao: RenovacaoService,
  ) {}

  /**
   * Ultimas 100 execucoes (mais recentes primeiro), com o nome da regra que
   * as originou. Restrito a ADMIN/SUPERADMIN — e dado operacional sensivel.
   */
  @Get('execucoes')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.ADMIN, Cargo.SUPERADMIN)
  execucoes() {
    return this.prisma.jobExecution.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 100,
      include: { rule: { select: { nome: true } } },
    });
  }

  /**
   * Status do motor: indica se a fila/worker estao operacionais (Redis ok) ou
   * se ele caiu para o modo degradado. Util para o badge de saude no painel.
   */
  @Get('status')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.ADMIN, Cargo.SUPERADMIN)
  status(): { habilitado: boolean } {
    return { habilitado: this.engine.estaHabilitado() };
  }

  /**
   * Regras de automacao cadastradas — o "fluxo" configuravel que substitui o
   * n8n. Restrito a ADMIN/SUPERADMIN.
   */
  @Get('regras')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.ADMIN, Cargo.SUPERADMIN)
  listarRegras() {
    return this.regras.listar();
  }

  /** Liga/desliga uma regra (ADMIN/SUPERADMIN). */
  @Patch('regras/:id/toggle')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.ADMIN, Cargo.SUPERADMIN)
  alternarRegra(@Param('id', ParseUUIDPipe) id: string) {
    return this.regras.alternarAtiva(id);
  }

  /**
   * Dispara a rotina de renovacao agora (alem do cron diario das 8h) — util
   * para o painel e para testes. Retorna quantos contratos foram sinalizados.
   */
  @Post('renovacao/rodar')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.ADMIN, Cargo.SUPERADMIN)
  async rodarRenovacao(): Promise<{ sinalizados: number }> {
    const sinalizados = await this.renovacao.rodarAgora();
    return { sinalizados };
  }
}
