// Endpoints da tela "Atividades" do CRM comercial (acesso via JWT do Breakr).
// Prefixo proprio "/comercial/atividades" — nao colide com "/comercial/leads".
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AtividadesComercialService } from './atividades-comercial.service';
import { CriarAtividadeDto } from './dto/criar-atividade.dto';
import { AtualizarAtividadeDto } from './dto/atualizar-atividade.dto';

@UseGuards(JwtAuthGuard)
@Controller('comercial/atividades')
export class AtividadesComercialController {
  constructor(private readonly svc: AtividadesComercialService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Post()
  criar(@Body() dto: CriarAtividadeDto) {
    return this.svc.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarAtividadeDto) {
    return this.svc.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.svc.excluir(id);
  }
}
