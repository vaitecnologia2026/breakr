// Controller de documentos do colaborador.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cargo, UsuarioPublico } from '@breakr/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { UsuarioAtual } from '../usuarios/usuario-atual.decorator';
import { DocumentosService } from './documentos.service';
import { CriarDocumentoDto } from './dto/criar-documento.dto';

const RH = [Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.FINANCEIRO] as const;

@Controller('documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  // Documentos do próprio usuário (qualquer autenticado).
  @Get('meus')
  meus(@UsuarioAtual() usuario: UsuarioPublico) {
    return this.documentos.meus(usuario.id);
  }

  // Assinatura do próprio documento.
  @Patch(':id/assinar')
  assinar(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() usuario: UsuarioPublico) {
    return this.documentos.assinar(id, usuario.id);
  }

  // Gestão (RH).
  @Get()
  @UseGuards(CargosGuard)
  @Cargos(...RH)
  listar(@Query('colaboradorId') colaboradorId?: string) {
    return this.documentos.listar(colaboradorId);
  }

  @Post()
  @UseGuards(CargosGuard)
  @Cargos(...RH)
  criar(@Body() dto: CriarDocumentoDto) {
    return this.documentos.criar(dto);
  }

  @Delete(':id')
  @UseGuards(CargosGuard)
  @Cargos(...RH)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentos.remover(id);
  }
}
