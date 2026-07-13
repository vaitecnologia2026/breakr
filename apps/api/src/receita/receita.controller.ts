// Endpoint de consulta de CNPJ (auto-preenchimento do Cadastro Completo).
// Protegido por JWT: qualquer usuario autenticado pode consultar.
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceitaService } from './receita.service';

@Controller('receita')
@UseGuards(JwtAuthGuard)
export class ReceitaController {
  constructor(private readonly receita: ReceitaService) {}

  @Get('cnpj/:cnpj')
  consultarCnpj(@Param('cnpj') cnpj: string) {
    return this.receita.consultarCnpj(cnpj);
  }
}
