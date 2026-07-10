// Controller de contratos (M12).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ContratosService } from './contratos.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';
import { CriarContratoLeadDto } from './dto/criar-contrato-lead.dto';

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

  // POST /contratos — cria (Comercial/CS/Juridico/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS, Cargo.JURIDICO)
  criar(@Body() dto: CriarContratoDto) {
    return this.contratosService.criar(dto);
  }

  // POST /contratos/do-lead/:leadId — cria contrato a partir do negocio ("Criar Contrato").
  @Post('do-lead/:leadId')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS, Cargo.JURIDICO)
  criarDoLead(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: CriarContratoLeadDto,
  ) {
    return this.contratosService.criarDoLead(leadId, dto);
  }

  // GET /contratos/:id/docx — download do contrato .docx gerado pelo sistema.
  @Get(':id/docx')
  async downloadDocx(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, nomeArquivo } = await this.contratosService.gerarDocx(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(buffer);
  }

  // GET /contratos/:id/pdf — download do PDF nativo gerado pelo sistema.
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, nomeArquivo } = await this.contratosService.gerarPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(buffer);
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
