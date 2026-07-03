// Controller do painel do designer (B8). Todas as rotas exigem autenticação; o
// usuário atual (req.user.id) define de quem são as peças e as notas.
import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PainelDesignerService } from './painel-designer.service';
import { AtualizarNotasDto } from './dto/atualizar-notas.dto';

@Controller('painel-designer')
@UseGuards(JwtAuthGuard)
export class PainelDesignerController {
  constructor(private readonly painel: PainelDesignerService) {}

  @Get('minhas-pecas')
  minhasPecas(@Request() req: any) {
    return this.painel.minhasPecas(req.user?.id);
  }

  @Get('notas')
  obterNotas(@Request() req: any) {
    return this.painel.obterNotas(req.user?.id);
  }

  @Put('notas')
  atualizarNotas(@Body() dto: AtualizarNotasDto, @Request() req: any) {
    return this.painel.atualizarNotas(req.user?.id, dto);
  }
}
