// Controller de clientes.
import {
  Body,
  Controller,
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
}
