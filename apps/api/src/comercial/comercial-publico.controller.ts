// Controller público (sem autenticação) para captar leads do site Breakr.
// Equivale ao workflow n8n "[Site Breakr] Leads do Site":
//   site envia form → cria Lead + notifica equipe COMERCIAL via motor.
// Sem @UseGuards — qualquer origem pode chamar este endpoint.
// CORS: garantir que o domínio do site Breakr está em CORS_ORIGIN no deploy.
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { CriarLeadPublicoDto } from './dto/criar-lead-publico.dto';

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
}
