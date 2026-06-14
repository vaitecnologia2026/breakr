// Controller de faturas/cobrancas.
import {
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
import { FaturasService } from './faturas.service';

@Controller('faturas')
@UseGuards(JwtAuthGuard)
export class FaturasController {
  constructor(private readonly faturasService: FaturasService) {}

  // GET /faturas — lista todas (qualquer autenticado).
  @Get()
  listar() {
    return this.faturasService.listar();
  }

  // GET /faturas/cliente/:id — faturas de um cliente.
  @Get('cliente/:id')
  listarPorCliente(@Param('id', ParseUUIDPipe) id: string) {
    return this.faturasService.listarPorCliente(id);
  }

  // POST /faturas/:id/pagar — confirma pagamento (Financeiro/Admin/Superadmin).
  @Post(':id/pagar')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO)
  marcarPaga(@Param('id', ParseUUIDPipe) id: string) {
    return this.faturasService.marcarPaga(id);
  }

  // POST /faturas/:id/whatsapp — envia a cobranca ao cliente (Financeiro/CS/Admin).
  @Post(':id/whatsapp')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO, Cargo.CS)
  enviarCobrancaWhatsapp(@Param('id', ParseUUIDPipe) id: string) {
    return this.faturasService.enviarCobrancaWhatsapp(id);
  }
}
