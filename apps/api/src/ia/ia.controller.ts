import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { IaConfigService } from './ia-config.service';
import { IaService } from './ia.service';
import { IaAssistenteService } from './ia-assistente.service';
import { IntegracoesConfigService } from './integracoes-config.service';
import { AtualizarIaDto } from './dto/atualizar-ia.dto';

@Controller('config')
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(
    private readonly config: IaConfigService,
    private readonly ia: IaService,
    private readonly assistente: IaAssistenteService,
    private readonly integracoes: IntegracoesConfigService,
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
  async assistenteChat(
    @Body() body: { mensagem: string; historico?: { role: 'user' | 'assistant'; conteudo: string }[] },
  ) {
    const resposta = await this.assistente.chat(body.mensagem, body.historico ?? []);
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
}
