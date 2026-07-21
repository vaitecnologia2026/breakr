import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Cargo } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { ModelosMensagemService } from './modelos-mensagem.service';
import { CriarModeloMensagemDto } from './dto/criar-modelo-mensagem.dto';
import { AtualizarModeloMensagemDto } from './dto/atualizar-modelo-mensagem.dto';

// Escrita restrita à gestão/marketing; leitura para qualquer autenticado.
const CARGOS_GESTAO = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.CS, Cargo.ESTRATEGISTA];

@Controller('modelos-mensagem')
@UseGuards(JwtAuthGuard)
export class ModelosMensagemController {
  constructor(private readonly svc: ModelosMensagemService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  criar(@Body() dto: CriarModeloMensagemDto, @Request() req: any) {
    return this.svc.criar(dto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarModeloMensagemDto,
  ) {
    return this.svc.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...CARGOS_GESTAO)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remover(id);
  }
}
