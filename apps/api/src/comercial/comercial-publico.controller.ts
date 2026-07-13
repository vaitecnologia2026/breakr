// Controller público (sem autenticação) para captar leads do site Breakr.
// Equivale ao workflow n8n "[Site Breakr] Leads do Site":
//   site envia form → cria Lead + notifica equipe COMERCIAL via motor.
// Sem @UseGuards — qualquer origem pode chamar este endpoint.
// CORS: garantir que o domínio do site Breakr está em CORS_ORIGIN no deploy.
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { CriarLeadPublicoDto } from './dto/criar-lead-publico.dto';
import { SalvarCadastroContratoDto } from './dto/salvar-cadastro-contrato.dto';

@Controller('comercial/publico')
export class ComercialPublicoController {
  constructor(private readonly comercialService: ComercialService) {}

  // POST /comercial/publico/lead
  // Sem autenticação — formulário do site. Retorna 201 com o lead criado.
  @Post('lead')
  @HttpCode(HttpStatus.CREATED)
  capturarLead(@Body() dto: CriarLeadPublicoDto) {
    return this.comercialService.capturarLeadPublico(dto);
  }

  // GET /comercial/publico/cadastro/:token — Cadastro Completo pelo link publico
  // (o cliente preenche no lugar do vendedor). Sem autenticação.
  @Get('cadastro/:token')
  obterCadastro(@Param('token') token: string) {
    return this.comercialService.obterCadastroPublico(token);
  }

  // PUT /comercial/publico/cadastro/:token — salva o Cadastro Completo pelo link.
  @Put('cadastro/:token')
  salvarCadastro(@Param('token') token: string, @Body() dto: SalvarCadastroContratoDto) {
    return this.comercialService.salvarCadastroPublico(token, dto);
  }
}
