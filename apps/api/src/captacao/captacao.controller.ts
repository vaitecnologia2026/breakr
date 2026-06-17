// Controller de captação de dados — PÚBLICO (sem JWT). O cliente acessa o
// formulário externo após o "sim" na reunião.
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CaptacaoService } from './captacao.service';
import { SubmeterCaptacaoDto } from './dto/submeter-captacao.dto';

@Controller('captacao')
export class CaptacaoController {
  constructor(private readonly captacao: CaptacaoService) {}

  // GET /captacao/planos — planos ativos para o formulário.
  @Get('planos')
  planos() {
    return this.captacao.planos();
  }

  // POST /captacao — submete o formulário (cria cliente + contrato em rascunho).
  @Post()
  submeter(@Body() dto: SubmeterCaptacaoDto) {
    return this.captacao.submeter(dto);
  }
}
