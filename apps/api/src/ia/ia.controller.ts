import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { IaConfigService } from './ia-config.service';
import { IaService } from './ia.service';
import { IaAssistenteService } from './ia-assistente.service';
import { IntegracoesConfigService } from './integracoes-config.service';
import { PortalConfigService } from './portal-config.service';
import { AtualizarIaDto } from './dto/atualizar-ia.dto';
import { AssistenteChatDto } from './dto/assistente-chat.dto';
import { AtualizarPortalDto } from './dto/atualizar-portal.dto';

@Controller('config')
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(
    private readonly config: IaConfigService,
    private readonly ia: IaService,
    private readonly assistente: IaAssistenteService,
    private readonly integracoes: IntegracoesConfigService,
    private readonly portalConfig: PortalConfigService,
  ) {}

  @Get('ia')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  obterIa() {
    return this.config.obter();
  }

  @Patch('ia')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizarIa(@Body() dto: AtualizarIaDto) {
    return this.config.atualizar(dto);
  }

  @Post('ia/testar')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  testar() {
    return this.ia.testar();
  }

  @Post('ia/assistente')
  async assistenteChat(@Body() dto: AssistenteChatDto) {
    const resposta = await this.assistente.chat(dto.mensagem, dto.historico ?? []);
    return { resposta };
  }

  @Get('integracoes')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  obterIntegracoes() {
    return this.integracoes.obter();
  }

  @Patch('integracoes')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizarIntegracoes(@Body() dto: Record<string, unknown>) {
    return this.integracoes.atualizar(dto as Parameters<IntegracoesConfigService['atualizar']>[0]);
  }

  // Config do portal do cliente (frase motivacional). Admin-only.
  @Get('portal')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  obterPortal() {
    return this.portalConfig.obter();
  }

  @Patch('portal')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizarPortal(@Body() dto: AtualizarPortalDto) {
    return this.portalConfig.atualizar(dto);
  }
}
