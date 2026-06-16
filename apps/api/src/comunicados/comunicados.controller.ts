import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ComunicadosService } from './comunicados.service';

@Controller('comunicados')
@UseGuards(JwtAuthGuard)
export class ComunicadosController {
  constructor(private readonly svc: ComunicadosService) {}

  @Get()
  listar() { return this.svc.listar(); }

  @Post()
  criar(@Body() body: { titulo: string; corpo: string; fixado?: boolean }, @Request() req: any) {
    return this.svc.criar({ ...body, autorId: req.user?.sub });
  }

  @Patch(':id/fixar')
  fixar(@Param('id') id: string, @Body() body: { fixado: boolean }) {
    return this.svc.alternarFixado(id, body.fixado);
  }

  @Delete(':id')
  remover(@Param('id') id: string) { return this.svc.remover(id); }
}
