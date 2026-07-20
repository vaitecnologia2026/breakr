// Controller PÚBLICO da Página de Carreiras (sem login) — inspirado no InHire:
// candidatura sem criação de conta. Sem @UseGuards → rotas abertas, como o
// DiscPublicoController. Só expõe vagas abertas e recebe inscrições.
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RhService } from './rh.service';
import { CandidatarPublicoDto } from './dto/candidatar-publico.dto';

@Controller('carreiras')
export class CarreirasController {
  constructor(private readonly rhService: RhService) {}

  // GET /carreiras/vagas — lista as vagas abertas (público).
  @Get('vagas')
  vagas() {
    return this.rhService.vagasPublicas();
  }

  // GET /carreiras/vagas/:codigo — detalhe de uma vaga aberta (público).
  @Get('vagas/:codigo')
  vaga(@Param('codigo') codigo: string) {
    return this.rhService.vagaPublica(codigo);
  }

  // POST /carreiras/vagas/:codigo/candidatar — inscrição sem login (público).
  @Post('vagas/:codigo/candidatar')
  candidatar(@Param('codigo') codigo: string, @Body() dto: CandidatarPublicoDto) {
    return this.rhService.candidatarPublico(codigo, dto);
  }
}
