// Controller de contratos (M12).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ContratosService } from './contratos.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';

@Controller('contratos')
@UseGuards(JwtAuthGuard)
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  // GET /contratos — lista todos (qualquer autenticado).
  @Get()
  listar() {
    return this.contratosService.listar();
  }

  // GET /contratos/:id — detalhe (qualquer autenticado).
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratosService.obter(id);
  }

  // POST /contratos — cria (Comercial/CS/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  criar(@Body() dto: CriarContratoDto) {
    return this.contratosService.criar(dto);
  }

  // POST /contratos/:id/enviar-assinatura — envia ao Autentique (Comercial/CS/Admin).
  @Post(':id/enviar-assinatura')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  enviarParaAssinatura(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratosService.enviarParaAssinatura(id);
  }

  // POST /contratos/:id/assinado — simula o webhook do Autentique (Juridico/Admin).
  @Post(':id/assinado')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.JURIDICO)
  marcarAssinado(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratosService.marcarAssinado(id);
  }

  // POST /contratos/:id/vigor — coloca em vigor e gera a 1a cobranca (Financeiro/Admin).
  @Post(':id/vigor')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO)
  colocarEmVigor(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratosService.colocarEmVigor(id);
  }
}
