// Configuracoes de IA — restrito a ADMIN/SUPERADMIN (dados sensiveis: chaves).
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { IaConfigService } from './ia-config.service';
import { IaService } from './ia.service';
import { AtualizarIaDto } from './dto/atualizar-ia.dto';

@Controller('config/ia')
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(
    private readonly config: IaConfigService,
    private readonly ia: IaService,
  ) {}

  // GET /config/ia — estado mascarado (nunca devolve a chave inteira).
  @Get()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  obter() {
    return this.config.obter();
  }

  // PATCH /config/ia — salva chaves/modelos/provedor ativo/ativacao.
  @Patch()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  atualizar(@Body() dto: AtualizarIaDto) {
    return this.config.atualizar(dto);
  }

  // POST /config/ia/testar — testa a conexao com o provedor ativo.
  @Post('testar')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  testar() {
    return this.ia.testar();
  }
}
