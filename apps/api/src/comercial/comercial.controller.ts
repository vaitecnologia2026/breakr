// Controller do comercial — pipeline de vendas (CRM, M11).
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatusLead } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CargosGuard } from '../common/rbac/cargos.guard';
import { Cargos } from '../common/rbac/cargos.decorator';
import { Cargo } from '@breakr/shared';
import { ComercialService } from './comercial.service';
import { CriarLeadDto } from './dto/criar-lead.dto';
import { MoverStatusLeadDto } from './dto/mover-status-lead.dto';
import { AtribuirResponsavelLeadDto } from './dto/atribuir-responsavel-lead.dto';

@Controller('comercial/leads')
@UseGuards(JwtAuthGuard)
export class ComercialController {
  constructor(private readonly comercialService: ComercialService) {}

  // GET /comercial/leads — lista os leads (filtros opcionais por etapa e
  // responsavel; qualquer autenticado).
  @Get()
  listar(
    @Query('status') status?: StatusLead,
    @Query('responsavelId') responsavelId?: string,
  ) {
    return this.comercialService.listar({ status, responsavelId });
  }

  // GET /comercial/leads/:id — detalhe de um lead.
  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.obter(id);
  }

  // POST /comercial/leads — cria um lead (Comercial/CS/Admin/Superadmin).
  @Post()
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  criar(@Body() dto: CriarLeadDto) {
    return this.comercialService.criar(dto);
  }

  // PATCH /comercial/leads/:id/status — move o lead de etapa no pipeline.
  @Patch(':id/status')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  moverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoverStatusLeadDto,
  ) {
    return this.comercialService.moverStatus(id, dto.status);
  }

  // PATCH /comercial/leads/:id/responsavel — atribui um responsavel ao lead.
  @Patch(':id/responsavel')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  atribuirResponsavel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtribuirResponsavelLeadDto,
  ) {
    return this.comercialService.atribuirResponsavel(id, dto.responsavelId);
  }

  // POST /comercial/leads/:id/converter — converte o lead em cliente.
  @Post(':id/converter')
  @UseGuards(CargosGuard)
  @Cargos(Cargo.SUPERADMIN, Cargo.ADMIN, Cargo.COMERCIAL, Cargo.CS)
  converter(@Param('id', ParseUUIDPipe) id: string) {
    return this.comercialService.converter(id);
  }
}
