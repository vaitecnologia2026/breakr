// Controller de pesquisas (admin cria/gerencia) — req. l.46, l.599 (config so
// admin/superadmin). As respostas do cliente entram pelo portal.
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
import { PesquisasService } from './pesquisas.service';
import { CriarPesquisaDto, AtualizarPesquisaDto } from './dto/pesquisa.dto';

@Controller('pesquisas')
@UseGuards(JwtAuthGuard, CargosGuard)
@Cargos(Cargo.SUPERADMIN, Cargo.ADMIN)
export class PesquisasController {
  constructor(private readonly service: PesquisasService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obter(id);
  }

  @Post()
  criar(@Body() dto: CriarPesquisaDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarPesquisaDto) {
    return this.service.atualizar(id, dto);
  }
}
