// Controller de clientes.
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ClientesService } from './clientes.service';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { DefinirAcessoPortalDto } from './dto/definir-acesso-portal.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // GET /clientes — lista todos (qualquer autenticado).
  @Get()
  listar() {
    return this.clientesService.listar();
  }

  // GET /clientes/:id — detalhe (qualquer autenticado).
  @Get(':id')
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.buscarPorId(id);
  }

  // GET /clientes/:id/historico-squad — histórico de troca de squad do cliente.
  @Get(':id/historico-squad')
  historicoSquad(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.historicoSquad(id);
  }

  // POST /clientes — cria (Comercial/CS/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  criar(@Body() dto: CriarClienteDto) {
    return this.clientesService.criar(dto);
  }

  // PATCH /clientes/:id — atualiza (Comercial/CS/Admin/Superadmin).
  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarClienteDto,
  ) {
    return this.clientesService.atualizar(id, dto);
  }

  // GET /clientes/:id/acesso-portal — status do acesso do cliente ao portal
  // (tela "Usuarios"). So Admin/Superadmin. Nunca devolve o hash da senha.
  @Get(':id/acesso-portal')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  obterAcessoPortal(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.obterAcessoPortal(id);
  }

  // PATCH /clientes/:id/acesso-portal — define usuario+senha de acesso ao portal.
  @Patch(':id/acesso-portal')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  definirAcessoPortal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirAcessoPortalDto,
  ) {
    return this.clientesService.definirAcessoPortal(id, dto);
  }

  // DELETE /clientes/:id/acesso-portal — remove o acesso (portal volta a ser
  // publico por link).
  @Delete(':id/acesso-portal')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
  removerAcessoPortal(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.removerAcessoPortal(id);
  }
}
